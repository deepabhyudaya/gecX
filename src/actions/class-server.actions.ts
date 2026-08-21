"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const CR_POLL_QUESTION = "🗳️ Vote for Class Representative";

export async function createClassServer(classId: number, className: string) {
  const existing = await prisma.class.findUnique({
    where: { id: classId },
    select: { classServerId: true },
  });
  if (existing?.classServerId) return;

  const inviteCode = generateInviteCode();

  const server = await prisma.server.create({
    data: {
      name: `${className} Class`,
      description: `Official server for ${className}. Join to stay connected with your classmates.`,
      inviteCode,
      createdById: "system",
      isDiscoverable: false,
      channelCategories: {
        create: [
          { name: "📢 General", order: 0 },
          { name: "📚 Academic", order: 1 },
          { name: "🏛️ Governance", order: 2 },
        ],
      },
    },
    include: { channelCategories: true },
  });

  const [generalCat, academicCat, govCat] = server.channelCategories.sort(
    (a, b) => a.order - b.order
  );

  await prisma.serverChannel.createMany({
    data: [
      { serverId: server.id, categoryId: generalCat.id, name: "general",         order: 0 },
      { serverId: server.id, categoryId: generalCat.id, name: "announcements",   order: 1 },
      { serverId: server.id, categoryId: academicCat.id, name: "homework-help",  order: 0 },
      { serverId: server.id, categoryId: academicCat.id, name: "study-sessions", order: 1 },
      { serverId: server.id, categoryId: govCat.id,      name: "cr-election",    order: 0 },
      { serverId: server.id, categoryId: govCat.id,      name: "class-council",  order: 1 },
    ],
  });

  const crChannel = await prisma.serverChannel.findFirst({
    where: { serverId: server.id, name: "cr-election" },
  });

  let crPollId: number | null = null;

  if (crChannel) {
    const msg = await prisma.serverMessage.create({
      data: {
        content: CR_POLL_QUESTION,
        channelId: crChannel.id,
        senderId: "system",
        senderUsername: "system",
        senderRole: "admin",
        messageType: "COMMAND",
        poll: {
          create: {
            question: CR_POLL_QUESTION,
            options: { create: [] },
          },
        },
      },
      include: { poll: true },
    });
    crPollId = msg.poll?.id ?? null;
  }

  await prisma.class.update({
    where: { id: classId },
    data: {
      classServerId: server.id,
      crPollId: crPollId,
    },
  });

  revalidatePath("/list/classes");
}

export async function addStudentToClassServer(
  studentId: string,
  classId: number,
  username: string,
  displayName: string
) {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { classServerId: true, crPollId: true },
  });
  if (!classData?.classServerId) return;

  const serverId = classData.classServerId;

  await prisma.serverMember.upsert({
    where: { serverId_userId: { serverId, userId: studentId } },
    update: {},
    create: {
      serverId,
      userId: studentId,
      role: "MEMBER",
      username,
      displayName,
    },
  });

  if (classData.crPollId) {
    const already = await prisma.pollOption.findFirst({
      where: { pollId: classData.crPollId, studentId },
    });
    if (!already) {
      await prisma.pollOption.create({
        data: {
          pollId: classData.crPollId,
          text: displayName,
          studentId,
        },
      });
    }
  }

  revalidatePath("/servers");
}

export async function removeStudentFromClassServer(studentId: string, classId: number) {
  const classData = await prisma.class.findUnique({
    where: { id: classId },
    select: { classServerId: true, crPollId: true },
  });
  if (!classData?.classServerId) return;

  await prisma.serverMember.deleteMany({
    where: { serverId: classData.classServerId, userId: studentId },
  });

  if (classData.crPollId) {
    const option = await prisma.pollOption.findFirst({
      where: { pollId: classData.crPollId, studentId },
    });
    if (option) {
      await prisma.pollVote.deleteMany({ where: { optionId: option.id } });
      await prisma.pollOption.delete({ where: { id: option.id } });
    }

    await tallyAndUpdateCR(classData.crPollId, classId);
  }

  revalidatePath("/servers");
}

export async function tallyAndUpdateCR(pollId: number, classId: number) {
  const options = await prisma.pollOption.findMany({
    where: { pollId },
    include: { votes: true },
  });

  if (options.length === 0) return;

  let topOption: (typeof options)[0] | null = null;
  let topVotes = 0;
  let tied = false;

  for (const opt of options) {
    const count = opt.votes.length;
    if (count > topVotes) {
      topVotes = count;
      topOption = opt;
      tied = false;
    } else if (count === topVotes && topVotes > 0) {
      tied = true;
    }
  }

  if (!topOption || tied || topVotes === 0 || !topOption.studentId) return;

  const season = new Date().getFullYear().toString();

  const existing = await prisma.classRepresentative.findUnique({
    where: { classId },
  });

  if (existing?.studentId === topOption.studentId) return;

  const pendingRivalry = await prisma.classRivalry.findFirst({
    where: {
      status: "PENDING_CR",
      OR: [{ classAId: classId }, { classBId: classId }],
    },
  });
  if (pendingRivalry) {
    const updateData: any = {};
    if (pendingRivalry.classAId === classId) updateData.crAId = topOption.studentId;
    if (pendingRivalry.classBId === classId) updateData.crBId = topOption.studentId;
    if (Object.keys(updateData).length > 0) {
      await prisma.classRivalry.update({
        where: { id: pendingRivalry.id },
        data: updateData,
      });
    }
  }

  await prisma.classRepresentative.upsert({
    where: { classId },
    update: {
      studentId: topOption.studentId,
      electedAt: new Date(),
      pollId,
      season,
      isActive: true,
    },
    create: {
      classId,
      studentId: topOption.studentId,
      pollId,
      season,
      isActive: true,
    },
  });

  await createNotificationsForUsers({
    title: "🏛️ New Class Representative Elected",
    message: `${topOption.text} has been elected as the Class Representative via class vote.`,
    type: "CR_ELECTED",
    entityId: String(classId),
    studentIds: [topOption.studentId],
  });

  revalidatePath("/student/rivalry");
}

export async function getClassServerInfo(classId: number) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { classServerId: true, crPollId: true, name: true },
  });
  if (!cls?.classServerId) return null;

  const [server, cr] = await Promise.all([
    prisma.server.findUnique({
      where: { id: cls.classServerId },
      include: {
        members: { select: { userId: true, displayName: true, username: true } },
        channels: { select: { id: true, name: true, categoryId: true }, orderBy: { order: "asc" } },
        channelCategories: { orderBy: { order: "asc" } },
      },
    }),
    prisma.classRepresentative.findUnique({
      where: { classId },
    }),
  ]);

  return { server, cr, crPollId: cls.crPollId };
}
