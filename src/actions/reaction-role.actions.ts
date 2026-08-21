"use server";

import prisma from "../lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { checkServerPermission } from "./role.actions";
import { ROLE_PERMISSIONS } from "../lib/role-permissions";

export async function createReactionRole(
  serverId: string,
  data: {
    channelId: string;
    messageId: string;
    emoji: string;
    roleId: string;
    maxUses?: number;
  }
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.CREATE_REACTION_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to create reaction roles");

  const role = await prisma.serverRole.findUnique({
    where: { id: data.roleId, serverId }
  });

  if (!role) throw new Error("Role not found in this server");

  const existing = await prisma.reactionRole.findFirst({
    where: {
      serverId,
      messageId: data.messageId,
      emoji: data.emoji
    }
  });

  if (existing) throw new Error("This emoji is already a reaction role for this message");

  const reactionRole = await prisma.reactionRole.create({
    data: {
      serverId,
      channelId: data.channelId,
      messageId: data.messageId,
      emoji: data.emoji,
      roleId: data.roleId,
      maxUses: data.maxUses,
      createdById: userId
    },
    include: { role: true }
  });

  return reactionRole;
}

export async function deleteReactionRole(reactionRoleId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const reactionRole = await prisma.reactionRole.findUnique({
    where: { id: reactionRoleId },
    include: { server: true }
  });

  if (!reactionRole) throw new Error("Reaction role not found");

  const hasPermission = await checkServerPermission(
    reactionRole.serverId,
    ROLE_PERMISSIONS.CREATE_REACTION_ROLES | ROLE_PERMISSIONS.MANAGE_ROLES
  );
  if (!hasPermission) throw new Error("You don't have permission to delete reaction roles");

  await prisma.reactionRole.delete({
    where: { id: reactionRoleId }
  });

  revalidatePath("/servers");
}

export async function getReactionRoles(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } }
  });

  if (!member) throw new Error("Not a server member");

  const reactionRoles = await prisma.reactionRole.findMany({
    where: { serverId },
    include: { role: true },
    orderBy: { createdAt: "desc" }
  });

  return reactionRoles;
}

export async function getReactionRolesForMessage(messageId: string) {
  const reactionRoles = await prisma.reactionRole.findMany({
    where: { messageId },
    include: { role: true }
  });

  return reactionRoles;
}

export async function handleReactionAdd(
  serverId: string,
  channelId: string,
  messageId: string,
  emoji: string,
  userId: string
) {
  try {

    const reactionRole = await prisma.reactionRole.findFirst({
      where: {
        serverId,
        messageId,
        emoji
      },
      include: { role: true }
    });

    if (!reactionRole) return { success: false, reason: "No reaction role found" };

    if (reactionRole.maxUses && reactionRole.useCount >= reactionRole.maxUses) {
      return { success: false, reason: "Role has reached max uses" };
    }

    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } }
    });

    if (!member) return { success: false, reason: "Not a server member" };

    const existing = await prisma.serverMemberRole.findUnique({
      where: {
        memberId_roleId: {
          memberId: member.id,
          roleId: reactionRole.roleId
        }
      }
    });

    if (existing) return { success: false, reason: "Already has this role" };

    await prisma.$transaction([
      prisma.serverMemberRole.create({
        data: {
          memberId: member.id,
          roleId: reactionRole.roleId,
          assignedBy: "system"
        }
      }),
      prisma.reactionRole.update({
        where: { id: reactionRole.id },
        data: { useCount: { increment: 1 } }
      })
    ]);

    revalidatePath("/servers");
    return { success: true, roleName: reactionRole.role.name };
  } catch (error) {
    console.error("Error handling reaction add:", error);
    return { success: false, reason: "Internal error" };
  }
}

export async function handleReactionRemove(
  serverId: string,
  messageId: string,
  emoji: string,
  userId: string
) {
  try {

    const reactionRole = await prisma.reactionRole.findFirst({
      where: {
        serverId,
        messageId,
        emoji
      }
    });

    if (!reactionRole) return { success: false };

    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } }
    });

    if (!member) return { success: false };

    await prisma.$transaction([
      prisma.serverMemberRole.deleteMany({
        where: {
          memberId: member.id,
          roleId: reactionRole.roleId
        }
      }),
      prisma.reactionRole.update({
        where: { id: reactionRole.id },
        data: { useCount: { decrement: 1 } }
      })
    ]);

    revalidatePath("/servers");
    return { success: true };
  } catch (error) {
    console.error("Error handling reaction remove:", error);
    return { success: false };
  }
}

export async function createReactionRolesBatch(
  serverId: string,
  channelId: string,
  messageId: string,
  roles: { emoji: string; roleId: string; maxUses?: number }[]
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.CREATE_REACTION_ROLES);
  if (!hasPermission) throw new Error("You don't have permission to create reaction roles");

  const roleIds = roles.map(r => r.roleId);
  const foundRoles = await prisma.serverRole.findMany({
    where: { id: { in: roleIds }, serverId }
  });

  if (foundRoles.length !== roleIds.length) {
    throw new Error("One or more roles not found in this server");
  }

  const transactionItems: any[] = [];

  for (const r of roles) {
    transactionItems.push(
      prisma.reactionRole.create({
        data: {
          serverId,
          channelId,
          messageId,
          emoji: r.emoji,
          roleId: r.roleId,
          maxUses: r.maxUses,
          createdById: userId
        },
        include: { role: true }
      })
    );

    transactionItems.push(
      prisma.serverMessageReaction.upsert({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji: r.emoji,
          }
        },
        update: {},
        create: {
          messageId,
          userId,
          emoji: r.emoji,
        }
      })
    );
  }

  const results = await prisma.$transaction(transactionItems);

  const created = results.filter((res: any) => res.roleId !== undefined);

  return created;
}
