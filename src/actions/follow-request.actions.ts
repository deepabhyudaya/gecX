"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";

export async function getFollowRequests() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.followRequest.findMany({
    where: {
      targetId: userId,
      status: "PENDING",
    },
    include: {
      requester: {
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests;
}

export async function getSentFollowRequests() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const requests = await prisma.followRequest.findMany({
    where: {
      requesterId: userId,
      status: "PENDING",
    },
    include: {
      target: {
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests;
}

export async function acceptFollowRequest(requestId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  if (!request) throw new Error("Request not found");
  if (request.targetId !== userId) throw new Error("Unauthorized");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  await prisma.followRequest.update({
    where: { id: requestId },
    data: { status: "ACCEPTED" },
  });

  await prisma.communityFollow.create({
    data: {
      followerId: request.requesterId,
      followingId: request.targetId,
    },
  });

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "followingCount" = "followingCount" + 1, "updatedAt" = NOW()
    WHERE "userId" = ${request.requesterId}
  `;

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "followerCount" = "followerCount" + 1, "updatedAt" = NOW()
    WHERE "userId" = ${request.targetId}
  `;

  await createNotificationsForUsers({
    title: "Follow Request Accepted",
    message: `${request.target.displayName || request.target.username} accepted your follow request`,
    type: "FOLLOW_REQUEST_ACCEPTED",
    entityId: requestId,
    ...await getUserNotificationIds(request.requesterId),
  });

  revalidatePath("/requests");
  revalidatePath(`/${request.target.username}`);
  revalidatePath(`/${request.requester.username}`);
  return { success: true };
}

export async function declineFollowRequest(requestId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error("Request not found");
  if (request.targetId !== userId) throw new Error("Unauthorized");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  await prisma.followRequest.update({
    where: { id: requestId },
    data: { status: "DECLINED" },
  });

  await createNotificationsForUsers({
    title: "Follow Request Declined",
    message: "Your follow request was declined",
    type: "FOLLOW_REQUEST_DECLINED",
    entityId: requestId,
    ...await getUserNotificationIds(request.requesterId),
  });

  revalidatePath("/requests");
  return { success: true };
}

export async function cancelFollowRequest(requestId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const request = await prisma.followRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error("Request not found");
  if (request.requesterId !== userId) throw new Error("Unauthorized");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  await prisma.followRequest.delete({
    where: { id: requestId },
  });

  revalidatePath("/requests");
  return { success: true };
}

export async function getPendingFollowRequest(targetUserId: string) {
  const { userId } = auth();
  if (!userId) return null;

  if (userId === targetUserId) return null;

  const outgoingRequest = await prisma.followRequest.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: userId,
        targetId: targetUserId,
      },
    },
  });

  if (outgoingRequest?.status === "PENDING") {
    return { type: "outgoing", request: outgoingRequest };
  }

  const incomingRequest = await prisma.followRequest.findUnique({
    where: {
      requesterId_targetId: {
        requesterId: targetUserId,
        targetId: userId,
      },
    },
  });

  if (incomingRequest?.status === "PENDING") {
    return { type: "incoming", request: incomingRequest };
  }

  return null;
}

export async function getFollowRequestCount() {
  const { userId } = auth();
  if (!userId) return 0;

  const count = await prisma.followRequest.count({
    where: {
      targetId: userId,
      status: "PENDING",
    },
  });

  return count;
}

export async function getDMRequestCount() {
  const { userId } = auth();
  if (!userId) return 0;

  const count = await prisma.dMAccessRequest.count({
    where: {
      targetId: userId,
      status: "PENDING",
    },
  });

  return count;
}

export async function getTotalRequestCount() {
  const { userId } = auth();
  if (!userId) return 0;

  const [followCount, dmCount] = await Promise.all([
    prisma.followRequest.count({
      where: {
        targetId: userId,
        status: "PENDING",
      },
    }),
    prisma.dMAccessRequest.count({
      where: {
        targetId: userId,
        status: "PENDING",
      },
    }),
  ]);

  return followCount + dmCount;
}

async function getUserNotificationIds(userId: string) {

  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (student) return { studentIds: [userId] };

  const teacher = await prisma.teacher.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (teacher) return { teacherIds: [userId] };

  const parent = await prisma.parent.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (parent) return { parentIds: [userId] };

  const admin = await prisma.admin.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (admin) return { adminIds: [userId] };

  return {};
}
