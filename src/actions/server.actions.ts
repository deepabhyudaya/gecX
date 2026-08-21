"use server";

import prisma from "../lib/prisma";
import { Prisma } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { recordKarmaEarned } from "./karma-tracking.actions";
import { getKarmaSettings } from "./karma-settings.actions";
import { recordUserActivity } from "./streak-tracking.actions";
import { ablyPublish, getServerChannelName } from "@/lib/ably-server";
import { ROLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../lib/role-permissions";
import { checkServerPermission, getUserServerPermissions } from "./role.actions";

type ServerRole = "ADMIN" | "MODERATOR" | "MEMBER";

type ServerTemplate = "CUSTOM" | "CLASS_SERVER" | "STUDY_GROUP";

const TEMPLATE_CHANNELS: Record<ServerTemplate, string[]> = {
  CUSTOM: ["general"],
  CLASS_SERVER: ["general", "announcements", "homework-help", "questions"],
  STUDY_GROUP: ["general", "resources", "questions", "schedule"],
};

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function getUserDetails(userId: string) {
  const student = await prisma.student.findUnique({ where: { id: userId } });
  if (student) return { role: "student", username: student.username, displayName: `${student.name} ${student.surname}`.trim() };

  const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
  if (teacher) return { role: "teacher", username: teacher.username, displayName: `${teacher.name} ${teacher.surname}`.trim() };

  const parent = await prisma.parent.findUnique({ where: { id: userId } });
  if (parent) return { role: "parent", username: parent.username, displayName: `${parent.name} ${parent.surname}`.trim() };

  const admin = await prisma.admin.findUnique({ where: { id: userId } });
  if (admin) return { role: "admin", username: admin.username, displayName: "Admin" };

  return null;
}

export async function createServer(name: string, description: string, template: ServerTemplate = "CUSTOM") {
  const { userId } = auth();
  const user = await currentUser();
  const clerkRole = (user?.publicMetadata as { role?: string })?.role || "student";

  if (!userId || !user) throw new Error("Unauthorized");

  const userDetails = await getUserDetails(userId);
  if (!userDetails) throw new Error("User not found");

  const inviteCode = generateInviteCode();
  const channelsToCreate = TEMPLATE_CHANNELS[template];

  const server = await prisma.server.create({
    data: {
      name,
      description,
      inviteCode,
      createdById: userId,
      members: {
        create: {
          userId,
          role: "ADMIN",
          username: userDetails.username,
          displayName: userDetails.displayName,
        },
      },
      channels: {
        create: channelsToCreate.map((name, index) => ({
          name,
          order: index,
        })),
      },
    },
    include: {
      channels: true,
      members: true,
    },
  });

  revalidatePath("/servers");
  return { id: server.id, inviteCode: server.inviteCode, channels: server.channels };
}

export async function joinServerByCode(inviteCode: string) {
  const { userId } = auth();
  const user = await currentUser();
  if (!userId || !user) throw new Error("Unauthorized");

  const userDetails = await getUserDetails(userId);
  if (!userDetails) throw new Error("User not found");

  const server = await prisma.server.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    include: { members: true },
  });

  if (!server) throw new Error("Server not found");

  const existingMember = server.members.find((m) => m.userId === userId);
  if (existingMember) return { serverId: server.id, alreadyMember: true };

  const existingBan = await prisma.serverBan.findUnique({
    where: { serverId_userId: { serverId: server.id, userId } },
  });
  if (existingBan) throw new Error("You are banned from this server");

  await prisma.serverMember.create({
    data: {
      serverId: server.id,
      userId,
      role: "MEMBER",
      username: userDetails.username,
      displayName: userDetails.displayName,
    },
  });

  revalidatePath("/servers");
  return { serverId: server.id, alreadyMember: false };
}

export async function getMyServers() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const memberships = await prisma.serverMember.findMany({
    where: { userId },
    include: {
      server: {
        include: {
          channels: {
            orderBy: { order: "asc" },
          },
          members: true,
          _count: {
            select: { members: true },
          },
        },
      },
      roles: {
        include: { role: true },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const allChannelIds: string[] = [];
  const channelToServerMap = new Map<string, string>();
  const channelToLastReadMap = new Map<string, Date>();

  for (const membership of memberships) {
    for (const channel of membership.server.channels) {
      allChannelIds.push(channel.id);
      channelToServerMap.set(channel.id, membership.serverId);
      channelToLastReadMap.set(channel.id, membership.lastReadAt);
    }
  }

  let unreadRows: any[] = [];
  if (allChannelIds.length > 0) {
    unreadRows = await prisma.serverMessage.groupBy({
      by: ["channelId"],
      where: {
        channelId: { in: allChannelIds },
        senderId: { not: userId },
      },
      _count: { id: true },
    });
  }

  const serverUnreadMap = new Map<string, number>();
  for (const row of unreadRows) {
    const serverId = channelToServerMap.get(row.channelId)!;
    const currentCount = serverUnreadMap.get(serverId) || 0;
    serverUnreadMap.set(serverId, currentCount + row._count.id);
  }

  const serversWithData = memberships.map((membership) => {
    let permissions = 0n;
    if (membership.role === "ADMIN") {
      permissions = BigInt(DEFAULT_ROLE_PERMISSIONS.ADMIN);
    } else {
      for (const memberRole of membership.roles) {
        permissions |= memberRole.role.permissions;
      }
    }

    return {
      ...membership.server,
      myRole: membership.role,
      myPermissions: permissions.toString(),
      isMuted: membership.isMuted,
      unreadCount: serverUnreadMap.get(membership.serverId) ?? 0,
    };
  });

  return serversWithData;
}

export async function getDiscoverableServers() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const myServerIds = await prisma.serverMember.findMany({
    where: { userId },
    select: { serverId: true },
  });

  const myIds = new Set(myServerIds.map((s) => s.serverId));

  const servers = await prisma.server.findMany({
    where: {
      isDiscoverable: true,
    },
    include: {
      members: true,
      _count: {
        select: { members: true, channels: true },
      },
    },
    orderBy: {
      bumps: 'desc',
    },
  });

  return servers.map((s) => ({
    ...s,
    memberCount: s._count.members,
    channelCount: s._count.channels,
    isJoined: myIds.has(s.id),
  }));
}

const BUMP_COOLDOWN_HOURS = 2;

export async function getServerBumpCooldown(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { lastBumpedAt: true },
  });

  if (!server || !server.lastBumpedAt) {
    return { canBump: true, remainingMinutes: 0 };
  }

  const lastBump = new Date(server.lastBumpedAt);
  const now = new Date();
  const hoursSinceLastBump = (now.getTime() - lastBump.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastBump >= BUMP_COOLDOWN_HOURS) {
    return { canBump: true, remainingMinutes: 0 };
  }

  const remainingMinutes = Math.ceil((BUMP_COOLDOWN_HOURS - hoursSinceLastBump) * 60);
  return { canBump: false, remainingMinutes };
}

export async function bumpServer(serverId: string, channelId: string) {
  const { userId } = auth();
  const user = await currentUser();
  if (!userId || !user) throw new Error("Unauthorized");

  const membership = await prisma.serverMember.findUnique({
    where: {
      serverId_userId: {
        serverId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new Error("You must be a member of the server to bump it");
  }

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: {
      id: true,
      name: true,
      bumps: true,
      lastBumpedAt: true,
      createdById: true,
    },
  });

  if (!server) {
    throw new Error("Server not found");
  }

  if (server.lastBumpedAt) {
    const lastBump = new Date(server.lastBumpedAt);
    const now = new Date();
    const hoursSinceLastBump = (now.getTime() - lastBump.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastBump < BUMP_COOLDOWN_HOURS) {
      const remainingMinutes = Math.ceil((BUMP_COOLDOWN_HOURS - hoursSinceLastBump) * 60);
      throw new Error(`Server can be bumped again in ${remainingMinutes} minutes`);
    }
  }

  const updatedServer = await prisma.server.update({
    where: { id: serverId },
    data: {
      bumps: { increment: 1 },
      lastBumpedAt: new Date(),
    },
  });

  const settings = await getKarmaSettings();
  if (server.createdById !== userId) {
    await recordKarmaEarned(server.createdById, settings.serverBumpReceived, "server_bump_received");
  }

  const hoursUntilNextBump = BUMP_COOLDOWN_HOURS;
  const nextBumpTime = new Date(Date.now() + hoursUntilNextBump * 60 * 60 * 1000);
  const nextBumpTimeStr = nextBumpTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  await prisma.serverMessage.create({
    data: {
      content: `🚀 **${membership.displayName}** bumped the server!\n📊 This server now has **${updatedServer.bumps}** bumps and is trending higher in discover.\n⏰ Next bump available at ${nextBumpTimeStr}`,
      channelId,
      senderId: "system",
      senderUsername: "System",
      senderRole: "SYSTEM",
      messageType: "SYSTEM",
    },
  });

  revalidatePath("/servers/discover");
  revalidatePath("/servers");

  return {
    success: true,
    bumps: updatedServer.bumps,
    nextBumpTime: nextBumpTimeStr,
  };
}

export async function getServerChannels(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
    include: {
      roles: {
        include: { role: true }
      }
    }
  });

  if (!member) throw new Error("You are not a member of this server");

  const isAdmin = member.role === "ADMIN" || member.roles.some(r =>
    (r.role.permissions & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR
  );

  if (isAdmin) {
    const channels = await prisma.serverChannel.findMany({
      where: { serverId },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
    return channels;
  }

  const userRoleIds = member.roles.map(r => r.roleId);

  const channels = await prisma.serverChannel.findMany({
    where: { serverId },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: { messages: true },
      },
      permissions: true,
    },
  });

  const visibleChannels = channels.filter(channel => {

    if (!channel.isPrivate) return true;

    if (channel.permissions.length === 0) return false;

    const allowedRoleIds = channel.permissions.map(p => p.roleId);
    return userRoleIds.some(roleId => allowedRoleIds.includes(roleId));
  });

  return visibleChannels;
}

export async function createChannel(
  serverId: string,
  name: string,
  options?: {
    isPrivate?: boolean;
    allowedRoleIds?: string[];
    categoryId?: string;
  }
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!member || member.role !== "ADMIN") {
    throw new Error("Only admins can create channels");
  }

  const maxOrder = await prisma.serverChannel.findFirst({
    where: { serverId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const isPrivate = options?.isPrivate ?? false;
  const allowedRoleIds = options?.allowedRoleIds ?? [];
  const categoryId = options?.categoryId;

  const channel = await prisma.serverChannel.create({
    data: {
      serverId,
      name,
      order: (maxOrder?.order ?? -1) + 1,
      isPrivate,
      categoryId,
      ...(isPrivate && allowedRoleIds.length > 0 && {
        permissions: {
          create: allowedRoleIds.map(roleId => ({
            roleId
          }))
        }
      }),
    },
    include: {
      permissions: true,
    }
  });

  revalidatePath("/servers");
  return channel;
}

export async function deleteChannel(channelId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { server: { include: { members: true } } },
  });

  if (!channel) throw new Error("Channel not found");

  const member = channel.server.members.find((m) => m.userId === userId);
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only admins can delete channels");
  }

  await prisma.serverChannel.delete({ where: { id: channelId } });

  revalidatePath("/servers");
}

export async function updateChannel(channelId: string, name: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { server: { include: { members: true } } },
  });

  if (!channel) throw new Error("Channel not found");

  const member = channel.server.members.find((m) => m.userId === userId);
  if (!member || member.role !== "ADMIN") {
    throw new Error("Only admins can edit channels");
  }

  const sanitizedName = name.replace(/\s+/g, "-").toLowerCase();

  await prisma.serverChannel.update({
    where: { id: channelId },
    data: { name: sanitizedName },
  });

  revalidatePath("/servers");
}

export async function getServerCategories(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!member) throw new Error("You are not a member of this server");

  const categories = await prisma.serverChannelCategory.findMany({
    where: { serverId },
    orderBy: { order: "asc" },
    include: {
      channels: {
        orderBy: { order: "asc" },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      },
    },
  });

  return categories;
}

async function canManageChannels(serverId: string): Promise<boolean> {
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

  if (member.role === "ADMIN" || member.role === "MODERATOR") return true;

  return member.roles.some(r =>
    (r.role.permissions & ROLE_PERMISSIONS.MANAGE_CHANNELS) === ROLE_PERMISSIONS.MANAGE_CHANNELS ||
    (r.role.permissions & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR
  );
}

export async function createCategory(serverId: string, name: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (!await canManageChannels(serverId)) {
    throw new Error("You don't have permission to create categories");
  }

  const maxOrder = await prisma.serverChannelCategory.findFirst({
    where: { serverId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const category = await prisma.serverChannelCategory.create({
    data: {
      serverId,
      name,
      order: (maxOrder?.order ?? -1) + 1,
    },
  });

  revalidatePath("/servers");
  return category;
}

export async function updateCategory(categoryId: string, name: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const category = await prisma.serverChannelCategory.findUnique({
    where: { id: categoryId },
    include: { server: true },
  });

  if (!category) throw new Error("Category not found");

  if (!await canManageChannels(category.serverId)) {
    throw new Error("You don't have permission to update categories");
  }

  const updated = await prisma.serverChannelCategory.update({
    where: { id: categoryId },
    data: { name },
  });

  revalidatePath("/servers");
  return updated;
}

export async function deleteCategory(categoryId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const category = await prisma.serverChannelCategory.findUnique({
    where: { id: categoryId },
    include: { server: true },
  });

  if (!category) throw new Error("Category not found");

  if (!await canManageChannels(category.serverId)) {
    throw new Error("You don't have permission to delete categories");
  }

  await prisma.serverChannelCategory.delete({ where: { id: categoryId } });

  revalidatePath("/servers");
}

export async function moveChannelToCategory(channelId: string, categoryId: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { server: true },
  });

  if (!channel) throw new Error("Channel not found");

  if (!await canManageChannels(channel.serverId)) {
    throw new Error("You don't have permission to move channels");
  }

  if (categoryId) {
    const category = await prisma.serverChannelCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.serverId !== channel.serverId) {
      throw new Error("Category not found");
    }
  }

  await prisma.serverChannel.update({
    where: { id: channelId },
    data: { categoryId },
  });

  revalidatePath("/servers");
}

export async function getServerMessages(channelId: string, limit: number = 50, before?: Date) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { server: { include: { members: true } } },
  });

  if (!channel) throw new Error("Channel not found");

  const member = channel.server.members.find((m) => m.userId === userId);
  if (!member) throw new Error("You are not a member of this server");

  const where: any = { channelId };
  if (before) {
    where.createdAt = { lt: before };
  }

  const messages = await prisma.serverMessage.findMany({
    where,
    include: {
      reactions: true,
      poll: {
        include: {
          options: true,
          votes: true,
        },
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
          senderUsername: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const senderIds = [...new Set(messages.map((m) => m.senderId).filter((id) => id && id !== "system"))];

  const [karmaProfiles, equippedColors, communityProfiles] = await Promise.all([
    prisma.userCommunityProfile.findMany({
      where: { userId: { in: senderIds } },
      select: { userId: true, karmaPoints: true },
    }),
    prisma.userEquippedColors.findMany({
      where: { userId: { in: senderIds } },
      include: { usernameColorItem: true, nameplateItem: true },
    }),
    prisma.userCommunityProfile.findMany({
      where: { userId: { in: senderIds } },
      select: { userId: true, avatar: true, customAvatar: true, currentStreak: true },
    }),
  ]);

  const karmaMap = new Map(karmaProfiles.map((p) => [p.userId, p.karmaPoints]));
  const colorMap = new Map(equippedColors.map((e) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColors.map((e) => [e.userId, e.nameplateItem?.colorValue || null]));
  const avatarMap = new Map(communityProfiles.map((p: any) => [p.userId, p.avatar || null]));
  const customAvatarMap = new Map(communityProfiles.map((p: any) => [p.userId, p.customAvatar || null]));
  const streakMap = new Map(communityProfiles.map((p: any) => [p.userId, p.currentStreak || 0]));

  return messages.reverse().map((msg) => ({
    ...msg,
    senderKarma: karmaMap.get(msg.senderId) ?? 0,
    senderStreak: streakMap.get(msg.senderId) ?? 0,
    senderColor: colorMap.get(msg.senderId) || null,
    senderNameplate: nameplateMap.get(msg.senderId) || null,
    senderAvatar: avatarMap.get(msg.senderId) || null,
    senderCustomAvatar: customAvatarMap.get(msg.senderId) || null,
  }));
}

export async function sendServerMessage(channelId: string, content: string, replyToId?: string) {
  const { userId } = auth();
  const user = await currentUser();
  const clerkRole = (user?.publicMetadata as { role?: string })?.role || "student";

  if (!userId || !user) throw new Error("Unauthorized");

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { server: { include: { members: true } } },
  });

  if (!channel) throw new Error("Channel not found");

  const member = channel.server.members.find((m) => m.userId === userId);
  if (!member) throw new Error("You are not a member of this server");
  if (member.isMuted) throw new Error("You are muted in this server");

  const canSend = await checkServerPermission(channel.server.id, ROLE_PERMISSIONS.SEND_MESSAGES);
  const isLegacyAdmin = member.role === "ADMIN";
  if (!canSend && !isLegacyAdmin) {
    throw new Error("You don't have permission to send messages in this server");
  }

  const msg = await prisma.serverMessage.create({
    data: {
      content,
      channelId,
      senderId: userId,
      senderUsername: member.username,
      senderRole: clerkRole,
      replyToId: replyToId || null,
    },
    include: { reactions: true },
  });

  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.messageSent, "server_message_sent");
  await recordUserActivity(userId, "message");

  await ablyPublish(getServerChannelName(channel.server.id, channelId), {
    type: "message:new",
    message: msg,
  });

  revalidatePath("/servers");
  return msg;
}

export async function sendServerPoll(channelId: string, question: string, options: string[], replyToId?: string) {
  const { userId } = auth();
  const user = await currentUser();
  const clerkRole = (user?.publicMetadata as { role?: string })?.role || "student";

  if (!userId || !user) throw new Error("Unauthorized");

  if (!question.trim()) throw new Error("Question is required");
  const cleaned = options.map((o) => o.trim()).filter(Boolean);
  if (cleaned.length < 2) throw new Error("At least 2 options are required");

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { server: { include: { members: true } } },
  });

  if (!channel) throw new Error("Channel not found");

  const member = channel.server.members.find((m) => m.userId === userId);
  if (!member) throw new Error("You are not a member of this server");
  if (member.isMuted) throw new Error("You are muted in this server");

  const msg = await prisma.serverMessage.create({
    data: {
      content: question,
      channelId,
      senderId: userId,
      senderUsername: member.username,
      senderRole: clerkRole,
      replyToId: replyToId || null,
      poll: {
        create: {
          question,
          options: {
            create: cleaned.map((text) => ({ text })),
          },
        },
      },
    },
    include: {
      reactions: true,
      poll: { include: { options: true, votes: true } },
    },
  });

  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.messageSent, "server_poll_sent");
  await recordUserActivity(userId, "message");

  revalidatePath("/servers");
  return msg;
}

export async function sendServerCommandMessage(channelId: string, label: string, url: string, replyToId?: string) {
  const { userId } = auth();
  const user = await currentUser();
  const clerkRole = (user?.publicMetadata as { role?: string })?.role || "student";

  if (!userId || !user) throw new Error("Unauthorized");

  const channel = await prisma.serverChannel.findUnique({
    where: { id: channelId },
    include: { server: { include: { members: true } } },
  });

  if (!channel) throw new Error("Channel not found");

  const member = channel.server.members.find((m) => m.userId === userId);
  if (!member) throw new Error("You are not a member of this server");
  if (member.isMuted) throw new Error("You are muted in this server");

  const msg = await prisma.serverMessage.create({
    data: {
      content: label,
      channelId,
      senderId: userId,
      senderUsername: member.username,
      senderRole: clerkRole,
      messageType: "COMMAND",
      commandKey: "ticket",
      commandLabel: label,
      commandUrl: url,
      replyToId: replyToId || null,
    },
  });

  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.messageSent, "server_command_sent");

  revalidatePath("/servers");
  return msg;
}

export async function deleteServerMessage(messageId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const msg = await prisma.serverMessage.findUnique({
    where: { id: messageId },
    include: { channel: { include: { server: { include: { members: true } } } } },
  });

  if (!msg) throw new Error("Message not found");

  const member = msg.channel.server.members.find((m) => m.userId === userId);
  if (!member) throw new Error("Unauthorized");

  const isOwner = msg.senderId === userId;
  const serverId = msg.channel.server.id;

  const canManageMessages = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_MESSAGES);
  const isLegacyAdmin = member.role === "ADMIN";

  if (isOwner || canManageMessages || isLegacyAdmin) {
    await prisma.serverMessage.delete({ where: { id: messageId } });

    await ablyPublish(getServerChannelName(serverId, msg.channelId), {
      type: "message:delete",
      messageId,
    });

    revalidatePath("/servers");
    return { success: true };
  }

  throw new Error("Unauthorized");
}

export async function toggleServerMessageReaction(messageId: string, emoji: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await prisma.serverMessageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji,
      },
    },
  });

  let eventType: "reaction:add" | "reaction:remove";
  let channelId: string | null = null;

  if (existing) {
    await prisma.serverMessageReaction.delete({
      where: { id: existing.id },
    });
    eventType = "reaction:remove";
  } else {
    await prisma.serverMessageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });

    const message = await prisma.serverMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, channelId: true },
    });
    if (message) {
      channelId = message.channelId;
      if (message.senderId !== userId) {
        const settings = await getKarmaSettings();
        await recordKarmaEarned(message.senderId, settings.messageReactionReceived, "server_message_reaction");
      }
    }
    eventType = "reaction:add";
  }

  if (!channelId) {
    const msg = await prisma.serverMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });
    if (msg) channelId = msg.channelId;
  }

  if (channelId) {
    const ch = await prisma.serverChannel.findUnique({
      where: { id: channelId },
      select: { serverId: true },
    });
    if (ch) {
      await ablyPublish(getServerChannelName(ch.serverId, channelId), {
        type: eventType,
        messageId,
        emoji,
        userId,
      });
    }
  }

  revalidatePath("/servers");
}

export async function getServerMembers(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!member) throw new Error("You are not a member of this server");

  const members = await prisma.serverMember.findMany({
    where: { serverId },
    orderBy: [
      { role: "asc" },
      { joinedAt: "asc" },
    ],
    include: {
      roles: {
        include: { role: true },
        orderBy: { role: { position: "desc" } },
      },
    },
  });

  const userIds = members.map(m => m.userId);
  const [karmaProfiles, equippedColors, communityProfiles] = await Promise.all([
    prisma.userCommunityProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, karmaPoints: true },
    }),
    prisma.userEquippedColors.findMany({
      where: { userId: { in: userIds } },
      include: { usernameColorItem: true, nameplateItem: true },
    }),
    prisma.userCommunityProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, avatar: true, customAvatar: true, currentStreak: true },
    }),
  ]);

  const karmaMap = new Map(karmaProfiles.map(p => [p.userId, p.karmaPoints]));
  const colorMap = new Map(equippedColors.map(e => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColors.map(e => [e.userId, e.nameplateItem?.colorValue || null]));
  const avatarMap = new Map(communityProfiles.map(p => [p.userId, p.avatar || null]));
  const customAvatarMap = new Map(communityProfiles.map(p => [p.userId, p.customAvatar || null]));
  const streakMap = new Map(communityProfiles.map(p => [p.userId, p.currentStreak || 0]));

  return members.map(m => ({
    ...m,
    karmaPoints: karmaMap.get(m.userId) || 0,
    equippedColor: colorMap.get(m.userId) || null,
    equippedNameplate: nameplateMap.get(m.userId) || null,
    avatar: avatarMap.get(m.userId) || null,
    customAvatar: customAvatarMap.get(m.userId) || null,
    currentStreak: streakMap.get(m.userId) || 0,
    roles: m.roles.map((mr: any) => ({
      id: mr.id,
      role: {
        id: mr.role.id,
        name: mr.role.name,
        color: mr.role.color,
        iconUrl: mr.role.iconUrl,
        position: mr.role.position,
      },
    })),
  }));
}

export async function updateMemberRole(serverId: string, targetUserId: string, newRole: "ADMIN" | "MODERATOR" | "MEMBER") {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_ROLES);
  const me = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!hasPermission && (!me || me.role !== "ADMIN")) {
    throw new Error("You don't have permission to assign roles");
  }

  const target = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: targetUserId } },
  });

  if (!target) throw new Error("Member not found");
  if (target.role === "ADMIN") throw new Error("Cannot change admin's role");

  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId: targetUserId } },
    data: { role: newRole },
  });

  revalidatePath("/servers");
}

export async function kickServerMember(serverId: string, targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.KICK_MEMBERS);
  const me = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!hasPermission && (!me || (me.role !== "ADMIN" && me.role !== "MODERATOR"))) {
    throw new Error("You don't have permission to kick members");
  }

  const target = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: targetUserId } },
  });

  if (!target) throw new Error("Member not found");
  if (target.role === "ADMIN") throw new Error("Cannot kick the admin");
  if (me?.role === "MODERATOR" && target.role === "MODERATOR") {
    throw new Error("Moderators cannot kick other moderators");
  }

  await prisma.serverMember.delete({
    where: { serverId_userId: { serverId, userId: targetUserId } },
  });

  revalidatePath("/servers");
}

export async function banServerMember(serverId: string, targetUserId: string, reason?: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.BAN_MEMBERS);
  const me = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!hasPermission && (!me || (me.role !== "ADMIN" && me.role !== "MODERATOR"))) {
    throw new Error("You don't have permission to ban members");
  }

  const target = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: targetUserId } },
  });

  if (!target) throw new Error("Member not found");
  if (target.role === "ADMIN") throw new Error("Cannot ban the admin");
  if (me?.role === "MODERATOR" && target.role === "MODERATOR") {
    throw new Error("Moderators cannot ban other moderators");
  }

  await prisma.$transaction([
    prisma.serverBan.upsert({
      where: { serverId_userId: { serverId, userId: targetUserId } },
      update: { reason, bannedById: userId },
      create: { serverId, userId: targetUserId, reason, bannedById: userId },
    }),
    prisma.serverMember.delete({
      where: { serverId_userId: { serverId, userId: targetUserId } },
    }),
  ]);

  revalidatePath("/servers");
}

export async function unbanServerMember(serverId: string, targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.BAN_MEMBERS);
  const me = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!hasPermission && (!me || (me.role !== "ADMIN" && me.role !== "MODERATOR"))) {
    throw new Error("You don't have permission to unban members");
  }

  await prisma.serverBan.deleteMany({
    where: { serverId, userId: targetUserId },
  });

  revalidatePath("/servers");
}

export async function getServerBans(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });
  if (!member) throw new Error("You are not a member of this server");

  const bans = await prisma.serverBan.findMany({
    where: { serverId },
    orderBy: { bannedAt: "desc" },
  });

  return bans;
}

export async function toggleMuteServerMember(serverId: string, targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MUTE_MEMBERS);
  const me = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!hasPermission && (!me || (me.role !== "ADMIN" && me.role !== "MODERATOR"))) {
    throw new Error("You don't have permission to mute members");
  }

  const target = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: targetUserId } },
  });

  if (!target) throw new Error("Member not found");
  if (target.role === "ADMIN") throw new Error("Cannot mute the admin");
  if (me?.role === "MODERATOR" && target.role === "MODERATOR") {
    throw new Error("Moderators cannot mute other moderators");
  }

  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId: targetUserId } },
    data: { isMuted: !target.isMuted },
  });

  revalidatePath("/servers");
}

export async function leaveServer(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!member) throw new Error("You are not a member of this server");
  if (member.role === "ADMIN") throw new Error("Admin cannot leave the server. Transfer ownership first.");

  await prisma.serverMember.delete({
    where: { serverId_userId: { serverId, userId } },
  });

  revalidatePath("/servers");
}

export async function transferServerOwnership(serverId: string, newOwnerId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const me = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!me || me.role !== "ADMIN") {
    throw new Error("Only the admin can transfer ownership");
  }

  const newOwner = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId: newOwnerId } },
  });

  if (!newOwner) throw new Error("Target user is not a member");

  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId } },
    data: { role: "MEMBER" },
  });

  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId: newOwnerId } },
    data: { role: "ADMIN" },
  });

  await prisma.server.update({
    where: { id: serverId },
    data: { createdById: newOwnerId },
  });

  revalidatePath("/servers");
}

export async function deleteServer(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    include: { members: true },
  });

  if (!server) throw new Error("Server not found");

  if (server.createdById !== userId) {
    throw new Error("Only the server creator can delete the server");
  }

  await prisma.$transaction([
    prisma.serverMessageReaction.deleteMany({
      where: { message: { channel: { serverId } } },
    }),
    prisma.pollVote.deleteMany({
      where: { poll: { serverMessage: { channel: { serverId } } } },
    }),
    prisma.pollOption.deleteMany({
      where: { poll: { serverMessage: { channel: { serverId } } } },
    }),
    prisma.poll.deleteMany({
      where: { serverMessage: { channel: { serverId } } },
    }),
    prisma.serverMessage.deleteMany({
      where: { channel: { serverId } },
    }),
    prisma.serverChannel.deleteMany({
      where: { serverId },
    }),
    prisma.serverMember.deleteMany({
      where: { serverId },
    }),
    prisma.server.delete({
      where: { id: serverId },
    }),
  ]);

  revalidatePath("/servers");
  revalidatePath("/servers/discover");
}

export async function toggleServerDiscoverable(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const hasPermission = await checkServerPermission(serverId, ROLE_PERMISSIONS.MANAGE_SERVER);
  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!hasPermission && (!member || member.role !== "ADMIN")) {
    throw new Error("You don't have permission to change server visibility");
  }

  const server = await prisma.server.findUnique({
    where: { id: serverId },
    select: { isDiscoverable: true },
  });

  if (!server) throw new Error("Server not found");

  await prisma.server.update({
    where: { id: serverId },
    data: { isDiscoverable: !server.isDiscoverable },
  });

  revalidatePath("/servers");
  revalidatePath("/servers/discover");
  return { isDiscoverable: !server.isDiscoverable };
}

export async function updateServerInfo(serverId: string, name: string, description?: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!member || member.role !== "ADMIN") {
    throw new Error("Only admins can update server info");
  }

  await prisma.server.update({
    where: { id: serverId },
    data: {
      name,
      description: description || null,
    },
  });

  revalidatePath("/servers");
}

export async function regenerateInviteCode(serverId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.serverMember.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  if (!member || member.role !== "ADMIN") {
    throw new Error("Only admins can regenerate invite code");
  }

  const newCode = generateInviteCode();

  await prisma.server.update({
    where: { id: serverId },
    data: { inviteCode: newCode },
  });

  revalidatePath("/servers");
  return { inviteCode: newCode };
}

export async function markServerAsRead(serverId: string) {
  const { userId } = auth();
  if (!userId) return;

  await prisma.serverMember.update({
    where: { serverId_userId: { serverId, userId } },
    data: { lastReadAt: new Date() },
  });
}
