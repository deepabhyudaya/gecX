"use server";

import prisma from "../lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ROLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../lib/role-permissions";

export async function checkServerPermission(
  serverId: string,
  permission: bigint
): Promise<boolean> {
  const { userId } = auth();
  if (!userId) return false;

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    include: {
      roles: {
        include: { role: true }
      }
    }
  });

  if (!member) return false;

  if (member.role === "ADMIN") return true;
  if (member.role === "MODERATOR") {
    if ((DEFAULT_ROLE_PERMISSIONS.MODERATOR & permission) === permission) return true;
  }
  if (member.role === "MEMBER") {
    if ((DEFAULT_ROLE_PERMISSIONS.MEMBER & permission) === permission) return true;
  }

  for (const memberRole of member.roles) {
    if ((memberRole.role.permissions & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR) {
      return true;
    }
    if ((memberRole.role.permissions & permission) === permission) {
      return true;
    }
  }

  return false;
}

export async function getUserServerPermissions(serverId: string): Promise<bigint> {
  const { userId } = auth();
  if (!userId) return 0n;

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    include: {
      roles: {
        include: { role: true }
      }
    }
  });

  if (!member) return 0n;

  if (member.role === "ADMIN") return DEFAULT_ROLE_PERMISSIONS.ADMIN;
  if (member.role === "MODERATOR") return DEFAULT_ROLE_PERMISSIONS.MODERATOR;
  if (member.role === "MEMBER") return DEFAULT_ROLE_PERMISSIONS.MEMBER;

  let permissions = 0n;
  for (const memberRole of member.roles) {
    permissions |= memberRole.role.permissions;
  }

  return permissions;
}

export async function getServerRoles(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } }
  });
  if (!member) throw new Error("Not a server member");

  const roles = await prisma.serverRole.findMany({
    where: { serverId },
    orderBy: { position: "desc" },
    include: {
      _count: {
        select: { members: true }
      }
    }
  });

  return roles.map(role => ({
    ...role,
    memberCount: role._count.members
  }));
}

export async function checkChannelAccess(
  serverId: string,
  channelId: string
): Promise<boolean> {
  const { userId } = auth();
  if (!userId) return false;

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { permissions: true }
  });

  if (!channel || channel.serverId !== serverId) return false;

  if (!channel.isPrivate) return true;

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    include: {
      roles: {
        include: { role: true }
      }
    }
  });

  if (!member) return false;

  if (member.role === "ADMIN") return true;
  if (member.roles.some(r =>
    (r.role.permissions & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR
  )) return true;

  const userRoleIds = member.roles.map(r => r.roleId);
  const allowedRoleIds = channel.permissions.map(p => p.roleId);

  return userRoleIds.some(roleId => allowedRoleIds.includes(roleId));
}

export async function createServerRole(
  serverId: string,
  data: {
    name: string;
    color?: string;
    iconUrl?: string;
    permissions?: bigint;
    hoist?: boolean;
    mentionable?: boolean;
  }
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to manage roles");

  const highestRole = await prisma.serverRole.findFirst({
    where: { serverId },
    orderBy: { position: "desc" }
  });

  const newPosition = highestRole ? highestRole.position + 1 : 1;

  const role = await prisma.serverRole.create({
    data: {
      serverId,
      name: data.name,
      color: data.color,
      iconUrl: data.iconUrl,
      position: newPosition,
      permissions: data.permissions ?? DEFAULT_ROLE_PERMISSIONS.MEMBER,
      hoist: data.hoist ?? false,
      mentionable: data.mentionable ?? true,
    }
  });

  revalidatePath("/servers");
  return role;
}

export async function updateServerRole(
  roleId: string,
  data: {
    name?: string;
    color?: string | null;
    iconUrl?: string | null;
    permissions?: bigint;
    hoist?: boolean;
    mentionable?: boolean;
  }
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = await prisma.serverRole.findUnique({
    where: { id: roleId },
    include: { server: true }
  });

  if (!role) throw new Error("Role not found");

  const hasPermission = await checkServerPermission(role.serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to manage roles");

  const updated = await prisma.serverRole.update({
    where: { id: roleId },
    data: {
      name: data.name,
      color: data.color,
      iconUrl: data.iconUrl,
      permissions: data.permissions,
      hoist: data.hoist,
      mentionable: data.mentionable,
    }
  });

  revalidatePath("/servers");
  return updated;
}

export async function deleteServerRole(roleId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = await prisma.serverRole.findUnique({
    where: { id: roleId },
    include: { server: true }
  });

  if (!role) throw new Error("Role not found");

  const hasPermission = await checkServerPermission(role.serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to manage roles");

  await prisma.serverRole.delete({
    where: { id: roleId }
  });

  revalidatePath("/servers");
}

export async function reorderServerRoles(
  serverId: string,
  roleOrders: { id: string; position: number }[]
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to manage roles");

  await prisma.$transaction(
    roleOrders.map(({ id, position }) =>
      prisma.serverRole.update({
        where: { id, serverId },
        data: { position }
      })
    )
  );

  revalidatePath("/servers");
}

export async function assignRoleToMember(
  serverId: string,
  targetUserId: string,
  roleId: string
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to assign roles");

  const targetMember = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: targetUserId } }
  });

  if (!targetMember) throw new Error("Member not found");

  const role = await prisma.serverRole.findUnique({
    where: { id: roleId, serverId }
  });

  if (!role) throw new Error("Role not found");

  const existing = await prisma.serverMemberRole.findUnique({
    where: {
      memberId_roleId: {
        memberId: targetMember.id,
        roleId
      }
    }
  });

  if (existing) return existing;

  const memberRole = await prisma.serverMemberRole.create({
    data: {
      memberId: targetMember.id,
      roleId,
      assignedBy: userId
    },
    include: { role: true }
  });

  revalidatePath("/servers");
  return memberRole;
}

export async function removeRoleFromMember(
  serverId: string,
  targetUserId: string,
  roleId: string
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to remove roles");

  const targetMember = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: targetUserId } }
  });

  if (!targetMember) throw new Error("Member not found");

  await prisma.serverMemberRole.deleteMany({
    where: {
      memberId: targetMember.id,
      roleId
    }
  });

  revalidatePath("/servers");
}

export async function getMemberRoles(serverId: string, targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const callerMember = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } }
  });

  if (!callerMember) throw new Error("Not a server member");

  const targetMember = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: targetUserId } },
    include: {
      roles: {
        include: { role: true },
        orderBy: { role: { position: "desc" } }
      }
    }
  });

  if (!targetMember) throw new Error("Member not found");

  return targetMember.roles.map(mr => mr.role);
}

export async function getServerSettings(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } }
  });

  if (!member) throw new Error("Not a server member");

  let settings = await prisma.serverSettings.findUnique({
    where: { serverId }
  });

  if (!settings) {
    settings = await prisma.serverSettings.create({
      data: { serverId }
    });
  }

  return settings;
}

export async function updateServerSettings(
  serverId: string,
  data: {
    memberSortOrder?: string;
    showRoleBadges?: boolean;
    allowMemberReordering?: boolean;
  }
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(
    serverId,
    ROLE_PERMISSIONS.MANAGE_SERVER | ROLE_PERMISSIONS.ADMINISTRATOR
  );
  if (!hasPermission) throw new Error("You don't have permission to manage server settings");

  const settings = await prisma.serverSettings.upsert({
    where: { serverId },
    create: {
      serverId,
      memberSortOrder: data.memberSortOrder,
      showRoleBadges: data.showRoleBadges,
      allowMemberReordering: data.allowMemberReordering,
    },
    update: {
      memberSortOrder: data.memberSortOrder,
      showRoleBadges: data.showRoleBadges,
      allowMemberReordering: data.allowMemberReordering,
    }
  });

  revalidatePath("/servers");
  return settings;
}

export async function updateMemberSortOrder(
  serverId: string,
  targetUserId: string,
  newSortOrder: number
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const settings = await prisma.serverSettings.findUnique({
    where: { serverId }
  });

  if (!settings?.allowMemberReordering) {
    throw new Error("Manual member reordering is disabled");
  }

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to reorder members");

  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId: targetUserId } },
    data: { sortOrder: newSortOrder }
  });

  revalidatePath("/servers");
}

export async function initializeDefaultRoles(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existingRoles = await prisma.serverRole.count({
    where: { serverId }
  });

  if (existingRoles > 0) return;

  await prisma.$transaction([
    prisma.serverRole.create({
      data: {
        serverId,
        name: "Admin",
        color: "#FFD700",
        position: 3,
        permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
        hoist: true,
        mentionable: true,
      }
    }),
    prisma.serverRole.create({
      data: {
        serverId,
        name: "Moderator",
        color: "#4169E1",
        position: 2,
        permissions: DEFAULT_ROLE_PERMISSIONS.MODERATOR,
        hoist: true,
        mentionable: true,
      }
    }),
    prisma.serverRole.create({
      data: {
        serverId,
        name: "Member",
        color: "#808080",
        position: 1,
        permissions: DEFAULT_ROLE_PERMISSIONS.MEMBER,
        hoist: false,
        mentionable: true,
      }
    })
  ]);
}
