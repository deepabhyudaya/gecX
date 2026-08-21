"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ablyPublish } from "@/lib/ably-server";

const REELS_PER_PAGE = 10;

async function getOrCreateCommunityProfile(userId: string) {
  const { sessionClaims } = auth();
  const clerkUser = await currentUser();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  let profile = await prisma.userCommunityProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    const username = clerkUser?.username || `user_${userId.slice(-8)}`;
    const displayName = clerkUser?.fullName || clerkUser?.username || "User";

    profile = await prisma.userCommunityProfile.create({
      data: {
        userId,
        userType: role,
        username: username.toLowerCase(),
        displayName,
        avatar: clerkUser?.imageUrl || null,
      },
    });
  }

  return profile;
}

export async function createReel(
  content: string,
  videoUrl: string,
  thumbnailUrl?: string,
  orientation?: string
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const profile = await getOrCreateCommunityProfile(userId);

  const reel = await prisma.communityPost.create({
    data: {
      content: content.slice(0, 2000),
      authorId: userId,
      authorType: role,
      authorName: profile.displayName || profile.username,
      authorImage: profile.avatar,
      postType: "REEL",
      videoUrl,
      thumbnailUrl: thumbnailUrl || null,
      orientation: orientation || "PORTRAIT",
    },
  });

  await prisma.userCommunityProfile.update({
    where: { userId },
    data: {
      postCount: { increment: 1 },
    },
  });

  revalidatePath("/community");
  revalidatePath("/community/reels");
  revalidatePath(`/${profile.username}`);

  return reel;
}

export async function getReelsFeed(cursor?: string) {
  const { userId } = auth();

  const reels = await prisma.communityPost.findMany({
    where: {
      postType: "REEL",
      isDeleted: false,
    },
    include: {
      author: {
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
          customAvatar: true,
          karmaPoints: true,
          currentStreak: true,
        },
      },
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
      comments: {
        where: { isDeleted: false, parentId: null },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          id: true,
          content: true,
          authorName: true,
          authorId: true,
        },
      },
      _count: {
        select: { comments: { where: { isDeleted: false } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: REELS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let hasMore = false;
  let nextCursor: string | undefined = undefined;

  if (reels.length > REELS_PER_PAGE) {
    hasMore = true;
    const nextItem = reels.pop();
    nextCursor = nextItem?.id;
  }

  return {
    reels: reels.map((reel) => ({
      ...reel,
      hasLiked: userId ? reel.likes.length > 0 : false,
    })),
    nextCursor,
    hasMore,
  };
}

export async function incrementReelViews(reelId: string) {

  const updated = await prisma.communityPost.update({
    where: { id: reelId },
    data: {
      viewCount: {
        increment: 1,
      },
    },
    select: {
      viewCount: true,
    },
  });

  try {
    const channelName = `reel:${reelId}`;
    await ablyPublish(channelName, {
      type: "message:new",
      message: {
        type: "reel:view",
        reelId,
        viewCount: updated.viewCount,
      },
    } as any);
  } catch (error) {
    console.error("[incrementReelViews] Ably broadcast error:", error);
  }

  return { success: true, viewCount: updated.viewCount };
}
