"use server";

import prisma from "../lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers, getAllUserIdsByRole } from "@/lib/notifications";

export async function getTickets() {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !role) {
    throw new Error("Unauthorized");
  }

  if (role === "admin") {
    return await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { username: true } },
        teacher: { select: { username: true } },
        parent: { select: { username: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  const query: any = { orderBy: { createdAt: "desc" } };
  if (role === "student") query.where = { studentId: userId };
  else if (role === "teacher") query.where = { teacherId: userId };
  else if (role === "parent") query.where = { parentId: userId };

  return await prisma.ticket.findMany({
    ...query,
    include: {
      _count: { select: { messages: true } },
    },
  });
}

export async function createTicket(subject: string, description: string, category: string = "other") {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !role) {
    throw new Error("Unauthorized");
  }

  const data: any = {
    subject,
    description,
    status: "OPEN",
    category,
  };

  if (role === "student") data.studentId = userId;
  else if (role === "teacher") data.teacherId = userId;
  else if (role === "parent") data.parentId = userId;

  const ticket = await prisma.ticket.create({ data });

  await prisma.ticketMessage.create({
    data: {
      content: description,
      ticketId: ticket.id,
      senderId: userId,
      senderRole: role,
    },
  });

  const adminIds = await getAllUserIdsByRole("admin");
  await createNotificationsForUsers({
    title: "New support ticket",
    message: subject,
    type: "TICKET_CREATED",
    entityId: String(ticket.id),
    adminIds,
  });

  revalidatePath("/support");
}

export async function getTicketMessages(ticketId: number) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      student: { select: { username: true } },
      teacher: { select: { username: true } },
      parent: { select: { username: true } },
      messages: {
        include: {
          reactions: true,
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
              senderRole: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) throw new Error("Ticket not found");

  const senderIds = [...new Set(ticket.messages.map((m) => m.senderId).filter(Boolean))];

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
      select: { userId: true, avatar: true, customAvatar: true },
    }),
  ]);

  const karmaMap = new Map(karmaProfiles.map((p) => [p.userId, p.karmaPoints]));
  const colorMap = new Map(equippedColors.map((e) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColors.map((e) => [e.userId, e.nameplateItem?.colorValue || null]));
  const avatarMap = new Map(communityProfiles.map((p: any) => [p.userId, p.avatar || null]));
  const customAvatarMap = new Map(communityProfiles.map((p: any) => [p.userId, p.customAvatar || null]));

  const enrichedMessages = ticket.messages.map((msg) => ({
    ...msg,
    senderKarma: karmaMap.get(msg.senderId) ?? 0,
    senderColor: colorMap.get(msg.senderId) || null,
    senderNameplate: nameplateMap.get(msg.senderId) || null,
    senderAvatar: avatarMap.get(msg.senderId) || null,
    senderCustomAvatar: customAvatarMap.get(msg.senderId) || null,
  }));

  return { ...ticket, messages: enrichedMessages };
}

export async function sendMessage(ticketId: number, content: string, replyToId?: number) {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !role) {
    throw new Error("Unauthorized");
  }

  await prisma.ticketMessage.create({
    data: {
      content,
      ticketId,
      senderId: userId,
      senderRole: role,
      replyToId: replyToId || null,
    },
  });

  revalidatePath("/support");
}

export async function deleteTicketMessage(messageId: number) {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (!userId || !role) throw new Error("Unauthorized");

  const msg = await prisma.ticketMessage.findUnique({
    where: { id: messageId },
    include: { ticket: { select: { studentId: true, teacherId: true, parentId: true } } },
  });
  if (!msg) throw new Error("Message not found");

  const isParticipant =
    msg.ticket.studentId === userId ||
    msg.ticket.teacherId === userId ||
    msg.ticket.parentId === userId ||
    role === "admin";
  if (!isParticipant) throw new Error("Unauthorized");

  await prisma.ticketMessage.delete({ where: { id: messageId } });
  revalidatePath("/support");
}

export async function toggleReaction(messageId: number, emoji: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existingReaction = await prisma.ticketMessageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji,
      },
    },
  });

  if (existingReaction) {
    await prisma.ticketMessageReaction.delete({
      where: { id: existingReaction.id },
    });
  } else {
    await prisma.ticketMessageReaction.create({
      data: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  revalidatePath("/support");
}

export async function closeTicket(ticketId: number) {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || role !== "admin") {
    throw new Error("Unauthorized");
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: "CLOSED" },
    select: { id: true, subject: true, studentId: true, teacherId: true, parentId: true },
  });

  await createNotificationsForUsers({
    title: "Support ticket updated",
    message: `${ticket.subject} was closed.`,
    type: "TICKET_UPDATED",
    entityId: String(ticket.id),
    studentIds: ticket.studentId ? [ticket.studentId] : [],
    teacherIds: ticket.teacherId ? [ticket.teacherId] : [],
    parentIds: ticket.parentId ? [ticket.parentId] : [],
  });

  revalidatePath("/support");
}
