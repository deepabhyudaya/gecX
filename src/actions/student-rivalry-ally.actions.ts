"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";
import { assignWarRole, assignWarRoleToMany, createWarServerRole } from "@/lib/war-server";
import { publishWarEvent } from "@/lib/war-events";

const MAX_ALLIES_PER_SIDE = 2;

async function getCallerStudent() {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");
  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (!student) throw new Error("Student not found");
  return student;
}

async function requireRole(...roles: string[]) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (!roles.includes(role)) throw new Error("Unauthorized");
  return role;
}

async function createAllyRolesForRivalry(
  serverId: string,
  rivalry: { studentA: { name: string }; studentB: { name: string } },
  tx?: any
) {
  const db = tx ?? prisma;
  const allyARoleId = await createWarServerRole(
    serverId,
    {
      name: `Ally · ${rivalry.studentA.name}`,
      color: "#FFA94D",
      position: 20,
    },
    db
  );
  const allyBRoleId = await createWarServerRole(
    serverId,
    {
      name: `Ally · ${rivalry.studentB.name}`,
      color: "#51CF66",
      position: 20,
    },
    db
  );
  return { allyARoleId, allyBRoleId };
}

async function ensureAllyRoles(rivalry: { battlefieldServerId: string | null; serverRoleAllyAId: string | null; serverRoleAllyBId: string | null; studentA: { name: string }; studentB: { name: string } }) {
  if (!rivalry.battlefieldServerId) throw new Error("No duel server found");
  if (rivalry.serverRoleAllyAId && rivalry.serverRoleAllyBId) {
    return { allyARoleId: rivalry.serverRoleAllyAId, allyBRoleId: rivalry.serverRoleAllyBId };
  }
  const roles = await createAllyRolesForRivalry(rivalry.battlefieldServerId, rivalry);
  await prisma.studentRivalry.update({
    where: { id: undefined as any  },
    data: { serverRoleAllyAId: roles.allyARoleId, serverRoleAllyBId: roles.allyBRoleId },
  });
  return roles;
}

export async function inviteAlly(rivalryId: string, allyStudentId: string) {
  const student = await getCallerStudent();

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { studentA: true, studentB: true, allies: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "ACTIVE" && rivalry.status !== "PENDING_CR") {
    throw new Error("Allies can only be invited before or during an active war");
  }

  const isA = rivalry.studentAId === student.id;
  const isB = rivalry.studentBId === student.id;
  if (!isA && !isB) throw new Error("Only the duelists can invite allies");

  if (allyStudentId === student.id) throw new Error("You cannot invite yourself");
  if (allyStudentId === rivalry.studentAId || allyStudentId === rivalry.studentBId) {
    throw new Error("You cannot invite your opponent as an ally");
  }
  const already = rivalry.allies.find(
    (a) => a.allyStudentId === allyStudentId && a.status !== "REMOVED" && a.status !== "REVOKED"
  );
  if (already) throw new Error("This student already has a pending or accepted invitation");

  const sideCount = rivalry.allies.filter(
    (a) => a.sideStudentId === student.id && a.status === "ACCEPTED"
  ).length;
  if (sideCount >= MAX_ALLIES_PER_SIDE) throw new Error(`Max ${MAX_ALLIES_PER_SIDE} allies per side`);

  const serverId = rivalry.battlefieldServerId;
  let { allyARoleId, allyBRoleId } = {
    allyARoleId: rivalry.serverRoleAllyAId,
    allyBRoleId: rivalry.serverRoleAllyBId,
  };
  if (serverId && (!allyARoleId || !allyBRoleId)) {
    const created = await createAllyRolesForRivalry(serverId, rivalry);
    await prisma.studentRivalry.update({
      where: { id: rivalryId },
      data: {
        serverRoleAllyAId: created.allyARoleId,
        serverRoleAllyBId: created.allyBRoleId,
      },
    });
    allyARoleId = created.allyARoleId;
    allyBRoleId = created.allyBRoleId;
  }

  const sideStudentId = isA ? rivalry.studentAId : rivalry.studentBId;
  const inviterId = student.id;
  const invited = await prisma.studentRivalryAlly.create({
    data: {
      studentRivalryId: rivalryId,
      sideStudentId,
      inviterId,
      allyStudentId,
      status: "PENDING",
    },
  });

  await createNotificationsForUsers({
    title: "Ally Invitation",
    message: `${student.name} ${student.surname} invited you to join their side in a duel.`,
    type: "STUDENT_WAR_ALLY_INVITED",
    entityId: rivalryId,
    studentIds: [allyStudentId],
  });

  revalidatePath(`/student/wars/${rivalryId}`);
  return invited;
}

export async function respondToAllyInvite(allyId: string, accept: boolean) {
  const student = await getCallerStudent();

  const ally = await prisma.studentRivalryAlly.findUnique({
    where: { id: allyId },
    include: { rivalry: true, inviter: true },
  });
  if (!ally) throw new Error("Invitation not found");
  if (ally.allyStudentId !== student.id) throw new Error("This invitation is not for you");
  if (ally.status !== "PENDING") throw new Error("Invitation already responded to");

  if (!accept) {
    const updated = await prisma.studentRivalryAlly.update({
      where: { id: allyId },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    await createNotificationsForUsers({
      title: "Ally Declined",
      message: `${student.name} ${student.surname} declined your ally invitation.`,
      type: "STUDENT_WAR_ALLY_DECLINED",
      entityId: ally.studentRivalryId,
      studentIds: [ally.inviterId],
    });
    revalidatePath(`/student/wars/${ally.studentRivalryId}`);
    return updated;
  }

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: ally.studentRivalryId },
    include: { studentA: true, studentB: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");

  const updated = await prisma.studentRivalryAlly.update({
    where: { id: allyId },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });

  if (rivalry.battlefieldServerId) {
    const isSideA = ally.sideStudentId === rivalry.studentAId;
    const roleId = isSideA ? rivalry.serverRoleAllyAId : rivalry.serverRoleAllyBId;
    if (roleId) {
      await assignWarRole(rivalry.battlefieldServerId, student.id, roleId, ally.inviterId);
    }
  }

  await createNotificationsForUsers({
    title: "Ally Joined",
    message: `${student.name} ${student.surname} accepted your ally invitation!`,
    type: "STUDENT_WAR_ALLY_ACCEPTED",
    entityId: ally.studentRivalryId,
    studentIds: [ally.inviterId],
  });

  await publishWarEvent("student", {
    type: "war:ally",
    rivalryId: ally.studentRivalryId,
    allyStudentId: student.id,
    sideStudentId: ally.sideStudentId,
    event: "accepted",
  } as any);

  revalidatePath(`/student/wars/${ally.studentRivalryId}`);
  return updated;
}

export async function revokeAllyInvite(allyId: string) {
  const student = await getCallerStudent();

  const ally = await prisma.studentRivalryAlly.findUnique({ where: { id: allyId } });
  if (!ally) throw new Error("Invitation not found");
  if (ally.inviterId !== student.id) throw new Error("Only the inviter can revoke");
  if (ally.status !== "PENDING") throw new Error("Can only revoke pending invitations");

  const updated = await prisma.studentRivalryAlly.update({
    where: { id: allyId },
    data: { status: "REVOKED", removedAt: new Date() },
  });

  await createNotificationsForUsers({
    title: "Ally Invitation Revoked",
    message: `Your ally invitation was revoked before you could respond.`,
    type: "STUDENT_WAR_ALLY_REVOKED",
    entityId: ally.studentRivalryId,
    studentIds: [ally.allyStudentId],
  });

  revalidatePath(`/student/wars/${ally.studentRivalryId}`);
  return updated;
}

export async function removeAlly(allyId: string, reason?: string) {
  await requireRole("admin", "teacher");

  const ally = await prisma.studentRivalryAlly.findUnique({ where: { id: allyId }, include: { ally: true } });
  if (!ally) throw new Error("Ally not found");
  if (ally.status !== "ACCEPTED") throw new Error("Only accepted allies can be removed");

  const updated = await prisma.studentRivalryAlly.update({
    where: { id: allyId },
    data: { status: "REMOVED", removedAt: new Date(), removedReason: reason ?? null },
  });

  revalidatePath(`/student/wars/${ally.studentRivalryId}`);
  return updated;
}

export async function getRivalryAllies(rivalryId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");

  return prisma.studentRivalryAlly.findMany({
    where: { studentRivalryId: rivalryId, status: { in: ["PENDING", "ACCEPTED"] } },
    include: { ally: true, inviter: true },
    orderBy: { invitedAt: "asc" },
  });
}
