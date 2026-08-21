"use server";

import prisma from "../lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { recordKarmaEarned } from "./karma-tracking.actions";
import { getKarmaSettings } from "./karma-settings.actions";
import { recordUserActivity } from "./streak-tracking.actions";
import { ablyPublish, getGroupChannelName } from "@/lib/ably-server";

export async function createGroup(name: string, description: string) {
  const { userId, sessionClaims } = auth();
  const user = await currentUser();
  const role = (sessionClaims?.metadata as { role?: string })?.role || "student";
  if (!userId || !user) throw new Error("Unauthorized");

  const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const group = await prisma.groupChat.create({
    data: {
      name,
      description,
      accessCode,
      createdById: userId,
      members: {
        create: {
          userId,
          userRole: role,
          username: user.username || userId,
          displayName: `${user.firstName} ${user.lastName}`.trim() || user.username || userId,
          isOwner: true,
        },
      },
    },
  });

  revalidatePath("/messages");
  return { id: group.id, accessCode: group.accessCode };
}

export async function joinGroupByCode(accessCode: string) {
  const { userId, sessionClaims } = auth();
  const user = await currentUser();
  const role = (sessionClaims?.metadata as { role?: string })?.role || "student";
  if (!userId || !user) throw new Error("Unauthorized");

  const group = await prisma.groupChat.findUnique({
    where: { accessCode },
  });

  if (!group) throw new Error("Group not found");

  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: group.id, userId },
    },
  });

  if (existingMember) return group.id;

  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId,
      userRole: role,
      username: user.username || userId,
      displayName: `${user.firstName} ${user.lastName}`.trim() || user.username || userId,
    },
  });

  revalidatePath("/messages");
  return group.id;
}

export async function addMemberToGroup(groupId: number, userIdToAdd: string) {
  const { userId: currentUserId } = auth();
  if (!currentUserId) throw new Error("Unauthorized");

  const group = await prisma.groupChat.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) throw new Error("Group not found");

  const isOwner = group.members.some((m) => m.userId === currentUserId && m.isOwner);
  if (!isOwner) throw new Error("Only group owners can add members");

  const existingMember = group.members.find((m) => m.userId === userIdToAdd);
  if (existingMember) throw new Error("User is already a member");

  const student = await prisma.student.findUnique({ where: { id: userIdToAdd } });
  const teacher = await prisma.teacher.findUnique({ where: { id: userIdToAdd } });
  const parent = await prisma.parent.findUnique({ where: { id: userIdToAdd } });
  const admin = await prisma.admin.findUnique({ where: { id: userIdToAdd } });

  let userRole = "student";
  let username = userIdToAdd;
  let displayName = userIdToAdd;

  if (student) {
    userRole = "student";
    username = student.username;
    displayName = `${student.name} ${student.surname}`.trim();
  } else if (teacher) {
    userRole = "teacher";
    username = teacher.username;
    displayName = `${teacher.name} ${teacher.surname}`.trim();
  } else if (parent) {
    userRole = "parent";
    username = parent.username;
    displayName = `${parent.name} ${parent.surname}`.trim();
  } else if (admin) {
    userRole = "admin";
    username = admin.username;
    displayName = "Admin";
  } else {
    throw new Error("User not found");
  }

  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId: userIdToAdd,
      userRole,
      username,
      displayName,
    },
  });

  revalidatePath("/messages");
  return { success: true };
}

export async function getMyGroups() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          messages: {
            include: {
              reactions: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          members: true,
        },
      },
    },
  });

  const unreadCounts = await Promise.all(
    memberships.map((m) =>
      prisma.groupMessage.count({
        where: {
          groupId: m.group.id,
          senderId: { not: userId },
          createdAt: { gt: m.lastReadAt },
        },
      })
    )
  );

  return memberships.map((m, i) => ({
    ...m.group,
    messages: m.group.messages,
    members: m.group.members,
    unreadCount: unreadCounts[i],
    isGroup: true,
  }));
}

export async function getGroupMessages(groupId: number, limit: number = 50, before?: Date) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const where: any = { groupId };
  if (before) {
    where.createdAt = { lt: before };
  }

  const messages = await prisma.groupMessage.findMany({
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
      select: { userId: true, karmaPoints: true, avatar: true, customAvatar: true },
    }),
    prisma.userEquippedColors.findMany({
      where: { userId: { in: senderIds } },
      include: { usernameColorItem: true, nameplateItem: true },
    }),

    prisma.userCommunityProfile.findMany({
      where: { userId: { in: senderIds } },
      select: { userId: true, avatar: true },
    }),
  ]);

  const karmaMap = new Map(karmaProfiles.map((p) => [p.userId, p.karmaPoints]));
  const streakMap = new Map(karmaProfiles.map((p: any) => [p.userId, p.currentStreak || 0]));
  const colorMap = new Map(equippedColors.map((e) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColors.map((e) => [e.userId, e.nameplateItem?.colorValue || null]));
  const avatarMap = new Map(communityProfiles.map((p: any) => [p.userId, p.avatar || null]));
  const customAvatarMap = new Map(communityProfiles.map((p: any) => [p.userId, p.customAvatar || null]));

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

export async function sendGroupMessage(groupId: number, content: string, replyToId?: number) {
  const { userId, sessionClaims } = auth();
  const user = await currentUser();
  const role = (sessionClaims?.metadata as { role?: string })?.role || "student";
  if (!userId || !user) throw new Error("Unauthorized");

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!member) throw new Error("You are not a member of this group.");
  if (member.isMuted) throw new Error("You are muted in this group.");

  const msg = await prisma.groupMessage.create({
    data: {
      content,
      groupId,
      senderId: userId,
      senderUsername: user.username || userId,
      senderRole: role,
      replyToId: replyToId || null,
    },
    include: { reactions: true },
  });

  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.messageSent, "group_message_sent");
  await recordUserActivity(userId, "message");

  await ablyPublish(getGroupChannelName(groupId), {
    type: "message:new",
    message: msg,
  });

  revalidatePath("/messages");
  return msg;
}

export async function sendGroupPoll(groupId: number, question: string, options: string[], replyToId?: number) {
  const { userId, sessionClaims } = auth();
  const user = await currentUser();
  const role = (sessionClaims?.metadata as { role?: string })?.role || "student";
  if (!userId || !user) throw new Error("Unauthorized");

  if (!question.trim()) throw new Error("Question is required");
  const cleaned = options.map((o) => o.trim()).filter(Boolean);
  if (cleaned.length < 2) throw new Error("At least 2 options are required");

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) throw new Error("You are not a member of this group.");
  if (member.isMuted) throw new Error("You are muted in this group.");

  const msg = await prisma.groupMessage.create({
    data: {
      content: question,
      groupId,
      senderId: userId,
      senderUsername: user.username || userId,
      senderRole: role,
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
  await recordKarmaEarned(userId, settings.messageSent, "group_poll_sent");
  await recordUserActivity(userId, "message");

  revalidatePath("/messages");
  return msg;
}

export async function sendGroupCommandMessage(
  groupId: number,
  label: string,
  url: string,
  replyToId?: number
) {
  const { userId, sessionClaims } = auth();
  const user = await currentUser();
  const role = (sessionClaims?.metadata as { role?: string })?.role || "student";
  if (!userId || !user) throw new Error("Unauthorized");

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) throw new Error("You are not a member of this group.");
  if (member.isMuted) throw new Error("You are muted in this group.");

  const msg = await prisma.groupMessage.create({
    data: {
      content: label,
      groupId,
      senderId: userId,
      senderUsername: user.username || userId,
      senderRole: role,
      messageType: "COMMAND",
      commandKey: "ticket",
      commandLabel: label,
      commandUrl: url,
      replyToId: replyToId || null,
    },
  });

  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.messageSent, "group_command_sent");

  revalidatePath("/messages");
  return msg;
}

export async function deleteGroupMessage(messageId: number) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const msg = await prisma.groupMessage.findUnique({
    where: { id: messageId },
    select: { senderId: true, groupId: true },
  });
  if (!msg) throw new Error("Message not found");

  const me = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: msg.groupId, userId } },
    select: { isOwner: true },
  });
  if (!me) throw new Error("Unauthorized");
  if (msg.senderId !== userId && !me.isOwner) throw new Error("Unauthorized");

  await prisma.groupMessage.delete({ where: { id: messageId } });

  await ablyPublish(getGroupChannelName(msg.groupId), {
    type: "message:delete",
    messageId,
  });

  revalidatePath("/messages");
}

export async function toggleGroupMessageReaction(messageId: number, emoji: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existing = await prisma.groupMessageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji,
      },
    },
  });

  let eventType: "reaction:add" | "reaction:remove";
  let groupId: number | null = null;

  if (existing) {
    await prisma.groupMessageReaction.delete({
      where: { id: existing.id },
    });
    eventType = "reaction:remove";
  } else {
    await prisma.groupMessageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });

    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: { senderId: true, groupId: true },
    });
    if (message) {
      groupId = message.groupId;
      if (message.senderId !== userId) {
        const settings = await getKarmaSettings();
        await recordKarmaEarned(message.senderId, settings.messageReactionReceived, "group_message_reaction");
      }
    }
    eventType = "reaction:add";
  }

  if (!groupId) {
    const msg = await prisma.groupMessage.findUnique({
      where: { id: messageId },
      select: { groupId: true },
    });
    if (msg) groupId = msg.groupId;
  }

  if (groupId) {
    await ablyPublish(getGroupChannelName(groupId), {
      type: eventType,
      messageId,
      emoji,
      userId,
    });
  }

  revalidatePath("/messages");
}

export async function getGroupMembers(groupId: number) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  return await prisma.groupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
  });
}

export async function kickMember(groupId: number, targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const me = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!me?.isOwner) throw new Error("Only owners can kick members");

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  revalidatePath("/messages");
}

export async function leaveGroup(groupId: number) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (member?.isOwner) throw new Error("Owners cannot leave groups. Delete the group instead (coming soon).");

  await prisma.groupMember.delete({
    where: { groupId_userId: { groupId, userId } },
  });

  revalidatePath("/messages");
}

export async function toggleMuteMember(groupId: number, targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const me = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!me?.isOwner) throw new Error("Only owners can mute members");

  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });

  if (!target) throw new Error("Member not found");
  if (target.isOwner) throw new Error("Owners cannot be muted");

  const newMuted = !target.isMuted;
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { isMuted: newMuted },
  });

  await ablyPublish(getGroupChannelName(groupId), {
    type: "member:muted",
    userId: targetUserId,
    isMuted: newMuted,
  });

  revalidatePath("/messages");
}

