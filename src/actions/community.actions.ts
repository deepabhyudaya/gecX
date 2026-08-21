"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { recordKarmaEarned } from "./karma-tracking.actions";
import { getKarmaSettings } from "./karma-settings.actions";
import { recordUserActivity } from "./streak-tracking.actions";

const POSTS_PER_PAGE = 20;

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

export async function createPost(content: string, subjectId?: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const { sessionClaims } = auth();
  const clerkUser = await currentUser();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const profile = await getOrCreateCommunityProfile(userId);

  if (subjectId) {
    const subject = await prisma.academicSubject.findUnique({
      where: { id: subjectId, isActive: true },
    });
    if (!subject) throw new Error("Invalid subject selected");
  }

  const post = await prisma.communityPost.create({
    data: {
      content: content.slice(0, 2000),
      authorId: userId,
      authorType: role,
      authorName: profile.displayName || profile.username,
      authorImage: profile.avatar,
      subjectId: subjectId || null,
    },
  });

  await prisma.userCommunityProfile.update({
    where: { userId },
    data: { postCount: { increment: 1 } },
  });

  const settings = await getKarmaSettings();
  await recordKarmaEarned(userId, settings.postCreated, "post_created");
  await recordUserActivity(userId, "post");

  revalidatePath("/community");
  return post;
}

export async function deletePost(postId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (!postId || typeof postId !== "string" || postId.trim() === "") {
    throw new Error("Invalid post ID");
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
  });

  if (!post) throw new Error("Post not found");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (post.authorId !== userId && role !== "admin") {
    throw new Error("Unauthorized to delete this post");
  }

  await prisma.communityPost.update({
    where: { id: postId },
    data: { isDeleted: true },
  });

  await prisma.userCommunityProfile.update({
    where: { userId: post.authorId },
    data: { postCount: { decrement: 1 } },
  });

  revalidatePath("/community");
  revalidatePath(`/${post.authorId}`);
}

export async function repostPost(postId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const originalPost = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
  });

  if (!originalPost) throw new Error("Post not found");

  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const profile = await getOrCreateCommunityProfile(userId);

  const post = await prisma.communityPost.create({
    data: {
      content: "",
      authorId: userId,
      authorType: role,
      authorName: profile.displayName || profile.username,
      authorImage: profile.avatar,
      isRepost: true,
      originalPostId: postId,
    },
  });

  await prisma.communityPost.update({
    where: { id: postId },
    data: { repostCount: { increment: 1 } },
  });

  await prisma.userCommunityProfile.update({
    where: { userId },
    data: { postCount: { increment: 1 } },
  });

  await recordUserActivity(userId, "post");

  if (originalPost.authorId !== userId) {
    const settings = await getKarmaSettings();
    await recordKarmaEarned(originalPost.authorId, settings.repostReceived, "repost_received");
  }

  revalidatePath("/community");
  return post;
}

export async function likePost(postId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const existingLike = await prisma.communityPostLike.findUnique({
    where: {
      postId_userId: { postId, userId },
    },
  });

  if (existingLike) {

    await prisma.communityPostLike.delete({
      where: { id: existingLike.id },
    });

    await prisma.communityPost.update({
      where: { id: postId },
      data: { likeCount: { decrement: 1 } },
    });

    return { liked: false };
  } else {

    await prisma.communityPostLike.create({
      data: { postId, userId },
    });

    await prisma.communityPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (post && post.authorId !== userId) {
      const settings = await getKarmaSettings();
      await recordKarmaEarned(post.authorId, settings.likeReceived, "like_received");
    }

    return { liked: true };
  }
}

export async function getFeed(cursor?: string, subjectId?: string) {
  const { userId } = auth();

  const whereClause: any = {
    postType: "POST",
    isDeleted: false,
    OR: [
      { isRepost: false },
      { isRepost: true, originalPost: { isDeleted: false } },
    ],
  };

  if (subjectId) {
    whereClause.subjectId = subjectId;
  }

  const posts = await prisma.communityPost.findMany({
    where: whereClause,
    include: {
      subject: true,
      originalPost: {
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              displayName: true,
              avatar: true,
              customAvatar: true,
              karmaPoints: true,
            },
          },
        },
      },
      author: {
        select: {
          userId: true,
          username: true,
          isPrivate: true,
          karmaPoints: true,
          displayName: true,
          avatar: true,
          customAvatar: true,
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
    take: POSTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let hasMore = false;
  if (posts.length > POSTS_PER_PAGE) {
    posts.pop();
    hasMore = true;
  }

  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null;

  const authorIds = Array.from(new Set(posts.map(p => p.authorId)));
  const [karmaProfiles, equippedColorsData, streakRows] = await Promise.all([
    prisma.userCommunityProfile.findMany({
      where: { userId: { in: authorIds } },
      select: { userId: true, karmaPoints: true },
    }),
    prisma.userEquippedColors.findMany({
      where: { userId: { in: authorIds } },
      include: {
        usernameColorItem: true,
        nameplateItem: true,
      },
    }),
    authorIds.length > 0
      ? prisma.$queryRaw`
          SELECT "userId", "currentStreak" FROM "UserCommunityProfile"
          WHERE "userId" IN (${Prisma.join(authorIds)})
        `
      : Promise.resolve([]),
  ]);
  const karmaMap = new Map(karmaProfiles.map((p: { userId: string; karmaPoints: number }) => [p.userId, p.karmaPoints]));
  const streakMap = new Map((streakRows as any[]).map((r) => [r.userId, Number(r.currentStreak) || 0]));
  const equippedColorMap = new Map(equippedColorsData.map((e: { userId: string; usernameColorItem: { colorValue: string } | null }) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColorsData.map((e: { userId: string; nameplateItem: { colorValue: string } | null }) => [e.userId, e.nameplateItem?.colorValue || null]));

  return {
    posts: posts.map(post => ({
      ...post,
      hasLiked: post.likes && post.likes.length > 0,
      likes: undefined,

      author: {
        ...post.author,
        userId: post.authorId,
        karmaPoints: karmaMap.get(post.authorId) ?? 0,
        currentStreak: streakMap.get(post.authorId) ?? 0,
        equippedColor: equippedColorMap.get(post.authorId) || null,
        equippedNameplate: nameplateMap.get(post.authorId) || null,
      },

      originalPost: post.originalPost ? {
        ...post.originalPost,
        author: post.originalPost.author ? {
          ...post.originalPost.author,
          userId: post.originalPost.authorId,
          karmaPoints: karmaMap.get(post.originalPost.authorId) ?? 0,
          currentStreak: streakMap.get(post.originalPost.authorId) ?? 0,
          equippedColor: equippedColorMap.get(post.originalPost.authorId) || null,
          equippedNameplate: nameplateMap.get(post.originalPost.authorId) || null,
        } : undefined,
      } : null,

      commentCount: post._count.comments,

      previewComments: post.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        authorName: comment.authorName || "Unknown",
        authorUsername: comment.authorId,
      })),
      comments: undefined,
      _count: undefined,
    })),
    nextCursor,
    hasMore,
  };
}

export async function getPost(postId: string) {
  const { userId } = auth();

  const post = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
    include: {
      subject: true,
      originalPost: {
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              displayName: true,
              avatar: true,
              customAvatar: true,
              karmaPoints: true,
            },
          },
        },
      },
      author: {
        select: {
          userId: true,
          username: true,
          isPrivate: true,
          karmaPoints: true,
          displayName: true,
          avatar: true,
              customAvatar: true,
            },
          },
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
    },
  });

  if (!post) return null;

  const authorIds = Array.from(new Set([post.authorId, post.originalPost?.authorId].filter(Boolean) as string[]));
  const [equippedColorsData, streakRows] = await Promise.all([
    prisma.userEquippedColors.findMany({
      where: { userId: { in: authorIds } },
      include: { usernameColorItem: true, nameplateItem: true },
    }),
    authorIds.length > 0
      ? prisma.$queryRaw`
          SELECT "userId", "currentStreak" FROM "UserCommunityProfile"
          WHERE "userId" IN (${Prisma.join(authorIds)})
        `
      : Promise.resolve([]),
  ]);
  const colorMap = new Map(equippedColorsData.map((e: any) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColorsData.map((e: any) => [e.userId, e.nameplateItem?.colorValue || null]));
  const streakMap = new Map((streakRows as any[]).map((r) => [r.userId, Number(r.currentStreak) || 0]));

  return {
    ...post,
    author: {
      ...post.author,
      userId: post.authorId,
      currentStreak: streakMap.get(post.authorId) ?? 0,
      equippedColor: colorMap.get(post.authorId) || null,
      equippedNameplate: nameplateMap.get(post.authorId) || null,
    },
    originalPost: post.originalPost ? {
      ...post.originalPost,
      author: post.originalPost.author ? {
        ...post.originalPost.author,
        userId: post.originalPost.authorId,
        currentStreak: streakMap.get(post.originalPost.authorId) ?? 0,
        equippedColor: colorMap.get(post.originalPost.authorId) || null,
        equippedNameplate: nameplateMap.get(post.originalPost.authorId) || null,
      } : undefined,
    } : null,
    hasLiked: post.likes && post.likes.length > 0,
    likes: undefined,
  };
}

export async function getUserPosts(username: string, cursor?: string) {
  const profile = await prisma.userCommunityProfile.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
  });

  if (!profile) return { posts: [], nextCursor: null, hasMore: false };

  const { userId } = auth();

  if (profile.isPrivate && userId !== profile.userId) {
    const isFollowing = await prisma.communityFollow.findUnique({
      where: {
        followerId_followingId: { followerId: userId || "", followingId: profile.userId },
      },
    });
    if (!isFollowing) return { posts: [], nextCursor: null, hasMore: false, isPrivate: true };
  }

  const posts = await prisma.communityPost.findMany({
    where: {
      authorId: profile.userId,
      isDeleted: false,
      OR: [
        { isRepost: false },
        { isRepost: true, originalPost: { isDeleted: false } },
      ],
    },
    include: {
      originalPost: {
        include: {
          author: {
            select: {
              userId: true,
              username: true,
              displayName: true,
              avatar: true,
              customAvatar: true,
              karmaPoints: true,
            },
          },
        },
      },
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
    },
    orderBy: { createdAt: "desc" },
    take: POSTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let hasMore = false;
  if (posts.length > POSTS_PER_PAGE) {
    posts.pop();
    hasMore = true;
  }

  const nextCursor = hasMore && posts.length > 0 ? posts[posts.length - 1].id : null;

  const originalAuthorIds = posts
    .filter(p => p.originalPost?.authorId)
    .map(p => p.originalPost!.authorId as string);
  const allUserIds = Array.from(new Set([profile.userId, ...originalAuthorIds]));

  const equippedColorsData = await prisma.userEquippedColors.findMany({
    where: { userId: { in: allUserIds } },
    include: { usernameColorItem: true, nameplateItem: true },
  });
  const colorMap = new Map(equippedColorsData.map((e: { userId: string; usernameColorItem: { colorValue: string } | null }) => [e.userId, e.usernameColorItem?.colorValue || null]));
  const nameplateMap = new Map(equippedColorsData.map((e: { userId: string; nameplateItem: { colorValue: string } | null }) => [e.userId, e.nameplateItem?.colorValue || null]));

  const authorInfo = {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatar,
    customAvatar: profile.customAvatar,
    karmaPoints: profile.karmaPoints,
    currentStreak: profile.currentStreak || 0,
    equippedColor: colorMap.get(profile.userId) || null,
    equippedNameplate: nameplateMap.get(profile.userId) || null,
  };

  return {
    posts: posts.map(post => ({
      ...post,
      author: authorInfo,
      hasLiked: post.likes && post.likes.length > 0,
      likes: undefined,
      originalPost: post.originalPost ? {
        ...post.originalPost,
        author: post.originalPost.author ? {
          ...post.originalPost.author,
          userId: post.originalPost.authorId,
          equippedColor: colorMap.get(post.originalPost.authorId) || null,
          equippedNameplate: nameplateMap.get(post.originalPost.authorId) || null,
        } : undefined,
      } : null,
    })),
    nextCursor,
    hasMore,
  };
}
