"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";
import { generateWeeklyLore, generateSeasonClosingLore } from "@/lib/rivalry-lore";
import { awardGecX } from "./gecx.actions";
import {
  createBranchWarRoles,
  assignWarRole,
  assignWarRoleToMany,
  findWarChannelByName,
  upsertScoreboardMessage,
  postWarSystemMessage,
  archiveWarServer,
  renderBranchScoreboard,
} from "@/lib/war-server";
import { publishWarEvent } from "@/lib/war-events";
import { getActiveSeasonForWar } from "./season.actions";
import { recordBranchWarSeasonPoints } from "./season-points.actions";

export type RivalryWithDetails = Awaited<ReturnType<typeof getRivalryById>>;

async function requireRole(...roles: string[]) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (!roles.includes(role)) throw new Error("Unauthorized");
  return role;
}

async function getCallerStudent() {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");
  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) throw new Error("Only students can perform this action");
  return student;
}

function currentSeason(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const term = month < 4 ? "T1" : month < 8 ? "T2" : "T3";
  return `${year}-${term}`;
}

function normalizeScore(rawScore: number, classSize: number): number {
  if (classSize === 0) return 0;
  return parseFloat(((rawScore / classSize) * 100).toFixed(2));
}

export async function startCRElection(classId: number) {
  await requireRole("admin", "teacher");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { students: true },
  });
  if (!cls) throw new Error("Class not found");
  if (cls.students.length === 0) throw new Error("Class has no students");

  const season = currentSeason();

  const studentIds = cls.students.map((s) => s.id);
  await createNotificationsForUsers({
    title: "CR Election Started",
    message: `A Class Representative election has started for ${cls.name}. Ask your admin to view results.`,
    type: "CR_ELECTION_STARTED",
    entityId: String(classId),
    studentIds,
  });

  revalidatePath("/list/classes");
  return { classId, studentCount: cls.students.length, season };
}

export async function electClassRepresentative(classId: number, studentId: string) {
  await requireRole("admin");

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: { students: { where: { id: studentId } } },
  });
  if (!cls) throw new Error("Class not found");
  if (cls.students.length === 0) throw new Error("Student not in this class");

  const season = currentSeason();

  const cr = await prisma.classRepresentative.upsert({
    where: { classId },
    create: { classId, studentId, season, isActive: true },
    update: { studentId, season, electedAt: new Date(), isActive: true },
  });

  await createNotificationsForUsers({
    title: "You Have Been Elected CR!",
    message: `Congratulations! You are the Class Representative for ${cls.name} this season.`,
    type: "CR_ELECTED",
    entityId: String(classId),
    studentIds: [studentId],
  });

  revalidatePath("/list/classes");
  return cr;
}

export async function getCRForClass(classId: number) {
  return prisma.classRepresentative.findUnique({ where: { classId } });
}

export async function getMyClassCR() {
  const { userId } = auth();
  if (!userId) return null;

  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) return null;

  return prisma.classRepresentative.findUnique({ where: { classId: student.classId } });
}

export async function amITheCR() {
  const { userId } = auth();
  if (!userId) return false;
  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) return false;
  const cr = await prisma.classRepresentative.findUnique({ where: { classId: student.classId } });
  return cr?.studentId === userId && cr?.isActive === true;
}

export async function proposeRivalry(input: {
  classAId: number;
  classBId: number;
  proposalNote?: string;
}) {
  const student = await getCallerStudent();
  const { classAId, classBId, proposalNote } = input;

  if (classAId === classBId) throw new Error("Cannot rival your own class");

  if (student.classId !== classAId && student.classId !== classBId) {
    throw new Error("You can only propose a rivalry involving your own class");
  }

  const existing = await prisma.classRivalry.findFirst({
    where: {
      OR: [
        { classAId, classBId },
        { classAId: classBId, classBId: classAId },
      ],
      status: { in: ["PENDING_ADMIN", "PENDING_CR", "ACTIVE"] },
    },
  });
  if (existing) throw new Error("An active rivalry already exists between these classes");

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recentProposal = await prisma.classRivalry.findFirst({
    where: {
      proposerId: student.id,
      createdAt: { gte: oneMonthAgo },
    },
  });
  if (recentProposal) throw new Error("You can only propose one rivalry per month");

  const autoExpiresAt = new Date();
  autoExpiresAt.setDate(autoExpiresAt.getDate() + 7);

  const myClass = await prisma.class.findUnique({ where: { id: student.classId }, select: { collegeId: true } });
  const activeSeason = await getActiveSeasonForWar(myClass?.collegeId ?? null, "BRANCH");

  const rivalry = await prisma.classRivalry.create({
    data: {
      classAId,
      classBId,
      proposerId: student.id,
      proposalNote,
      season: currentSeason(),
      seasonId: activeSeason?.id ?? null,
      autoExpiresAt,
    },
  });

  const admins = await prisma.admin.findMany({ select: { id: true } });
  await createNotificationsForUsers({
    title: "New Rivalry Proposal",
    message: `A student has proposed a rivalry between classes. Review it in the rivalry panel.`,
    type: "RIVALRY_PROPOSED",
    entityId: rivalry.id,
    adminIds: admins.map((a) => a.id),
  });

  revalidatePath("/student/rivalry");
  return rivalry;
}

export async function adminApproveRivalry(rivalryId: string) {
  await requireRole("admin");
  const { userId } = auth();

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      classA: { include: { students: true } },
      classB: { include: { students: true } },
    },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "PENDING_ADMIN") throw new Error("Rivalry is not pending admin review");

  const [crA, crB] = await Promise.all([
    prisma.classRepresentative.findUnique({ where: { classId: rivalry.classAId } }),
    prisma.classRepresentative.findUnique({ where: { classId: rivalry.classBId } }),
  ]);

  const updated = await prisma.classRivalry.update({
    where: { id: rivalryId },
    data: {
      status: "PENDING_CR",
      adminId: userId!,
      adminReviewedAt: new Date(),
      crAId: crA?.studentId ?? null,
      crBId: crB?.studentId ?? null,
    },
  });

  const allStudentIds = [
    ...rivalry.classA.students.map((s) => s.id),
    ...rivalry.classB.students.map((s) => s.id),
  ];
  await createNotificationsForUsers({
    title: "A Rivalry Has Been Approved!",
    message: `Admin has approved the rivalry between ${rivalry.classA.name} and ${rivalry.classB.name}. Awaiting CR confirmation.`,
    type: "RIVALRY_ADMIN_APPROVED",
    entityId: rivalryId,
    studentIds: allStudentIds,
  });

  const crIds = [crA?.studentId, crB?.studentId].filter(Boolean) as string[];
  if (crIds.length > 0) {
    await createNotificationsForUsers({
      title: "Action Required — CR Approval Needed",
      message: `You are the Class Representative. The rivalry between ${rivalry.classA.name} and ${rivalry.classB.name} needs your approval to go ACTIVE.`,
      type: "RIVALRY_CR_NEEDED",
      entityId: rivalryId,
      studentIds: crIds,
    });
  }

  revalidatePath("/list/rivalries");
  return updated;
}

export async function adminRejectRivalry(rivalryId: string, reason?: string) {
  await requireRole("admin");

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: { classA: true, classB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  const updated = await prisma.classRivalry.update({
    where: { id: rivalryId },
    data: { status: "REJECTED" },
  });

  await createNotificationsForUsers({
    title: "Rivalry Proposal Rejected",
    message: `The rivalry between ${rivalry.classA.name} and ${rivalry.classB.name} was rejected by admin.${reason ? ` Reason: ${reason}` : ""}`,
    type: "RIVALRY_ADMIN_REJECTED",
    entityId: rivalryId,
    studentIds: [rivalry.proposerId],
  });

  revalidatePath("/list/rivalries");
  return updated;
}

export async function deleteRivalry(rivalryId: string) {
  await requireRole("admin");
  await prisma.classRivalry.delete({ where: { id: rivalryId } });
  revalidatePath("/list/rivalries");
  return { success: true };
}

export async function crApproveRivalry(rivalryId: string) {
  const student = await getCallerStudent();

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: { classA: { include: { students: true } }, classB: { include: { students: true } } },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "PENDING_CR") throw new Error("Rivalry is not pending CR approval");

  const [liveCrA, liveCrB] = await Promise.all([
    prisma.classRepresentative.findUnique({ where: { classId: rivalry.classAId } }),
    prisma.classRepresentative.findUnique({ where: { classId: rivalry.classBId } }),
  ]);

  const isLiveCrA = liveCrA?.studentId === student.id;
  const isLiveCrB = liveCrB?.studentId === student.id;
  const isStoredCrA = rivalry.crAId === student.id;
  const isStoredCrB = rivalry.crBId === student.id;
  const isCrA = isLiveCrA || isStoredCrA;
  const isCrB = isLiveCrB || isStoredCrB;
  if (!isCrA && !isCrB) throw new Error("You are not a Class Representative for this rivalry");

  const syncData: any = {};
  if (liveCrA && rivalry.crAId !== liveCrA.studentId) syncData.crAId = liveCrA.studentId;
  if (liveCrB && rivalry.crBId !== liveCrB.studentId) syncData.crBId = liveCrB.studentId;

  const updateData: any = { ...syncData };
  if (isCrA) updateData.crAApproved = true;
  if (isCrB) updateData.crBApproved = true;

  const newCrAApproved = isCrA ? true : rivalry.crAApproved;
  const newCrBApproved = isCrB ? true : rivalry.crBApproved;
  const willActivate = newCrAApproved && newCrBApproved;

  const { updated, activated } = await prisma.$transaction(async (tx) => {

    const fresh = await tx.classRivalry.findUnique({ where: { id: rivalryId } });
    if (!fresh) throw new Error("Rivalry not found");
    if (fresh.status !== "PENDING_CR") {

      return { updated: fresh, activated: false };
    }

    if (willActivate) {
      const built = await createBattlefieldServer(rivalry, {
        createdById: rivalry.adminId ?? "system",
        tx,
      });

      const crAUserId = liveCrA?.studentId ?? rivalry.crAId ?? null;
      const crBUserId = liveCrB?.studentId ?? rivalry.crBId ?? null;
      if (crAUserId) await assignWarRole(built.serverId, crAUserId, built.crARoleId, rivalry.adminId ?? null, tx);
      if (crBUserId) await assignWarRole(built.serverId, crBUserId, built.crBRoleId, rivalry.adminId ?? null, tx);
      await assignWarRoleToMany(
        built.serverId,
        rivalry.classA.students.map((s) => s.id),
        built.warriorARoleId,
        rivalry.adminId ?? null,
        tx
      );
      await assignWarRoleToMany(
        built.serverId,
        rivalry.classB.students.map((s) => s.id),
        built.warriorBRoleId,
        rivalry.adminId ?? null,
        tx
      );

      let scoreboardMessageId: string | null = null;
      if (built.scoreboardChannelId) {
        scoreboardMessageId = await upsertScoreboardMessage(
          built.scoreboardChannelId,
          renderBranchScoreboard({
            classAName: rivalry.classA.name,
            classBName: rivalry.classB.name,
            classAScore: 0,
            classBScore: 0,
            totalBouts: 0,
            status: "ACTIVE",
          }),
          null,
          tx
        );
      }
      if (built.loreChannelId) {
        await postWarSystemMessage({
          channelId: built.loreChannelId,
          content: `⚔️ **The war between ${rivalry.classA.name} and ${rivalry.classB.name} has begun.**\n\n_Every bout, every strike, every victory will be archived here._`,
          senderUsername: "Arena · Lore",
          db: tx,
        });
      }

      const u = await tx.classRivalry.update({
        where: { id: rivalryId },
        data: {
          ...updateData,
          status: "ACTIVE",
          battlefieldServerId: built.serverId,
          serverRoleCrAId: built.crARoleId,
          serverRoleCrBId: built.crBRoleId,
          serverRoleWarriorAId: built.warriorARoleId,
          serverRoleWarriorBId: built.warriorBRoleId,
          scoreboardChannelId: built.scoreboardChannelId,
          scoreboardMessageId,
          loreChannelId: built.loreChannelId,
          hallOfFameChannelId: built.hallOfFameChannelId,
        },
      });
      return { updated: u, activated: true };
    }

    const u = await tx.classRivalry.update({
      where: { id: rivalryId },
      data: { ...updateData, status: "PENDING_CR" },
    });
    return { updated: u, activated: false };
  });

  if (activated) {
    const allStudentIds = [
      ...rivalry.classA.students.map((s) => s.id),
      ...rivalry.classB.students.map((s) => s.id),
    ];
    await createNotificationsForUsers({
      title: "⚔️ The War Has Begun!",
      message: `The rivalry between ${rivalry.classA.name} and ${rivalry.classB.name} is now ACTIVE. Join the battlefield server!`,
      type: "RIVALRY_ACTIVE",
      entityId: rivalryId,
      studentIds: allStudentIds,
    });
  } else {
    const otherCrId = isCrA ? liveCrB?.studentId : liveCrA?.studentId;
    if (otherCrId) {
      await createNotificationsForUsers({
        title: "Waiting for Your Rival CR",
        message: `One CR has approved the rivalry. Now waiting for the other Class Representative to confirm.`,
        type: "RIVALRY_CR_NEEDED",
        entityId: rivalryId,
        studentIds: [otherCrId],
      });
    }
  }

  revalidatePath("/student/rivalry");
  revalidatePath(`/student/rivalry/${rivalryId}`);
  return updated;
}

async function createBattlefieldServer(
  rivalry: {
    id: string;
    classA: { name: string; students: { id: string; username: string; name: string; surname: string }[] };
    classB: { name: string; students: { id: string; username: string; name: string; surname: string }[] };
  },
  opts: { createdById: string; tx?: any } = { createdById: "system" }
): Promise<{
  serverId: string;
  scoreboardChannelId: string | null;
  loreChannelId: string | null;
  hallOfFameChannelId: string | null;
  crARoleId: string;
  crBRoleId: string;
  warriorARoleId: string;
  warriorBRoleId: string;
}> {
  function generateInviteCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  const db: any = opts.tx ?? prisma;

  const serverName = `⚔️ ${rivalry.classA.name} vs ${rivalry.classB.name}`;

  const server = await db.server.create({
    data: {
      name: serverName,
      description: `Official battlefield for the ${rivalry.classA.name} vs ${rivalry.classB.name} rivalry season.`,
      inviteCode: generateInviteCode(),
      createdById: opts.createdById,
      isDiscoverable: false,
    },
  });

  const generalCat  = await db.serverChannelCategory.create({ data: { serverId: server.id, name: "BATTLEFIELD", order: 0 } });
  const teamACat    = await db.serverChannelCategory.create({ data: { serverId: server.id, name: `${rivalry.classA.name} HQ`, order: 1 } });
  const teamBCat    = await db.serverChannelCategory.create({ data: { serverId: server.id, name: `${rivalry.classB.name} HQ`, order: 2 } });
  const archiveCat  = await db.serverChannelCategory.create({ data: { serverId: server.id, name: "ARCHIVES", order: 3 } });

  await db.serverChannel.createMany({
    data: [
      { serverId: server.id, categoryId: generalCat.id, name: "war-room", order: 0 },
      { serverId: server.id, categoryId: generalCat.id, name: "open-battlefield", order: 1 },
      { serverId: server.id, categoryId: generalCat.id, name: "scoreboard", order: 2 },
      { serverId: server.id, categoryId: teamACat.id, name: `${rivalry.classA.name.toLowerCase().replace(/\s/g, "-")}-strategy`, order: 0 },
      { serverId: server.id, categoryId: teamACat.id, name: `${rivalry.classA.name.toLowerCase().replace(/\s/g, "-")}-lounge`, order: 1 },
      { serverId: server.id, categoryId: teamBCat.id, name: `${rivalry.classB.name.toLowerCase().replace(/\s/g, "-")}-strategy`, order: 0 },
      { serverId: server.id, categoryId: teamBCat.id, name: `${rivalry.classB.name.toLowerCase().replace(/\s/g, "-")}-lounge`, order: 1 },
      { serverId: server.id, categoryId: archiveCat.id, name: "lore-archive", order: 0 },
      { serverId: server.id, categoryId: archiveCat.id, name: "hall-of-fame", order: 1 },
    ],
  });

  const allStudents = [...rivalry.classA.students, ...rivalry.classB.students];
  if (allStudents.length > 0) {
    await db.serverMember.createMany({
      data: allStudents.map((s) => ({
        serverId: server.id,
        userId: s.id,
        role: "MEMBER" as const,
        username: s.username,
        displayName: `${s.name} ${s.surname}`.trim(),
      })),
      skipDuplicates: true,
    });
  }

  const roles = await createBranchWarRoles(
    server.id,
    { name: rivalry.classA.name },
    { name: rivalry.classB.name },
    db
  );

  const [scoreboardCh, loreCh, hallCh] = await Promise.all([
    findWarChannelByName(server.id, "scoreboard", db),
    findWarChannelByName(server.id, "lore-archive", db),
    findWarChannelByName(server.id, "hall-of-fame", db),
  ]);

  return {
    serverId: server.id,
    scoreboardChannelId: scoreboardCh?.id ?? null,
    loreChannelId: loreCh?.id ?? null,
    hallOfFameChannelId: hallCh?.id ?? null,
    ...roles,
  };
}

export async function selectRivalrySide(rivalryId: string, classId: number) {
  const student = await getCallerStudent();

  const rivalry = await prisma.classRivalry.findUnique({ where: { id: rivalryId } });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Rivalry is not active");
  if (classId !== rivalry.classAId && classId !== rivalry.classBId) throw new Error("Invalid side");

  const existing = await prisma.rivalryMember.findUnique({
    where: { rivalryId_studentId: { rivalryId, studentId: student.id } },
  });
  if (existing) throw new Error("You have already joined a side and it is locked for the season");

  const member = await prisma.rivalryMember.create({
    data: { rivalryId, studentId: student.id, classId },
  });

  const warriorRoleId =
    classId === rivalry.classAId ? rivalry.serverRoleWarriorAId : rivalry.serverRoleWarriorBId;
  if (rivalry.battlefieldServerId && warriorRoleId) {
    await assignWarRole(rivalry.battlefieldServerId, student.id, warriorRoleId, rivalry.adminId ?? null);
  }

  revalidatePath(`/student/rivalry/${rivalryId}`);
  return member;
}

export async function recordBout(input: {
  rivalryId: string;
  title: string;
  description?: string;
  classAPoints: number;
  classBPoints: number;
  warTypeId?: string | null;
  teacherId?: string | null;
  perWarriorPoints?: Array<{ studentId: string; points: number }>;
}) {
  await requireRole("admin", "teacher");
  const {
    rivalryId,
    title,
    description,
    classAPoints,
    classBPoints,
    warTypeId,
    teacherId,
    perWarriorPoints,
  } = input;

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      bouts: true,
      classA: { include: { students: true } },
      classB: { include: { students: true } },
      members: true,
    },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Rivalry is not active");

  const round = rivalry.bouts.length + 1;
  const winnerId =
    classAPoints > classBPoints
      ? rivalry.classAId
      : classBPoints > classAPoints
      ? rivalry.classBId
      : null;

  const contribMap = new Map<string, number>();
  if (perWarriorPoints && perWarriorPoints.length > 0) {
    for (const p of perWarriorPoints) {
      if (!p.studentId || !Number.isFinite(p.points)) continue;
      contribMap.set(p.studentId, (contribMap.get(p.studentId) ?? 0) + p.points);
    }
  } else {
    const aMembers = rivalry.members.filter((m) => m.classId === rivalry.classAId && m.isActive);
    const bMembers = rivalry.members.filter((m) => m.classId === rivalry.classBId && m.isActive);
    if (classAPoints > 0 && aMembers.length > 0) {
      const each = classAPoints / aMembers.length;
      for (const m of aMembers) contribMap.set(m.studentId, each);
    }
    if (classBPoints > 0 && bMembers.length > 0) {
      const each = classBPoints / bMembers.length;
      for (const m of bMembers) contribMap.set(m.studentId, each);
    }
  }

  let mvpStudentId: string | null = null;
  let mvpPoints = 0;
  for (const [sid, pts] of contribMap.entries()) {
    if (pts > mvpPoints) {
      mvpPoints = pts;
      mvpStudentId = sid;
    }
  }

  const newClassAScore = rivalry.classAScore + classAPoints;
  const newClassBScore = rivalry.classBScore + classBPoints;
  const weekNumber = round;
  const { title: loreTitle, narrative } = generateWeeklyLore({
    classAName: rivalry.classA.name,
    classBName: rivalry.classB.name,
    weekNumber,
    classAScore: newClassAScore,
    classBScore: newClassBScore,
    boutTitle: title,
    boutWinnerName:
      winnerId === rivalry.classAId
        ? rivalry.classA.name
        : winnerId === rivalry.classBId
        ? rivalry.classB.name
        : undefined,
    totalBouts: round,
  });

  const { bout } = await prisma.$transaction(async (tx) => {

    const fresh = await tx.classRivalry.findUnique({ where: { id: rivalryId }, select: { status: true } });
    if (!fresh || fresh.status !== "ACTIVE") throw new Error("Rivalry is no longer active");

    const bout = await tx.rivalryBout.create({
      data: {
        rivalryId,
        round,
        title,
        description,
        classAPoints,
        classBPoints,
        winnerId,
        warTypeId: warTypeId ?? null,
        teacherId: teacherId ?? null,
        teacherStatus: teacherId ? "NOMINATED" : null,
        status: "COMPLETED",
        endTime: new Date(),
        mvpStudentId,
      },
    });

    await tx.classRivalry.update({
      where: { id: rivalryId },
      data: { classAScore: newClassAScore, classBScore: newClassBScore },
    });

    for (const [studentId, pts] of contribMap.entries()) {
      await tx.rivalryMember.updateMany({
        where: { rivalryId, studentId },
        data: {
          pointsContributed: { increment: pts },
          boutsParticipated: { increment: 1 },
          boutsWon: pts > 0 && (
            (winnerId === rivalry.classAId && rivalry.classA.students.some((s) => s.id === studentId)) ||
            (winnerId === rivalry.classBId && rivalry.classB.students.some((s) => s.id === studentId))
          ) ? { increment: 1 } : undefined,
        },
      });
    }

    await tx.rivalryLore.create({
      data: { rivalryId, weekNumber, title: loreTitle, narrative },
    });

    return { bout };
  });

  if (rivalry.scoreboardChannelId) {
    try {
      const newMessageId = await upsertScoreboardMessage(
        rivalry.scoreboardChannelId,
        renderBranchScoreboard({
          classAName: rivalry.classA.name,
          classBName: rivalry.classB.name,
          classAScore: newClassAScore,
          classBScore: newClassBScore,
          totalBouts: round,
          status: "ACTIVE",
        }),
        rivalry.scoreboardMessageId,
      );
      if (newMessageId !== rivalry.scoreboardMessageId) {
        await prisma.classRivalry.update({
          where: { id: rivalryId },
          data: { scoreboardMessageId: newMessageId },
        });
      }

      await postWarSystemMessage({
        channelId: rivalry.scoreboardChannelId,
        content:
          `📊 **Bout ${round} — ${title}**\n` +
          `${rivalry.classA.name}: **+${classAPoints}**  ·  ${rivalry.classB.name}: **+${classBPoints}**\n` +
          (winnerId === rivalry.classAId
            ? `🏆 Round goes to **${rivalry.classA.name}**.`
            : winnerId === rivalry.classBId
            ? `🏆 Round goes to **${rivalry.classB.name}**.`
            : `⚖️ Round drawn.`),
      });
    } catch (err) {
      console.error("[recordBout] scoreboard update failed:", err);
    }
  }
  if (rivalry.loreChannelId) {
    try {
      await postWarSystemMessage({
        channelId: rivalry.loreChannelId,
        content: `📜 **${loreTitle}**\n\n${narrative}`,
        senderUsername: "Arena · Lore",
      });
    } catch (err) {
      console.error("[recordBout] lore post failed:", err);
    }
  }
  await publishWarEvent("branch", {
    type: "war:bout",
    rivalryId,
    boutId: bout.id,
    round,
    title,
    classAPoints,
    classBPoints,
    winnerId,
    mvpStudentId,
  });
  await publishWarEvent("branch", {
    type: "war:score",
    rivalryId,
    classAScore: newClassAScore,
    classBScore: newClassBScore,
  });
  await publishWarEvent("branch", {
    type: "war:lore",
    rivalryId,
    weekNumber,
    title: loreTitle,
  });

  revalidatePath(`/student/rivalry/${rivalryId}`);
  revalidatePath(`/list/rivalries`);
  return bout;
}

const RP_TO_KARMA = 25;
const RP_TO_GECX  = 1;

export async function convertRivalryPoints(rivalryId: string, rivalryPoints: number) {
  const student = await getCallerStudent();
  if (rivalryPoints <= 0 || rivalryPoints % 100 !== 0)
    throw new Error("You can only convert in multiples of 100 Rivalry Points");

  const karmaEarned = rivalryPoints * RP_TO_KARMA;
  const gecxEarned  = rivalryPoints * RP_TO_GECX;

  await prisma.$transaction(async (tx) => {
    const member = await tx.rivalryMember.findUnique({
      where: { rivalryId_studentId: { rivalryId, studentId: student.id } },
    });
    if (!member) throw new Error("You are not a member of this rivalry");
    if (member.pointsContributed < rivalryPoints)
      throw new Error(`Insufficient Rivalry Points (have ${Math.floor(member.pointsContributed)}, need ${rivalryPoints})`);

    await tx.rivalryMember.update({
      where: { rivalryId_studentId: { rivalryId, studentId: student.id } },
      data: { pointsContributed: { decrement: rivalryPoints } },
    });

    const profile = await tx.userCommunityProfile.findUnique({ where: { userId: student.id } });
    if (profile) {
      await tx.userCommunityProfile.update({
        where: { userId: student.id },
        data: { karmaPoints: { increment: karmaEarned } },
      });
    }
  });

  await awardGecX({
    userId: student.id,
    userType: "student",
    amount: gecxEarned,
    type: "rivalry_conversion",
    description: `Converted ${rivalryPoints} RP → ${gecxEarned} GECX`,
    relatedId: rivalryId,
  });

  revalidatePath(`/student/rivalry/${rivalryId}`);
  return { karmaEarned, gecxEarned, rpSpent: rivalryPoints };
}

export async function issueStrike(rivalryId: string, studentId: string, reason: string) {
  await requireRole("admin", "teacher");

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: { classA: true, classB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  const strikes = await prisma.rivalryStrike.findMany({
    where: { rivalryId, studentId },
  });

  const mutedUntil = new Date();
  mutedUntil.setHours(mutedUntil.getHours() + 48);

  const strike = await prisma.rivalryStrike.create({
    data: { rivalryId, studentId, reason, mutedUntil },
  });

  await createNotificationsForUsers({
    title: "⚠️ Rivalry Strike Issued",
    message: `You received a strike in the ${rivalry.classA.name} vs ${rivalry.classB.name} rivalry. Reason: ${reason}. You are muted from cross-class channels for 48 hours.`,
    type: "RIVALRY_STRIKE_ISSUED",
    entityId: rivalryId,
    studentIds: [studentId],
  });

  if (strikes.length + 1 >= 3) {
    await prisma.$transaction(async (tx) => {
      const member = await tx.rivalryMember.findUnique({
        where: { rivalryId_studentId: { rivalryId, studentId } },
      });
      if (!member) return;
      const fresh = await tx.classRivalry.findUnique({
        where: { id: rivalryId },
        select: { classAScore: true, classBScore: true },
      });
      if (!fresh) return;
      const isClassA = member.classId === rivalry.classAId;
      if (isClassA) {
        await tx.classRivalry.update({
          where: { id: rivalryId },
          data: { classAScore: Math.max(0, fresh.classAScore - 50) },
        });
      } else {
        await tx.classRivalry.update({
          where: { id: rivalryId },
          data: { classBScore: Math.max(0, fresh.classBScore - 50) },
        });
      }
    });
  }

  await publishWarEvent("branch", {
    type: "war:strike",
    rivalryId,
    studentId,
    reason,
    mutedUntil: mutedUntil.toISOString(),
  });

  revalidatePath(`/list/rivalries`);
  return { strike, strikeCount: strikes.length + 1 };
}

export async function concludeRivalry(rivalryId: string) {
  await requireRole("admin");

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      classA: { include: { students: true } },
      classB: { include: { students: true } },
      bouts: true,
      members: true,
    },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Rivalry is not active");

  const sizeA = rivalry.classA.students.length;
  const sizeB = rivalry.classB.students.length;
  const normalizedA = normalizeScore(rivalry.classAScore, sizeA);
  const normalizedB = normalizeScore(rivalry.classBScore, sizeB);

  const winnerClassId =
    normalizedA > normalizedB ? rivalry.classAId :
    normalizedB > normalizedA ? rivalry.classBId : null;

  const winnerName = winnerClassId === rivalry.classAId ? rivalry.classA.name :
    winnerClassId === rivalry.classBId ? rivalry.classB.name : undefined;

  const topInClass = (cid: number) =>
    rivalry.members
      .filter((m) => m.classId === cid)
      .sort((a, b) => b.pointsContributed - a.pointsContributed)[0];
  const mvpA = topInClass(rivalry.classAId);
  const mvpB = topInClass(rivalry.classBId);
  const mvpStudentIds = [mvpA?.studentId, mvpB?.studentId].filter(Boolean) as string[];

  const { title: loreTitle, narrative } = generateSeasonClosingLore({
    classAName: rivalry.classA.name,
    classBName: rivalry.classB.name,
    weekNumber: rivalry.bouts.length,
    classAScore: normalizedA,
    classBScore: normalizedB,
    totalBouts: rivalry.bouts.length,
    winnerName,
  });

  const { updated, didConclude } = await prisma.$transaction(async (tx) => {
    const fresh = await tx.classRivalry.findUnique({ where: { id: rivalryId } });
    if (!fresh || fresh.status !== "ACTIVE") {
      return { updated: fresh, didConclude: false };
    }

    await tx.rivalryLore.create({
      data: { rivalryId, weekNumber: 999, title: loreTitle, narrative },
    });

    const u = await tx.classRivalry.update({
      where: { id: rivalryId },
      data: { status: "CONCLUDED", winnerClassId, concludedAt: new Date() },
    });

    if (winnerClassId) {
      await tx.rivalryMember.updateMany({
        where: { rivalryId, classId: winnerClassId },
        data: { pointsContributed: { increment: 200 } },
      });
    }
    if (mvpStudentIds.length > 0) {
      await tx.rivalryMember.updateMany({
        where: { rivalryId, studentId: { in: mvpStudentIds } },
        data: { isMvp: true },
      });
    }

    return { updated: u, didConclude: true };
  });

  if (!didConclude) return updated;

  if (updated?.seasonId && !updated.seasonPointsDistributed) {
    try {
      await recordBranchWarSeasonPoints(rivalryId, updated.seasonId);
    } catch (err) {
      console.error("[concludeRivalry] season point recording failed:", err);
    }
  }

  const allStudentIds = [
    ...rivalry.classA.students.map((s) => s.id),
    ...rivalry.classB.students.map((s) => s.id),
  ];
  await createNotificationsForUsers({
    title: "⚔️ Rivalry Concluded!",
    message: `The rivalry has ended! ${winnerName ? `${winnerName} wins!` : "It's a draw!"} Check the archive for the full story.`,
    type: "RIVALRY_CONCLUDED",
    entityId: rivalryId,
    studentIds: allStudentIds,
  });

  if (rivalry.scoreboardChannelId) {
    try {
      const newMessageId = await upsertScoreboardMessage(
        rivalry.scoreboardChannelId,
        renderBranchScoreboard({
          classAName: rivalry.classA.name,
          classBName: rivalry.classB.name,
          classAScore: rivalry.classAScore,
          classBScore: rivalry.classBScore,
          totalBouts: rivalry.bouts.length,
          status: "CONCLUDED",
          winnerName: winnerName ?? null,
        }),
        rivalry.scoreboardMessageId,
      );
      if (newMessageId !== rivalry.scoreboardMessageId) {
        await prisma.classRivalry.update({
          where: { id: rivalryId },
          data: { scoreboardMessageId: newMessageId },
        });
      }
    } catch (err) {
      console.error("[concludeRivalry] final scoreboard update failed:", err);
    }
  }
  if (rivalry.battlefieldServerId) {
    const archiveSummary =
      `🏆 **${winnerName ?? "Draw"}**\n\n` +
      `**${rivalry.classA.name}**: ${rivalry.classAScore.toFixed(0)} pts (normalized ${normalizedA.toFixed(2)})\n` +
      `**${rivalry.classB.name}**: ${rivalry.classBScore.toFixed(0)} pts (normalized ${normalizedB.toFixed(2)})\n` +
      `Bouts: ${rivalry.bouts.length}\n\n` +
      (mvpA ? `🎯 MVP · ${rivalry.classA.name}: <@${mvpA.studentId}> (${mvpA.pointsContributed.toFixed(0)} RP)\n` : "") +
      (mvpB ? `🎯 MVP · ${rivalry.classB.name}: <@${mvpB.studentId}> (${mvpB.pointsContributed.toFixed(0)} RP)\n` : "") +
      `\n_${loreTitle}_`;
    try {
      await archiveWarServer(rivalry.battlefieldServerId, {
        finalName: `[Concluded] ⚔️ ${rivalry.classA.name} vs ${rivalry.classB.name}`,
        archiveChannelId: rivalry.hallOfFameChannelId,
        summaryContent: archiveSummary,
      });
      await prisma.classRivalry.update({
        where: { id: rivalryId },
        data: { isArchived: true },
      });
    } catch (err) {
      console.error("[concludeRivalry] archive failed:", err);
    }
  }

  await publishWarEvent("branch", {
    type: "war:score",
    rivalryId,
    classAScore: rivalry.classAScore,
    classBScore: rivalry.classBScore,
  });
  await publishWarEvent("branch", {
    type: "war:concluded",
    rivalryId,
    winnerId: winnerClassId,
  });
  await publishWarEvent("branch", {
    type: "war:archived",
    rivalryId,
    battlefieldServerId: rivalry.battlefieldServerId ?? null,
  });

  revalidatePath("/list/rivalries");
  revalidatePath(`/student/rivalry/${rivalryId}`);
  return updated;
}

export async function expireStaleRivalries() {
  await requireRole("admin");

  const now = new Date();
  const stale = await prisma.classRivalry.findMany({
    where: {
      status: "PENDING_ADMIN",
      autoExpiresAt: { lt: now },
    },
    include: { classA: true, classB: true },
  });

  let expiredCount = 0;
  for (const rivalry of stale) {
    const didExpire = await prisma.$transaction(async (tx) => {
      const fresh = await tx.classRivalry.findUnique({ where: { id: rivalry.id } });
      if (!fresh || fresh.status !== "PENDING_ADMIN") return false;
      await tx.classRivalry.update({ where: { id: rivalry.id }, data: { status: "EXPIRED" } });
      return true;
    });
    if (didExpire) {
      expiredCount += 1;
      await createNotificationsForUsers({
        title: "Rivalry Proposal Expired",
        message: `Your rivalry proposal between ${rivalry.classA.name} and ${rivalry.classB.name} expired without admin review. You may re-propose next month.`,
        type: "RIVALRY_ADMIN_REJECTED",
        entityId: rivalry.id,
        studentIds: [rivalry.proposerId],
      });
    }
  }

  return { expired: expiredCount };
}

export async function drawRivalryParticipants(rivalryId: string, count: number = 5) {

  await requireRole("admin", "teacher");

  function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  const { drawnA, drawnB } = await prisma.$transaction(async (tx) => {
    const rivalry = await tx.classRivalry.findUnique({
      where: { id: rivalryId },
      include: {
        classA: { include: { students: true } },
        classB: { include: { students: true } },
      },
    });
    if (!rivalry) throw new Error("Rivalry not found");
    if (rivalry.status !== "ACTIVE") throw new Error("Rivalry must be active to draw participants");

    const already = await tx.rivalryMember.findMany({ where: { rivalryId } });
    const alreadyIds = new Set(already.map((m: any) => m.studentId));

    const eligibleA = rivalry.classA.students.filter((s: any) => !alreadyIds.has(s.id));
    const eligibleB = rivalry.classB.students.filter((s: any) => !alreadyIds.has(s.id));

    if (eligibleA.length === 0 && eligibleB.length === 0) {
      throw new Error("No eligible warriors left in either class. All students are already in the roster.");
    }
    if (eligibleA.length === 0) {
      throw new Error(`${rivalry.classA.name} has no eligible warriors left. All students are already in the roster.`);
    }
    if (eligibleB.length === 0) {
      throw new Error(`${rivalry.classB.name} has no eligible warriors left. All students are already in the roster.`);
    }

    const drawnA = shuffle(eligibleA).slice(0, count);
    const drawnB = shuffle(eligibleB).slice(0, count);

    const toCreate = [
      ...drawnA.map((s: any) => ({ rivalryId, studentId: s.id, classId: rivalry.classAId })),
      ...drawnB.map((s: any) => ({ rivalryId, studentId: s.id, classId: rivalry.classBId })),
    ];
    if (toCreate.length > 0) {
      await tx.rivalryMember.createMany({ data: toCreate, skipDuplicates: true });
    }
    return { drawnA, drawnB };
  });

  const fresh = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    select: {
      battlefieldServerId: true,
      adminId: true,
      serverRoleWarriorAId: true,
      serverRoleWarriorBId: true,
    },
  });
  if (fresh?.battlefieldServerId) {
    if (fresh.serverRoleWarriorAId && drawnA.length > 0) {
      await assignWarRoleToMany(
        fresh.battlefieldServerId,
        drawnA.map((s: any) => s.id),
        fresh.serverRoleWarriorAId,
        fresh.adminId ?? null
      );
    }
    if (fresh.serverRoleWarriorBId && drawnB.length > 0) {
      await assignWarRoleToMany(
        fresh.battlefieldServerId,
        drawnB.map((s: any) => s.id),
        fresh.serverRoleWarriorBId,
        fresh.adminId ?? null
      );
    }
  }

  revalidatePath(`/student/rivalry/${rivalryId}`);
  return {
    classA: drawnA.map((s: any) => ({ id: s.id, name: `${s.name} ${s.surname}`, username: s.username })),
    classB: drawnB.map((s: any) => ({ id: s.id, name: `${s.name} ${s.surname}`, username: s.username })),
  };
}

export async function getEligibleWarriors(rivalryId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");
  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) throw new Error("Student not found");

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: { classA: { include: { students: true } }, classB: { include: { students: true } } },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  const myClassId = student.classId;
  const isClassA = rivalry.classAId === myClassId;
  const isClassB = rivalry.classBId === myClassId;
  if (!isClassA && !isClassB) throw new Error("You are not in this rivalry");

  const classStudents = isClassA ? rivalry.classA.students : rivalry.classB.students;
  const already = await prisma.rivalryMember.findMany({ where: { rivalryId, classId: myClassId } });
  const memberMap = new Map(already.map((m) => [m.studentId, m.id]));

  const warriors = classStudents.map((s) => ({
    id: s.id,
    name: `${s.name} ${s.surname}`,
    username: s.username,
    isEnrolled: memberMap.has(s.id),
    memberId: memberMap.get(s.id) ?? null,
  }));

  return {
    warriors,
    totalInClass: classStudents.length,
    alreadyEnrolled: already.length,
  };
}

export async function removeRivalryMembers(rivalryId: string, memberIds: string[]) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");
  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) throw new Error("Student not found");

  const cr = await prisma.classRepresentative.findUnique({ where: { classId: student.classId } });
  const isCr = cr?.studentId === userId;
  if (!isCr) throw new Error("Only the Class Representative can remove warriors");

  const rivalry = await prisma.classRivalry.findUnique({ where: { id: rivalryId } });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Rivalry must be active");

  const myClassId = student.classId;
  if (myClassId !== rivalry.classAId && myClassId !== rivalry.classBId) {
    throw new Error("You are not in this rivalry");
  }

  await prisma.rivalryMember.deleteMany({
    where: {
      id: { in: memberIds },
      rivalryId,
      classId: myClassId,
    },
  });

  revalidatePath(`/student/rivalry/${rivalryId}`);
  return { ok: true };
}

export async function selectRivalryParticipants(rivalryId: string, selectedIds: string[]) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");
  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) throw new Error("Student not found");

  const cr = await prisma.classRepresentative.findUnique({ where: { classId: student.classId } });
  const isCr = cr?.studentId === userId;
  if (!isCr) throw new Error("Only the Class Representative can select warriors");

  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: { classA: { include: { students: true } }, classB: { include: { students: true } } },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Rivalry must be active");

  const myClassId = student.classId;
  const isClassA = rivalry.classAId === myClassId;
  const isClassB = rivalry.classBId === myClassId;
  if (!isClassA && !isClassB) throw new Error("You are not in this rivalry");

  const classStudents = isClassA ? rivalry.classA.students : rivalry.classB.students;
  const classStudentIds = new Set(classStudents.map((s) => s.id));
  for (const id of selectedIds) {
    if (!classStudentIds.has(id)) throw new Error("Selected student does not belong to your class");
  }

  if (selectedIds.length === 0) throw new Error("Select at least one warrior");

  await prisma.rivalryMember.createMany({
    data: selectedIds.map((studentId) => ({
      rivalryId,
      studentId,
      classId: myClassId,
    })),
    skipDuplicates: true,
  });

  revalidatePath(`/student/rivalry/${rivalryId}`);
  return { ok: true };
}

export async function getRivalryById(rivalryId: string) {
  return prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      classA: { include: { students: true } },
      classB: { include: { students: true } },
      bouts: { orderBy: { conductedAt: "asc" } },
      members: {
        include: {
          student: { select: { name: true, surname: true, username: true } },
        },
      },
      strikes: { orderBy: { issuedAt: "desc" } },
      loreEntries: { orderBy: { weekNumber: "asc" } },
    },
  });
}

export async function getMyRivalry() {
  const { userId } = auth();
  if (!userId) return null;

  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) return null;

  return prisma.classRivalry.findFirst({
    where: {
      OR: [{ classAId: student.classId }, { classBId: student.classId }],
      status: { in: ["PENDING_ADMIN", "PENDING_CR", "ACTIVE", "CONCLUDED"] },
    },
    include: {
      classA: true,
      classB: true,
      bouts: { orderBy: { conductedAt: "desc" }, take: 5 },
      loreEntries: { orderBy: { weekNumber: "desc" }, take: 1 },
      members: { where: { studentId: userId } },
    },
  });
}

export async function getAllRivalries(status?: string) {
  return prisma.classRivalry.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      classA: true,
      classB: true,
      bouts: true,
      members: true,
      seasonRef: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyRivalryMembership(rivalryId: string) {
  const { userId } = auth();
  if (!userId) return null;
  return prisma.rivalryMember.findUnique({
    where: { rivalryId_studentId: { rivalryId, studentId: userId } },
  });
}

export async function getScoreboard(rivalryId: string) {
  const rivalry = await prisma.classRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      classA: { include: { students: true } },
      classB: { include: { students: true } },
      bouts: { orderBy: { conductedAt: "asc" } },
      members: true,
    },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  const sizeA = rivalry.classA.students.length;
  const sizeB = rivalry.classB.students.length;

  return {
    classA: {
      id: rivalry.classAId,
      name: rivalry.classA.name,
      rawScore: rivalry.classAScore,
      normalizedScore: normalizeScore(rivalry.classAScore, sizeA),
      size: sizeA,
    },
    classB: {
      id: rivalry.classBId,
      name: rivalry.classB.name,
      rawScore: rivalry.classBScore,
      normalizedScore: normalizeScore(rivalry.classBScore, sizeB),
      size: sizeB,
    },
    bouts: rivalry.bouts,
    totalBouts: rivalry.bouts.length,
    status: rivalry.status,
    winnerClassId: rivalry.winnerClassId,
  };
}

export async function getClassesForRivalryProposal() {
  const { userId } = auth();
  if (!userId) return [];

  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) return [];

  return prisma.class.findMany({
    where: { id: { not: student.classId } },
    select: {
      id: true,
      name: true,
      capacity: true,
      branchCode: true,
      grade: { select: { level: true } },
      college: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: { name: "asc" },
  });
}
