

import prisma from "./prisma";
import { ROLE_PERMISSIONS } from "./role-permissions";

type Db = typeof prisma | any;

export interface WarRoleSeed {
  name: string;
  color?: string | null;
  iconUrl?: string | null;
  position: number;
  permissions?: bigint;
  hoist?: boolean;
}

const WARRIOR_PERMISSIONS =
  ROLE_PERMISSIONS.VIEW_CHANNELS |
  ROLE_PERMISSIONS.SEND_MESSAGES |
  ROLE_PERMISSIONS.MENTION_EVERYONE;

const CR_PERMISSIONS =
  WARRIOR_PERMISSIONS |
  ROLE_PERMISSIONS.MANAGE_MESSAGES |
  ROLE_PERMISSIONS.MUTE_MEMBERS;

export async function createWarServerRole(
  serverId: string,
  seed: WarRoleSeed,
  db: Db = prisma
): Promise<string> {
  const role = await db.serverRole.create({
    data: {
      serverId,
      name: seed.name,
      color: seed.color ?? null,
      iconUrl: seed.iconUrl ?? null,
      position: seed.position,
      permissions: seed.permissions ?? WARRIOR_PERMISSIONS,
      hoist: seed.hoist ?? true,
      mentionable: true,
    },
  });
  return role.id;
}

export async function createBranchWarRoles(
  serverId: string,
  classA: { name: string },
  classB: { name: string },
  db: Db = prisma
): Promise<{
  crARoleId: string;
  crBRoleId: string;
  warriorARoleId: string;
  warriorBRoleId: string;
}> {

  const crARoleId = await createWarServerRole(serverId, {
    name: `CR · ${classA.name}`,
    color: "#FF6B6B",
    position: 50,
    permissions: CR_PERMISSIONS,
  }, db);
  const crBRoleId = await createWarServerRole(serverId, {
    name: `CR · ${classB.name}`,
    color: "#4DABF7",
    position: 50,
    permissions: CR_PERMISSIONS,
  }, db);
  const warriorARoleId = await createWarServerRole(serverId, {
    name: `Warrior · ${classA.name}`,
    color: "#FA5252",
    position: 30,
    permissions: WARRIOR_PERMISSIONS,
  }, db);
  const warriorBRoleId = await createWarServerRole(serverId, {
    name: `Warrior · ${classB.name}`,
    color: "#339AF0",
    position: 30,
    permissions: WARRIOR_PERMISSIONS,
  }, db);
  return { crARoleId, crBRoleId, warriorARoleId, warriorBRoleId };
}

export async function createStudentWarRoles(
  serverId: string,
  db: Db = prisma
): Promise<{ warriorRoleId: string }> {
  const warriorRoleId = await createWarServerRole(
    serverId,
    {
      name: "Duelist",
      color: "#9775FA",
      position: 40,
      permissions: WARRIOR_PERMISSIONS,
    },
    db
  );
  return { warriorRoleId };
}

export async function assignWarRole(
  serverId: string,
  userId: string,
  roleId: string,
  assignedBy: string | null = null,
  db: Db = prisma
): Promise<boolean> {
  const member = await db.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member) return false;

  try {
    await db.serverMemberRole.create({
      data: { memberId: member.id, roleId, assignedBy },
    });
    return true;
  } catch (err: any) {
    if (err?.code === "P2002") return false;
    throw err;
  }
}

export async function assignWarRoleToMany(
  serverId: string,
  userIds: string[],
  roleId: string,
  assignedBy: string | null = null,
  db: Db = prisma
): Promise<{ assigned: number; skipped: number }> {
  if (userIds.length === 0) return { assigned: 0, skipped: 0 };

  const members = await db.serverMember.findMany({
    where: { serverId, userId: { in: userIds } },
    select: { id: true, userId: true },
  });

  let assigned = 0;
  for (const m of members) {
    const created = await db.serverMemberRole
      .create({ data: { memberId: m.id, roleId, assignedBy } })
      .then(() => true)
      .catch((err: any) => {
        if (err?.code === "P2002") return false;
        throw err;
      });
    if (created) assigned += 1;
  }
  return { assigned, skipped: userIds.length - assigned };
}

export async function findWarChannelByName(
  serverId: string,
  name: string,
  db: Db = prisma
): Promise<{ id: string } | null> {
  const ch = await db.serverChannel.findFirst({
    where: { serverId, name },
    select: { id: true },
  });
  return ch ?? null;
}

interface SystemMessageOpts {
  channelId: string;
  content: string;
  senderId?: string;
  senderUsername?: string;
  senderRole?: string;
  db?: Db;
}

export async function postWarSystemMessage(opts: SystemMessageOpts) {
  const db: Db = opts.db ?? prisma;
  return db.serverMessage.create({
    data: {
      content: opts.content,
      channelId: opts.channelId,
      senderId: opts.senderId ?? "system",
      senderUsername: opts.senderUsername ?? "Arena",
      senderRole: opts.senderRole ?? "system",
      messageType: "TEXT",
    },
  });
}

export interface BranchScoreboard {
  classAName: string;
  classBName: string;
  classAScore: number;
  classBScore: number;
  totalBouts: number;
  status: string;
  winnerName?: string | null;
}

export function renderBranchScoreboard(s: BranchScoreboard): string {
  const lines: string[] = [];
  lines.push(`📊 **LIVE SCOREBOARD**`);
  lines.push(``);
  lines.push(`🔴 **${s.classAName}** — ${s.classAScore.toFixed(0)} pts`);
  lines.push(`🔵 **${s.classBName}** — ${s.classBScore.toFixed(0)} pts`);
  lines.push(``);
  lines.push(`Bouts fought: **${s.totalBouts}**`);
  lines.push(`Status: \`${s.status}\``);
  if (s.winnerName) lines.push(`🏆 Winner: **${s.winnerName}**`);
  lines.push(``);
  lines.push(`_Auto-updates after every bout. Pinned by the Arena._`);
  return lines.join("\n");
}

export interface StudentScoreboard {
  studentAName: string;
  studentBName: string;
  studentAScore: number;
  studentBScore: number;
  totalBouts: number;
  status: string;
  winnerName?: string | null;
}

export function renderStudentScoreboard(s: StudentScoreboard): string {
  const lines: string[] = [];
  lines.push(`⚔️ **DUEL SCOREBOARD**`);
  lines.push(``);
  lines.push(`🟣 **${s.studentAName}** — ${s.studentAScore.toFixed(0)} pts`);
  lines.push(`🟢 **${s.studentBName}** — ${s.studentBScore.toFixed(0)} pts`);
  lines.push(``);
  lines.push(`Rounds fought: **${s.totalBouts}**`);
  lines.push(`Status: \`${s.status}\``);
  if (s.winnerName) lines.push(`🏆 Winner: **${s.winnerName}**`);
  lines.push(``);
  lines.push(`_Auto-updates after every round. Pinned by the Arena._`);
  return lines.join("\n");
}

export async function upsertScoreboardMessage(
  channelId: string,
  content: string,
  existingMessageId: string | null | undefined,
  db: Db = prisma
): Promise<string> {
  if (existingMessageId) {
    const existing = await db.serverMessage.findUnique({
      where: { id: existingMessageId },
      select: { id: true },
    });
    if (existing) {
      await db.serverMessage.update({
        where: { id: existingMessageId },
        data: { content },
      });
      return existingMessageId;
    }

  }
  const created = await db.serverMessage.create({
    data: {
      content,
      channelId,
      senderId: "system",
      senderUsername: "Arena",
      senderRole: "system",
      messageType: "TEXT",
    },
  });
  return created.id;
}

export async function archiveWarServer(
  serverId: string | null,
  opts: {
    finalName?: string;
    archiveChannelId?: string | null;
    summaryContent?: string;
    db?: Db;
  } = {}
): Promise<void> {
  if (!serverId) return;
  const db: Db = opts.db ?? prisma;

  if (opts.finalName) {
    await db.server.update({
      where: { id: serverId },
      data: { name: opts.finalName, isDiscoverable: false },
    });
  }

  if (opts.archiveChannelId && opts.summaryContent) {
    await postWarSystemMessage({
      channelId: opts.archiveChannelId,
      content: opts.summaryContent,
      senderUsername: "Arena · Hall of Fame",
      db,
    });
  }
}
