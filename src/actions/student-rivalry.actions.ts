"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";
import { generateWeeklyLore, generateSeasonClosingLore } from "@/lib/student-rivalry-lore";
import { awardGecX } from "./gecx.actions";
import { settleRivalryBets } from "./spectator-betting.actions";
import {
  createStudentWarRoles,
  assignWarRole,
  findWarChannelByName,
  upsertScoreboardMessage,
  postWarSystemMessage,
  archiveWarServer,
  renderStudentScoreboard,
} from "@/lib/war-server";
import { publishWarEvent } from "@/lib/war-events";
import { getActiveSeasonForWar } from "./season.actions";
import { recordStudentWarSeasonPoints } from "./season-points.actions";

export type StudentRivalryWithDetails = Awaited<ReturnType<typeof getStudentRivalryById>>;

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

export async function proposeStudentRivalry(input: {
  studentBId: string;
  proposalNote?: string;
  warTypeId?: string | null;
  teacherId?: string | null;
  isAutoRandom?: boolean;
}) {
  const student = await getCallerStudent();
  const { studentBId, proposalNote, warTypeId, teacherId, isAutoRandom } = input;

  if (student.id === studentBId) throw new Error("Cannot declare war on yourself");

  const target = await prisma.student.findUnique({ where: { id: studentBId } });
  if (!target) throw new Error("Target student not found");

  const existing = await prisma.studentRivalry.findFirst({
    where: {
      OR: [
        { studentAId: student.id, studentBId },
        { studentAId: studentBId, studentBId: student.id },
      ],
      status: { in: ["PENDING_ADMIN", "PENDING_CR", "ACTIVE"] },
    },
  });
  if (existing) throw new Error("An active rivalry already exists between you and this student");

  const autoExpiresAt = new Date();
  autoExpiresAt.setDate(autoExpiresAt.getDate() + 7);

  const myClass = await prisma.class.findUnique({ where: { id: student.classId }, select: { collegeId: true } });
  const activeSeason = await getActiveSeasonForWar(myClass?.collegeId ?? null, "STUDENT");

  let resolvedWarTypeId: string | null = warTypeId ?? null;
  if (isAutoRandom) {
    const allTypes = await prisma.warType.findMany({
      where: { isAvailableForStudentWar: true },
    });
    if (allTypes.length > 0) {
      resolvedWarTypeId = allTypes[Math.floor(Math.random() * allTypes.length)].id;
    }
  }

  const rivalry = await prisma.studentRivalry.create({
    data: {
      studentAId: student.id,
      studentBId,
      proposerId: student.id,
      proposalNote,
      season: currentSeason(),
      seasonId: activeSeason?.id ?? null,
      autoExpiresAt,
      pendingWarTypeId: resolvedWarTypeId,
      pendingTeacherId: teacherId ?? null,
      pendingIsAutoRandom: !!isAutoRandom,
    },
  });

  const admins = await prisma.admin.findMany({ select: { id: true } });
  await createNotificationsForUsers({
    title: "New Student War Proposal",
    message: `${student.name} ${student.surname} has challenged ${target.name} ${target.surname} to a 1v1 duel.`,
    type: "STUDENT_WAR_PROPOSED",
    entityId: rivalry.id,
    adminIds: admins.map((a) => a.id),
  });

  await createNotificationsForUsers({
    title: "You've Been Challenged!",
    message: `${student.name} ${student.surname} has declared war on you. Waiting for admin approval.`,
    type: "STUDENT_WAR_PROPOSED",
    entityId: rivalry.id,
    studentIds: [studentBId],
  });

  revalidatePath("/student/wars");
  return rivalry;
}

export async function adminApproveStudentRivalry(rivalryId: string) {
  await requireRole("admin");
  const { userId } = auth();

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "PENDING_ADMIN") throw new Error("Rivalry is not pending admin review");

  const updated = await prisma.studentRivalry.update({
    where: { id: rivalryId },
    data: {
      status: "PENDING_CR",
      adminId: userId!,
      adminReviewedAt: new Date(),
    },
  });

  await createNotificationsForUsers({
    title: "War Approved by Admin",
    message: `Admin approved the duel between ${rivalry.studentA.name} and ${rivalry.studentB.name}. ${rivalry.studentB.name}, accept to begin!`,
    type: "STUDENT_WAR_ADMIN_APPROVED",
    entityId: rivalryId,
    studentIds: [rivalry.studentAId, rivalry.studentBId],
  });

  revalidatePath("/list/wars");
  revalidatePath("/student/wars");
  return updated;
}

export async function adminRejectStudentRivalry(rivalryId: string, reason?: string) {
  await requireRole("admin");

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  const updated = await prisma.studentRivalry.update({
    where: { id: rivalryId },
    data: { status: "REJECTED" },
  });

  await createNotificationsForUsers({
    title: "War Proposal Rejected",
    message: `Your duel proposal against ${rivalry.studentB.name} was rejected.${reason ? ` Reason: ${reason}` : ""}`,
    type: "STUDENT_WAR_REJECTED",
    entityId: rivalryId,
    studentIds: [rivalry.proposerId],
  });

  revalidatePath("/list/wars");
  return updated;
}

export async function deleteStudentRivalry(rivalryId: string) {
  await requireRole("admin");
  await prisma.studentRivalry.delete({ where: { id: rivalryId } });
  revalidatePath("/list/wars");
  return { success: true };
}

export async function targetAcceptStudentRivalry(rivalryId: string) {
  const student = await getCallerStudent();

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "PENDING_CR") throw new Error("Rivalry is not pending acceptance");
  if (rivalry.studentBId !== student.id) throw new Error("Only the challenged student can accept");

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.studentRivalry.findUnique({ where: { id: rivalryId } });
    if (!fresh || fresh.status !== "PENDING_CR") {
      throw new Error("Rivalry is not pending acceptance");
    }

    const built = await createDuelServer(rivalry, {
      createdById: rivalry.adminId ?? "system",
      tx,
    });

    await assignWarRole(built.serverId, rivalry.studentAId, built.warriorRoleId, rivalry.adminId ?? null, tx);
    await assignWarRole(built.serverId, rivalry.studentBId, built.warriorRoleId, rivalry.adminId ?? null, tx);

    let scoreboardMessageId: string | null = null;
    if (built.scoreboardChannelId) {
      scoreboardMessageId = await upsertScoreboardMessage(
        built.scoreboardChannelId,
        renderStudentScoreboard({
          studentAName: `${rivalry.studentA.name} ${rivalry.studentA.surname}`,
          studentBName: `${rivalry.studentB.name} ${rivalry.studentB.surname}`,
          studentAScore: 0,
          studentBScore: 0,
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
        content: `⚔️ **The duel between ${rivalry.studentA.name} and ${rivalry.studentB.name} has begun.**\n\n_Every round will be archived here._`,
        senderUsername: "Arena · Lore",
        db: tx,
      });
    }

    let warTypeId = fresh.pendingWarTypeId;
    if (!warTypeId) {
      const ksType = await tx.warType.findUnique({ where: { name: "Karma Sprint" } });
      warTypeId = ksType?.id ?? null;
    }
    if (warTypeId) {
      await tx.studentRivalryBout.create({
        data: {
          studentRivalryId: rivalryId,
          round: 1,
          title: "Bout 1",
          status: "PENDING",
          warTypeId,
          teacherId: fresh.pendingTeacherId ?? null,
          teacherStatus: fresh.pendingTeacherId ? "NOMINATED" : null,
        },
      });
    }

    return tx.studentRivalry.update({
      where: { id: rivalryId },
      data: {
        status: "ACTIVE",
        targetAccepted: true,
        battlefieldServerId: built.serverId,
        serverRoleWarriorId: built.warriorRoleId,
        scoreboardChannelId: built.scoreboardChannelId,
        scoreboardMessageId,
        loreChannelId: built.loreChannelId,
      },
    });
  });

  await createNotificationsForUsers({
    title: "⚔️ The Duel Has Begun!",
    message: `${rivalry.studentB.name} accepted! The 1v1 war is now ACTIVE!`,
    type: "STUDENT_WAR_ACTIVE",
    entityId: rivalryId,
    studentIds: [rivalry.studentAId, rivalry.studentBId],
  });

  revalidatePath("/student/wars");
  revalidatePath(`/student/wars/${rivalryId}`);
  return updated;
}

export async function retractStudentRivalryProposal(rivalryId: string) {
  const student = await getCallerStudent();

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.proposerId !== student.id) throw new Error("Only the proposer can retract");
  if (rivalry.status !== "PENDING_ADMIN" && rivalry.status !== "PENDING_CR")
    throw new Error("Cannot retract after the war has started");

  const updated = await prisma.studentRivalry.update({
    where: { id: rivalryId },
    data: { status: "REJECTED" },
  });

  const admins = rivalry.status === "PENDING_ADMIN"
    ? await prisma.admin.findMany({ select: { id: true } })
    : [];
  await createNotificationsForUsers({
    title: "Duel Proposal Retracted",
    message: `${rivalry.studentA.name} ${rivalry.studentA.surname} retracted the duel challenge.`,
    type: "STUDENT_WAR_RETRACTED",
    entityId: rivalryId,
    studentIds: [rivalry.studentBId],
    adminIds: admins.map((a) => a.id),
  });

  revalidatePath("/student/wars");
  return updated;
}

export async function surrenderStudentRivalry(rivalryId: string) {
  const student = await getCallerStudent();

  const rivalry = await prisma.studentRivalry.findUnique({ where: { id: rivalryId } });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Can only surrender an active war");

  const isA = rivalry.studentAId === student.id;
  const isB = rivalry.studentBId === student.id;
  if (!isA && !isB) throw new Error("You are not part of this war");

  const winnerId = isA ? rivalry.studentBId : rivalry.studentAId;

  return _concludeStudentRivalryInternal(rivalryId, {
    forcedWinnerStudentId: winnerId,
    surrenderedByStudentId: student.id,
  });
}

async function createDuelServer(
  rivalry: {
    id: string;
    studentAId: string;
    studentBId: string;
    studentA: { name: string; surname: string; username: string };
    studentB: { name: string; surname: string; username: string };
  },
  opts: { createdById: string; tx?: any } = { createdById: "system" }
): Promise<{
  serverId: string;
  scoreboardChannelId: string | null;
  loreChannelId: string | null;
  warriorRoleId: string;
}> {
  function generateInviteCode() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  const db: any = opts.tx ?? prisma;

  const serverName = `⚔️ ${rivalry.studentA.name} vs ${rivalry.studentB.name}`;

  const server = await db.server.create({
    data: {
      name: serverName,
      description: `Duel arena for ${rivalry.studentA.name} vs ${rivalry.studentB.name}.`,
      inviteCode: generateInviteCode(),
      createdById: opts.createdById,
      isDiscoverable: false,
    },
  });

  const generalCat = await db.serverChannelCategory.create({
    data: { serverId: server.id, name: "DUEL ARENA", order: 0 },
  });

  await db.serverChannel.createMany({
    data: [
      { serverId: server.id, categoryId: generalCat.id, name: "war-room", order: 0 },
      { serverId: server.id, categoryId: generalCat.id, name: "scoreboard", order: 1 },
      { serverId: server.id, categoryId: generalCat.id, name: "lore-archive", order: 2 },
    ],
  });

  await db.serverMember.createMany({
    data: [
      {
        serverId: server.id,
        userId: rivalry.studentAId,
        role: "MEMBER",
        username: rivalry.studentA.username,
        displayName: `${rivalry.studentA.name} ${rivalry.studentA.surname}`.trim(),
      },
      {
        serverId: server.id,
        userId: rivalry.studentBId,
        role: "MEMBER",
        username: rivalry.studentB.username,
        displayName: `${rivalry.studentB.name} ${rivalry.studentB.surname}`.trim(),
      },
    ],
    skipDuplicates: true,
  });

  const { warriorRoleId } = await createStudentWarRoles(server.id, db);
  const [scoreboardCh, loreCh] = await Promise.all([
    findWarChannelByName(server.id, "scoreboard", db),
    findWarChannelByName(server.id, "lore-archive", db),
  ]);

  return {
    serverId: server.id,
    scoreboardChannelId: scoreboardCh?.id ?? null,
    loreChannelId: loreCh?.id ?? null,
    warriorRoleId,
  };
}

export async function recordStudentBout(input: {
  rivalryId: string;
  title: string;
  description?: string;
  studentAPoints: number;
  studentBPoints: number;
}) {
  await requireRole("admin", "teacher");
  const { rivalryId, title, description, studentAPoints, studentBPoints } = input;

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { bouts: true, studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Rivalry is not active");

  const round = rivalry.bouts.length + 1;
  const winnerId = studentAPoints > studentBPoints ? rivalry.studentAId :
                   studentBPoints > studentAPoints ? rivalry.studentBId : null;

  const newAScore = rivalry.studentAScore + studentAPoints;
  const newBScore = rivalry.studentBScore + studentBPoints;

  const { title: loreTitle, narrative } = generateWeeklyLore({
    studentAName: `${rivalry.studentA.name} ${rivalry.studentA.surname}`,
    studentBName: `${rivalry.studentB.name} ${rivalry.studentB.surname}`,
    weekNumber: round,
    studentAScore: newAScore,
    studentBScore: newBScore,
    boutTitle: title,
    boutWinnerName: winnerId === rivalry.studentAId ? `${rivalry.studentA.name} ${rivalry.studentA.surname}` :
                     winnerId === rivalry.studentBId ? `${rivalry.studentB.name} ${rivalry.studentB.surname}` : undefined,
    totalBouts: round,
  });

  const bout = await prisma.$transaction(async (tx) => {
    const fresh = await tx.studentRivalry.findUnique({
      where: { id: rivalryId },
      select: { status: true },
    });
    if (!fresh || fresh.status !== "ACTIVE") throw new Error("Rivalry is no longer active");

    const b = await tx.studentRivalryBout.create({
      data: {
        studentRivalryId: rivalryId,
        round,
        title,
        description,
        studentAPoints,
        studentBPoints,
        winnerId,
        status: "COMPLETED",
        endTime: new Date(),
      },
    });
    await tx.studentRivalry.update({
      where: { id: rivalryId },
      data: { studentAScore: newAScore, studentBScore: newBScore },
    });
    await tx.studentRivalryLore.create({
      data: { studentRivalryId: rivalryId, weekNumber: round, title: loreTitle, narrative },
    });
    return b;
  });

  if (rivalry.scoreboardChannelId) {
    try {
      const newMessageId = await upsertScoreboardMessage(
        rivalry.scoreboardChannelId,
        renderStudentScoreboard({
          studentAName: `${rivalry.studentA.name} ${rivalry.studentA.surname}`,
          studentBName: `${rivalry.studentB.name} ${rivalry.studentB.surname}`,
          studentAScore: newAScore,
          studentBScore: newBScore,
          totalBouts: round,
          status: "ACTIVE",
        }),
        rivalry.scoreboardMessageId,
      );
      if (newMessageId !== rivalry.scoreboardMessageId) {
        await prisma.studentRivalry.update({
          where: { id: rivalryId },
          data: { scoreboardMessageId: newMessageId },
        });
      }
      const aName = `${rivalry.studentA.name} ${rivalry.studentA.surname}`;
      const bName = `${rivalry.studentB.name} ${rivalry.studentB.surname}`;
      await postWarSystemMessage({
        channelId: rivalry.scoreboardChannelId,
        content:
          `⚔️ **Round ${round} — ${title}**\n` +
          `${aName}: **+${studentAPoints}**  ·  ${bName}: **+${studentBPoints}**\n` +
          (winnerId === rivalry.studentAId
            ? `🏆 Round goes to **${aName}**.`
            : winnerId === rivalry.studentBId
            ? `🏆 Round goes to **${bName}**.`
            : `⚖️ Round drawn.`),
      });
    } catch (err) {
      console.error("[recordStudentBout] scoreboard update failed:", err);
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
      console.error("[recordStudentBout] lore post failed:", err);
    }
  }
  await publishWarEvent("student", {
    type: "war:bout",
    rivalryId,
    boutId: bout.id,
    round,
    title,
    studentAPoints,
    studentBPoints,
    winnerId,
  });
  await publishWarEvent("student", {
    type: "war:score",
    rivalryId,
    studentAScore: newAScore,
    studentBScore: newBScore,
  });
  await publishWarEvent("student", {
    type: "war:lore",
    rivalryId,
    weekNumber: round,
    title: loreTitle,
  });

  revalidatePath(`/student/wars/${rivalryId}`);
  revalidatePath(`/list/wars`);
  return bout;
}

export async function concludeStudentRivalry(rivalryId: string) {
  await requireRole("admin");
  return _concludeStudentRivalryInternal(rivalryId, {});
}

async function _concludeStudentRivalryInternal(
  rivalryId: string,
  opts: {
    forcedWinnerStudentId?: string | null;
    surrenderedByStudentId?: string | null;
  }
) {
  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { bouts: true, studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE") throw new Error("Rivalry is not active");

  const winnerStudentId =
    opts.forcedWinnerStudentId !== undefined && opts.forcedWinnerStudentId !== null
      ? opts.forcedWinnerStudentId
      : rivalry.studentAScore > rivalry.studentBScore
      ? rivalry.studentAId
      : rivalry.studentBScore > rivalry.studentAScore
      ? rivalry.studentBId
      : null;

  const winnerName = winnerStudentId === rivalry.studentAId
    ? `${rivalry.studentA.name} ${rivalry.studentA.surname}`
    : winnerStudentId === rivalry.studentBId
    ? `${rivalry.studentB.name} ${rivalry.studentB.surname}`
    : undefined;

  const { title: loreTitle, narrative } = generateSeasonClosingLore({
    studentAName: `${rivalry.studentA.name} ${rivalry.studentA.surname}`,
    studentBName: `${rivalry.studentB.name} ${rivalry.studentB.surname}`,
    weekNumber: rivalry.bouts.length,
    studentAScore: rivalry.studentAScore,
    studentBScore: rivalry.studentBScore,
    totalBouts: rivalry.bouts.length,
    winnerName,
  });

  const { updated, didConclude } = await prisma.$transaction(async (tx) => {
    const fresh = await tx.studentRivalry.findUnique({ where: { id: rivalryId } });
    if (!fresh) throw new Error("Rivalry not found");
    if (fresh.status !== "ACTIVE") {
      return { updated: fresh, didConclude: false };
    }

    await tx.studentRivalryLore.create({
      data: { studentRivalryId: rivalryId, weekNumber: 999, title: loreTitle, narrative },
    });

    const u = await tx.studentRivalry.update({
      where: { id: rivalryId },
      data: {
        status: "CONCLUDED",
        winnerStudentId,
        concludedAt: new Date(),
      },
    });
    return { updated: u, didConclude: true };
  });

  if (!didConclude) {
    return updated;
  }

  if (updated?.seasonId && !updated.seasonPointsDistributed) {
    try {
      await recordStudentWarSeasonPoints(rivalryId, updated.seasonId);
    } catch (err) {
      console.error("[concludeStudentRivalry] season point recording failed:", err);
    }
  }

  try {
    await settleRivalryBets(rivalryId, winnerStudentId);
  } catch (err) {
    console.error("[concludeStudentRivalry] bet settlement failed:", err);
  }

  if (winnerStudentId) {
    try {
      const winningAllies = await prisma.studentRivalryAlly.findMany({
        where: {
          studentRivalryId: rivalryId,
          sideStudentId: winnerStudentId,
          status: "ACCEPTED",
          bonusGecxAwarded: 0,
        },
      });
      for (const ally of winningAllies) {
        await awardGecX({
          userId: ally.allyStudentId,
          userType: "student",
          amount: 50,
          type: "student_war_ally_bonus",
          description: `Ally bonus for winning side of duel`,
          relatedId: rivalryId,
        });
        await prisma.studentRivalryAlly.update({
          where: { id: ally.id },
          data: { bonusGecxAwarded: 50 },
        });
      }
    } catch (err) {
      console.error("[concludeStudentRivalry] ally bonus award failed:", err);
    }
  }

  if (rivalry.scoreboardChannelId) {
    try {
      const newMessageId = await upsertScoreboardMessage(
        rivalry.scoreboardChannelId,
        renderStudentScoreboard({
          studentAName: `${rivalry.studentA.name} ${rivalry.studentA.surname}`,
          studentBName: `${rivalry.studentB.name} ${rivalry.studentB.surname}`,
          studentAScore: rivalry.studentAScore,
          studentBScore: rivalry.studentBScore,
          totalBouts: rivalry.bouts.length,
          status: "CONCLUDED",
          winnerName,
        }),
        rivalry.scoreboardMessageId,
      );
      if (newMessageId !== rivalry.scoreboardMessageId) {
        await prisma.studentRivalry.update({
          where: { id: rivalryId },
          data: { scoreboardMessageId: newMessageId },
        });
      }
    } catch (err) {
      console.error("[concludeStudentRivalry] final scoreboard update failed:", err);
    }
  }
  if (rivalry.battlefieldServerId) {
    try {
      await archiveWarServer(rivalry.battlefieldServerId, {
        finalName: `[Concluded] ⚔️ ${rivalry.studentA.name} vs ${rivalry.studentB.name}`,
        archiveChannelId: rivalry.loreChannelId,
        summaryContent:
          `🏆 **${winnerName ?? "Draw"}**\n\n` +
          `**${rivalry.studentA.name}**: ${rivalry.studentAScore.toFixed(0)} pts\n` +
          `**${rivalry.studentB.name}**: ${rivalry.studentBScore.toFixed(0)} pts\n` +
          `Rounds: ${rivalry.bouts.length}\n\n_${loreTitle}_`,
      });
      await prisma.studentRivalry.update({
        where: { id: rivalryId },
        data: { isArchived: true },
      });
    } catch (err) {
      console.error("[concludeStudentRivalry] archive failed:", err);
    }
  }

  await publishWarEvent("student", {
    type: "war:score",
    rivalryId,
    studentAScore: rivalry.studentAScore,
    studentBScore: rivalry.studentBScore,
  });
  await publishWarEvent("student", {
    type: "war:concluded",
    rivalryId,
    winnerId: winnerStudentId,
    isSurrender: !!opts.surrenderedByStudentId,
  });
  await publishWarEvent("student", {
    type: "war:archived",
    rivalryId,
    battlefieldServerId: rivalry.battlefieldServerId ?? null,
  });

  if (winnerStudentId) {

    const profile = await prisma.userCommunityProfile.findUnique({ where: { userId: winnerStudentId } });
    if (profile) {
      await prisma.userCommunityProfile.update({
        where: { userId: winnerStudentId },
        data: { karmaPoints: profile.karmaPoints + 5000 },
      });
    }
    await awardGecX({
      userId: winnerStudentId,
      userType: "student",
      amount: 200,
      type: opts.surrenderedByStudentId ? "student_war_surrender_winner" : "student_war_winner",
      description: opts.surrenderedByStudentId
        ? "Opponent surrendered — 200 bonus RP awarded"
        : "Won a 1v1 student war — 200 bonus RP converted",
      relatedId: rivalryId,
    });
  }

  await createNotificationsForUsers({
    title: opts.surrenderedByStudentId ? "🏳️ Duel Ended By Surrender" : "⚔️ Duel Concluded!",
    message: opts.surrenderedByStudentId
      ? (winnerName ? `${winnerName} wins by surrender!` : "The duel ended by surrender.")
      : (winnerName ? `${winnerName} wins the duel!` : "The duel ends in a draw!"),
    type: "STUDENT_WAR_CONCLUDED",
    entityId: rivalryId,
    studentIds: [rivalry.studentAId, rivalry.studentBId],
  });

  revalidatePath("/list/wars");
  revalidatePath(`/student/wars/${rivalryId}`);
  return updated;
}

const RP_TO_KARMA = 25;
const RP_TO_GECX = 1;

export async function convertStudentRivalryPoints(rivalryId: string, rivalryPoints: number) {
  const student = await getCallerStudent();
  if (rivalryPoints <= 0 || rivalryPoints % 100 !== 0)
    throw new Error("Convert in multiples of 100 RP only");

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE" && rivalry.status !== "CONCLUDED")
    throw new Error("Rivalry must be active or concluded to convert");

  const isA = rivalry.studentAId === student.id;
  const isB = rivalry.studentBId === student.id;
  if (!isA && !isB) throw new Error("You are not part of this rivalry");

  const currentScore = isA ? rivalry.studentAScore : rivalry.studentBScore;
  if (currentScore < rivalryPoints)
    throw new Error(`Insufficient points (have ${Math.floor(currentScore)}, need ${rivalryPoints})`);

  const karmaEarned = rivalryPoints * RP_TO_KARMA;
  const gecxEarned = rivalryPoints * RP_TO_GECX;

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.studentRivalry.findUnique({ where: { id: rivalryId } });
    if (!fresh) throw new Error("Rivalry not found");
    const currentScore = isA ? fresh.studentAScore : fresh.studentBScore;
    if (currentScore < rivalryPoints)
      throw new Error(`Insufficient points (have ${Math.floor(currentScore)}, need ${rivalryPoints})`);

    await tx.studentRivalry.update({
      where: { id: rivalryId },
      data: isA
        ? { studentAScore: { decrement: rivalryPoints } }
        : { studentBScore: { decrement: rivalryPoints } },
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
    type: "student_rivalry_conversion",
    description: `Converted ${rivalryPoints} RP → ${gecxEarned} GECX`,
    relatedId: rivalryId,
  });

  revalidatePath(`/student/wars/${rivalryId}`);
  return { karmaEarned, gecxEarned, rpSpent: rivalryPoints };
}

export async function issueStudentStrike(rivalryId: string, studentId: string, reason: string) {
  await requireRole("admin", "teacher");

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  const strikes = await prisma.studentRivalryStrike.findMany({
    where: { studentRivalryId: rivalryId, studentId },
  });

  const mutedUntil = new Date();
  mutedUntil.setHours(mutedUntil.getHours() + 48);

  const strike = await prisma.studentRivalryStrike.create({
    data: { studentRivalryId: rivalryId, studentId, reason, mutedUntil },
  });

  await createNotificationsForUsers({
    title: "⚠️ Duel Strike Issued",
    message: `You received a strike in your duel. Reason: ${reason}. Muted for 48h.`,
    type: "STUDENT_WAR_STRIKE",
    entityId: rivalryId,
    studentIds: [studentId],
  });

  if (strikes.length + 1 >= 3) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.studentRivalry.findUnique({
        where: { id: rivalryId },
        select: { studentAScore: true, studentBScore: true, studentAId: true },
      });
      if (!fresh) return;
      const isA = studentId === fresh.studentAId;
      await tx.studentRivalry.update({
        where: { id: rivalryId },
        data: isA
          ? { studentAScore: Math.max(0, fresh.studentAScore - 50) }
          : { studentBScore: Math.max(0, fresh.studentBScore - 50) },
      });
    });
  }

  revalidatePath(`/list/wars`);
  return { strike, strikeCount: strikes.length + 1 };
}

export async function expireStaleStudentRivalries() {
  await requireRole("admin");

  const now = new Date();
  const stale = await prisma.studentRivalry.findMany({
    where: {
      status: "PENDING_ADMIN",
      autoExpiresAt: { lt: now },
    },
    include: { studentA: true, studentB: true },
  });

  let expiredCount = 0;
  for (const r of stale) {
    const didExpire = await prisma.$transaction(async (tx) => {
      const fresh = await tx.studentRivalry.findUnique({ where: { id: r.id } });
      if (!fresh || fresh.status !== "PENDING_ADMIN") return false;
      await tx.studentRivalry.update({ where: { id: r.id }, data: { status: "EXPIRED" } });
      return true;
    });
    if (didExpire) {
      expiredCount += 1;
      await createNotificationsForUsers({
        title: "War Proposal Expired",
        message: `Your duel proposal against ${r.studentB.name} expired without admin review.`,
        type: "STUDENT_WAR_REJECTED",
        entityId: r.id,
        studentIds: [r.proposerId],
      });
    }
  }

  return { expired: expiredCount };
}

export async function getStudentRivalryById(rivalryId: string) {
  return prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      studentA: true,
      studentB: true,
      bouts: { include: { warType: true }, orderBy: { conductedAt: "asc" } },
      strikes: { orderBy: { issuedAt: "desc" } },
      loreEntries: { orderBy: { weekNumber: "asc" } },
    },
  });
}

export async function getMyStudentRivalries() {
  const { userId } = auth();
  if (!userId) return [];

  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) return [];

  return prisma.studentRivalry.findMany({
    where: {
      OR: [{ studentAId: student.id }, { studentBId: student.id }],
      status: { in: ["PENDING_ADMIN", "PENDING_CR", "ACTIVE", "CONCLUDED"] },
    },
    include: {
      studentA: true,
      studentB: true,
      bouts: { include: { warType: true }, orderBy: { conductedAt: "desc" }, take: 5 },
      loreEntries: { orderBy: { weekNumber: "desc" }, take: 1 },
    },
  });
}

export async function getAllStudentRivalries(status?: string) {
  return prisma.studentRivalry.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      studentA: true,
      studentB: true,
      bouts: true,
      seasonRef: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getStudentScoreboard(rivalryId: string) {
  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      studentA: true,
      studentB: true,
      bouts: { orderBy: { conductedAt: "asc" } },
    },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  return {
    studentA: {
      id: rivalry.studentAId,
      name: `${rivalry.studentA.name} ${rivalry.studentA.surname}`,
      rawScore: rivalry.studentAScore,
    },
    studentB: {
      id: rivalry.studentBId,
      name: `${rivalry.studentB.name} ${rivalry.studentB.surname}`,
      rawScore: rivalry.studentBScore,
    },
    bouts: rivalry.bouts,
    totalBouts: rivalry.bouts.length,
    status: rivalry.status,
    winnerStudentId: rivalry.winnerStudentId,
  };
}

export async function getStudentsForWarProposal(search?: string) {
  const { userId } = auth();
  if (!userId) return [];

  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) return [];

  return prisma.student.findMany({
    where: {
      id: { not: userId },
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { surname: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: {
      id: true,
      name: true,
      surname: true,
      username: true,
      img: true,
      class: { select: { name: true } },
    },
    take: 50,
    orderBy: { name: "asc" },
  });
}

export async function acceptWarNomination(boutId: string) {
  await requireRole("teacher");
  const { userId } = auth();

  const bout = await prisma.studentRivalryBout.findUnique({
    where: { id: boutId },
    include: { rivalry: { include: { studentA: true, studentB: true } } },
  });
  if (!bout || bout.teacherId !== userId) throw new Error("Nomination not found");
  if (bout.teacherStatus !== "NOMINATED") throw new Error("Not currently nominated");

  const updated = await prisma.studentRivalryBout.update({
    where: { id: boutId },
    data: { teacherStatus: "ACCEPTED" },
  });

  await createNotificationsForUsers({
    title: "👨‍🏫 Judge Accepted!",
    message: `A teacher has accepted to judge Bout ${bout.round}.`,
    type: "STUDENT_WAR_ACTIVE",
    entityId: bout.studentRivalryId,
    studentIds: [bout.rivalry.studentAId, bout.rivalry.studentBId],
  });

  revalidatePath("/teacher/wars");
  return updated;
}

export async function declineWarNomination(boutId: string) {
  await requireRole("teacher");
  const { userId } = auth();

  const bout = await prisma.studentRivalryBout.findUnique({
    where: { id: boutId },
    include: { rivalry: true, warType: true },
  });
  if (!bout || bout.teacherId !== userId) throw new Error("Nomination not found");
  if (bout.teacherStatus !== "NOMINATED") throw new Error("Not currently nominated");

  let newWarTypeId = bout.warTypeId;

  if (bout.warType?.fallbackTypeId) {
    newWarTypeId = bout.warType.fallbackTypeId;
  } else {
    const ksType = await prisma.warType.findUnique({ where: { name: "Karma Sprint" } });
    if (ksType) newWarTypeId = ksType.id;
  }

  const updated = await prisma.studentRivalryBout.update({
    where: { id: boutId },
    data: {
      teacherStatus: "DECLINED",
      warTypeId: newWarTypeId,

      teacherId: null
    },
  });

  await createNotificationsForUsers({
    title: "⚠️ Judge Declined",
    message: `Your nominated judge declined. The bout type has been converted to the fallback type.`,
    type: "STUDENT_WAR_ACTIVE",
    entityId: bout.studentRivalryId,
    studentIds: [bout.rivalry.studentAId, bout.rivalry.studentBId],
  });

  revalidatePath("/teacher/wars");
  return updated;
}

export async function getTeacherWarJudgments() {
  const { userId } = auth();
  if (!userId) return [];

  return prisma.studentRivalryBout.findMany({
    where: { teacherId: userId },
    include: {
      warType: true,
      rivalry: {
        include: {
          studentA: true,
          studentB: true,
        },
      },
    },
    orderBy: { conductedAt: "desc" },
  });
}
