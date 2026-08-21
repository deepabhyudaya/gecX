"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getOrbAvatarUrl, isOrbStyle } from "@/lib/orb-avatars";

export async function getCommunityProfile(username: string) {
  const { userId } = auth();

  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  if (!profile) return null;

  let isFollowing = false;
  let isOwnProfile = false;

  if (userId) {
    isOwnProfile = userId === profile.userId;
    if (!isOwnProfile) {
      const follow = await prisma.communityFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: profile.userId,
          },
        },
      });
      isFollowing = !!follow;
    }
  }

  const shouldShowKarma =
    profile.showKarma === "everyone" ||
    (profile.showKarma === "followers" && (isOwnProfile || isFollowing)) ||
    (profile.showKarma === "nobody" && isOwnProfile);

  const hasAcademicProfile = profile.userType === "student" || profile.userType === "teacher";
  const canViewAcademic = hasAcademicProfile && (
    profile.showAcademicProfile === "everyone" ||
    (profile.showAcademicProfile === "followers" && (isOwnProfile || isFollowing)) ||
    (profile.showAcademicProfile === "nobody" && isOwnProfile)
  );

  if (profile.isPrivate && !isOwnProfile && !isFollowing) {
    return {
      userId: profile.userId,
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      customAvatar: profile.customAvatar,
      bannerUrl: profile.bannerUrl,
      bio: null,
      isPrivate: true,
      requireFollowApproval: profile.requireFollowApproval,
      showKarma: profile.showKarma,
      karmaPoints: shouldShowKarma ? profile.karmaPoints : 0,
      postCount: profile.postCount,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      isFollowing: false,
      isOwnProfile: false,
      userType: profile.userType,
      canViewAcademic: false,
      currentStreak: profile.currentStreak || 0,
      longestStreak: profile.longestStreak || 0,
    };
  }

  return {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    avatar: profile.avatar,
    customAvatar: profile.customAvatar,
    bannerUrl: profile.bannerUrl,
    bio: profile.bio,
    isPrivate: profile.isPrivate,
    requireFollowApproval: profile.requireFollowApproval,
    showKarma: profile.showKarma,
    karmaPoints: shouldShowKarma ? profile.karmaPoints : 0,
    postCount: profile.postCount,
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
    isFollowing,
    isOwnProfile,
    userType: profile.userType,
    canViewAcademic,
    currentStreak: profile.currentStreak || 0,
    longestStreak: profile.longestStreak || 0,
  };
}

export async function getMyCommunityProfile() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  const equipped = await prisma.userEquippedColors.findUnique({
    where: { userId },
    include: {
      nameplateItem: true,
      usernameColorItem: true,
    },
  });

  return {
    ...profile,
    equippedNameplate: equipped?.nameplateItem?.colorValue || null,
    equippedUsernameColor: equipped?.usernameColorItem?.colorValue || null,
  };
}

export async function updateCommunityProfile(data: {
  displayName?: string;
  bio?: string;
  isPrivate?: boolean;
  requireFollowApproval?: boolean;
  showKarma?: string;
  showAcademicProfile?: string;
  username?: string;
}) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const { sessionClaims } = auth();
  const clerkUser = await currentUser();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  if (data.username) {
    const existingProfiles = await prisma.$queryRaw`
      SELECT * FROM "UserCommunityProfile"
      WHERE LOWER(username) = LOWER(${data.username})
      LIMIT 1
    `;
    const existing = (existingProfiles as any[])[0] || null;
    if (existing && existing.userId !== userId) {
      throw new Error("Username already taken");
    }
  }

  const existingProfiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const existingProfile = (existingProfiles as any[])[0] || null;

  if (!existingProfile) {
    const username = data.username || clerkUser?.username || `user_${userId.slice(-8)}`;
    const displayName = data.displayName || clerkUser?.fullName || "User";

    const profile = await prisma.userCommunityProfile.create({
      data: {
        userId,
        userType: role,
        username: username.toLowerCase(),
        displayName,
        bio: data.bio || null,
        avatar: clerkUser?.imageUrl || null,
        isPrivate: data.isPrivate ?? false,
        requireFollowApproval: data.requireFollowApproval ?? false,
        showKarma: (data.showKarma as string) ?? "everyone",
        showAcademicProfile: (data.showAcademicProfile as string) ?? "nobody",
      },
    });

    return profile;
  }

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.displayName !== undefined) {
    updates.push(`"displayName" = $${paramIndex++}`);
    values.push(data.displayName.slice(0, 50));
  }
  if (data.bio !== undefined) {
    updates.push(`"bio" = $${paramIndex++}`);
    values.push(data.bio.slice(0, 500));
  }
  if (data.isPrivate !== undefined) {
    updates.push(`"isPrivate" = $${paramIndex++}`);
    values.push(data.isPrivate);
  }
  if (data.requireFollowApproval !== undefined) {
    updates.push(`"requireFollowApproval" = $${paramIndex++}`);
    values.push(data.requireFollowApproval);
  }
  if (data.showKarma !== undefined) {
    updates.push(`"showKarma" = $${paramIndex++}`);
    values.push(data.showKarma);
  }
  if (data.showAcademicProfile !== undefined) {
    updates.push(`"showAcademicProfile" = $${paramIndex++}`);
    values.push(data.showAcademicProfile);
  }
  if (data.username !== undefined) {
    updates.push(`"username" = $${paramIndex++}`);
    values.push(data.username.toLowerCase());
  }

  updates.push(`"updatedAt" = NOW()`);

  values.push(userId);

  await prisma.$executeRawUnsafe(
    `UPDATE "UserCommunityProfile" SET ${updates.join(", ")} WHERE "userId" = $${paramIndex}`,
    ...values
  );

  const updatedProfiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (updatedProfiles as any[])[0];

  revalidatePath(`/${profile.username}`);
  revalidatePath("/profile");
  return profile;
}

export async function updateCustomAvatar(url: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const customAvatarItem = await prisma.usernameColorShopItem.findFirst({
    where: { type: "customAvatar", isActive: true },
  });

  if (!customAvatarItem) throw new Error("Custom avatar item not available");

  const owned = await prisma.userOwnedColor.findUnique({
    where: {
      userId_colorItemId: { userId, colorItemId: customAvatarItem.id },
    },
  });

  if (!owned) throw new Error("You need to purchase Custom Avatar from the shop first");

  if (url && !isValidImageUrl(url)) {
    throw new Error("Invalid image URL. Must be a direct link to an image or GIF.");
  }

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "customAvatar" = ${url}, "updatedAt" = NOW()
    WHERE "userId" = ${userId}
  `;

  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];

  revalidatePath(`/${profile.username}`);
  revalidatePath("/community/profile");
  revalidatePath("/settings/community");
  return { success: true, customAvatar: url };
}

export async function updateProfileBanner(url: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const bannerItem = await prisma.usernameColorShopItem.findFirst({
    where: { type: "profileBanner", isActive: true },
  });

  if (!bannerItem) throw new Error("Profile banner item not available");

  const owned = await prisma.userOwnedColor.findUnique({
    where: {
      userId_colorItemId: { userId, colorItemId: bannerItem.id },
    },
  });

  if (!owned) throw new Error("You need to purchase Profile Banner from the shop first");

  if (url && !isValidImageUrl(url)) {
    throw new Error("Invalid image URL. Must be a direct link to an image or GIF.");
  }

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "bannerUrl" = ${url}, "updatedAt" = NOW()
    WHERE "userId" = ${userId}
  `;

  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];

  revalidatePath(`/${profile.username}`);
  revalidatePath("/community/profile");
  revalidatePath("/settings/community");
  return { success: true, bannerUrl: url };
}

function generateAvatarUrl(style: string, seed: string, size: number = 128): string {
  if (isOrbStyle(style)) {
    return getOrbAvatarUrl(seed, size);
  }
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&randomizeIds=true`;
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    new URL(url);
  } catch {
    return false;
  }

  const lowerUrl = url.toLowerCase();
  const trustedHosts = [
    "cdn.discordapp.com",
    "media.discordapp.net",
    "i.imgur.com",
    "i.postimg.cc",
    "imgur.com",
    "tenor.com",
    "media.tenor.com",
    "giphy.com",
    "media.giphy.com",
    "i.giphy.com",
    "raw.githubusercontent.com",
    "github.com",
    "avatars.githubusercontent.com",
    "pfps.gg",
  ];

  const hasTrustedHost = trustedHosts.some(host => lowerUrl.includes(host));
  const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/.test(lowerUrl);

  return hasTrustedHost || hasImageExtension;
}

export async function followUser(targetUserId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (userId === targetUserId) throw new Error("Cannot follow yourself");

  let targetProfiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE "userId" = ${targetUserId}
    LIMIT 1
  `;
  let targetProfile = (targetProfiles as any[])[0] || null;

  if (!targetProfile) {

    const [student, teacher, parent, admin] = await Promise.all([
      prisma.student.findUnique({ where: { id: targetUserId }, select: { id: true, name: true, username: true, img: true } }),
      prisma.teacher.findUnique({ where: { id: targetUserId }, select: { id: true, name: true, username: true, img: true } }),
      prisma.parent.findUnique({ where: { id: targetUserId }, select: { id: true, name: true, username: true } }),
      prisma.admin.findUnique({ where: { id: targetUserId }, select: { id: true, username: true } }),
    ]);

    const user = student || teacher || parent || admin;
    if (!user) throw new Error("User not found");

    let userType = "admin";
    if (student) userType = "student";
    else if (teacher) userType = "teacher";
    else if (parent) userType = "parent";

    const username = (user as any).username || `user_${user.id.slice(-8)}`;
    const displayName = (user as any).name || username;
    const img = (user as any).img || null;

    try {
      targetProfile = await prisma.userCommunityProfile.create({
        data: {
          userId: targetUserId,
          userType,
          username: username.toLowerCase(),
          displayName,
          avatar: img,
          bio: null,
          isPrivate: false,
          requireFollowApproval: false,
          showKarma: "everyone",
          karmaPoints: 0,
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
        },
      });
    } catch (error) {

      targetProfiles = await prisma.$queryRaw`
        SELECT * FROM "UserCommunityProfile"
        WHERE "userId" = ${targetUserId}
        LIMIT 1
      `;
      targetProfile = (targetProfiles as any[])[0] || null;
      if (!targetProfile) throw new Error("Failed to create user profile");
    }
  }

  const existingFollow = await prisma.communityFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId,
        followingId: targetUserId,
      },
    },
  });

  if (existingFollow) {

    await prisma.communityFollow.delete({
      where: { id: existingFollow.id },
    });

    await prisma.$executeRaw`
      UPDATE "UserCommunityProfile"
      SET "followingCount" = "followingCount" - 1, "updatedAt" = NOW()
      WHERE "userId" = ${userId}
    `;

    await prisma.$executeRaw`
      UPDATE "UserCommunityProfile"
      SET "followerCount" = "followerCount" - 1, "updatedAt" = NOW()
      WHERE "userId" = ${targetUserId}
    `;

    revalidatePath("/community/search");
    if (targetProfile) {
      revalidatePath(`/${targetProfile.username}`);
      revalidatePath(`/${targetProfile.username}/followers`);
    }
    const myProfiles = await prisma.$queryRaw`
      SELECT * FROM "UserCommunityProfile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    const myProfile = (myProfiles as any[])[0] || null;
    if (myProfile) {
      revalidatePath(`/${myProfile.username}/following`);
    }

    return { following: false, pending: false };
  }

  if (targetProfile?.requireFollowApproval) {

    const existingRequest = await prisma.followRequest.findUnique({
      where: {
        requesterId_targetId: {
          requesterId: userId,
          targetId: targetUserId,
        },
      },
    });

    if (existingRequest) {

      await prisma.followRequest.delete({
        where: { id: existingRequest.id },
      });
      revalidatePath("/requests");
      revalidatePath(`/${targetProfile.username}`);
      return { following: false, pending: false };
    }

    await prisma.followRequest.create({
      data: {
        requesterId: userId,
        targetId: targetUserId,
        status: "PENDING",
      },
    });

    const { createNotificationsForUsers } = await import("@/lib/notifications");
    const requesterProfile = await prisma.userCommunityProfile.findUnique({
      where: { userId },
      select: { username: true, displayName: true },
    });

    const requesterRole = await getUserRole(userId);
    await createNotificationsForUsers({
      title: "New Follow Request",
      message: `${requesterProfile?.displayName || requesterProfile?.username || "Someone"} wants to follow you`,
      type: "FOLLOW_REQUEST_RECEIVED",
      entityId: userId,
      ...(requesterRole === "student" ? { studentIds: [targetUserId] } :
        requesterRole === "teacher" ? { teacherIds: [targetUserId] } :
        requesterRole === "parent" ? { parentIds: [targetUserId] } :
        { adminIds: [targetUserId] }),
    });

    revalidatePath("/requests");
    revalidatePath(`/${targetProfile.username}`);
    return { following: false, pending: true };
  }

  await prisma.communityFollow.create({
    data: {
      followerId: userId,
      followingId: targetUserId,
    },
  });

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "followingCount" = "followingCount" + 1, "updatedAt" = NOW()
    WHERE "userId" = ${userId}
  `;

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "followerCount" = "followerCount" + 1, "updatedAt" = NOW()
    WHERE "userId" = ${targetUserId}
  `;

  revalidatePath("/community/search");
  if (targetProfile) {
    revalidatePath(`/${targetProfile.username}`);
    revalidatePath(`/${targetProfile.username}/followers`);
  }
  const myProfiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const myProfile = (myProfiles as any[])[0] || null;
  if (myProfile) {
    revalidatePath(`/${myProfile.username}/following`);
  }

  return { following: true, pending: false };
}

async function getUserRole(userId: string): Promise<string> {
  const student = await prisma.student.findUnique({ where: { id: userId }, select: { id: true } });
  if (student) return "student";

  const teacher = await prisma.teacher.findUnique({ where: { id: userId }, select: { id: true } });
  if (teacher) return "teacher";

  const parent = await prisma.parent.findUnique({ where: { id: userId }, select: { id: true } });
  if (parent) return "parent";

  const admin = await prisma.admin.findUnique({ where: { id: userId }, select: { id: true } });
  if (admin) return "admin";

  return "unknown";
}

export async function getFollowers(username: string) {
  const { userId } = auth();

  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  if (!profile) throw new Error("User not found");

  if (profile.isPrivate && userId !== profile.userId) {
    const isFollowing = await prisma.communityFollow.findUnique({
      where: {
        followerId_followingId: { followerId: userId || "", followingId: profile.userId },
      },
    });
    if (!isFollowing) return [];
  }

  const followers = await prisma.communityFollow.findMany({
    where: { followingId: profile.userId },
    include: {
      follower: {
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
          customAvatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const followersWithStatus = await Promise.all(
    followers.map(async (f: { follower: { userId: string; username: string; displayName: string | null; avatar: string | null; customAvatar: string | null } }) => {
      let isFollowing = false;
      if (userId && userId !== f.follower.userId) {
        const followRecord = await prisma.communityFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: f.follower.userId,
            },
          },
        });
        isFollowing = !!followRecord;
      }
      return {
        userId: f.follower.userId,
        username: f.follower.username,
        displayName: f.follower.displayName,
        avatar: f.follower.customAvatar || f.follower.avatar,
        isFollowing,
      };
    })
  );

  return followersWithStatus;
}

export async function getFollowing(username: string) {
  const { userId } = auth();

  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  if (!profile) throw new Error("User not found");

  if (profile.isPrivate && userId !== profile.userId) {
    const isFollowing = await prisma.communityFollow.findUnique({
      where: {
        followerId_followingId: { followerId: userId || "", followingId: profile.userId },
      },
    });
    if (!isFollowing) return [];
  }

  const following = await prisma.communityFollow.findMany({
    where: { followerId: profile.userId },
    include: {
      following: {
        select: {
          userId: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const followingWithStatus = await Promise.all(
    following.map(async (f: { following: { userId: string; username: string; displayName: string | null; avatar: string | null } }) => {
      let isFollowing = false;
      if (userId && userId !== f.following.userId) {
        const followRecord = await prisma.communityFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: f.following.userId,
            },
          },
        });
        isFollowing = !!followRecord;
      }
      return {
        userId: f.following.userId,
        username: f.following.username,
        displayName: f.following.displayName,
        avatar: f.following.avatar,
        isFollowing,
      };
    })
  );

  return followingWithStatus;
}

export async function searchUsers(query: string) {
  const { userId } = auth();
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase();

  try {

    const [students, teachers, parents, admins] = await Promise.all([
      prisma.student.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, username: true, img: true },
        take: 10,
      }),
      prisma.teacher.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, username: true, img: true },
        take: 10,
      }),
      prisma.parent.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { username: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, username: true },
        take: 10,
      }),
      prisma.admin.findMany({
        where: {
          username: { contains: searchTerm, mode: "insensitive" },
        },
        select: { id: true, username: true },
        take: 10,
      }),
    ]);

    console.log("Found users:", { students: students.length, teachers: teachers.length, parents: parents.length, admins: admins.length });

    const allUsersList: Array<{
      userId: string;
      username: string;
      displayName: string;
      avatar: string | null;
      followerCount: number;
      isPrivate: boolean;
      isFollowing: boolean;
      isOwnProfile: boolean;
    }> = [];

    for (const user of students) {
      const username = user.username || `user_${user.id.slice(-8)}`;
      allUsersList.push({
        userId: user.id,
        username,
        displayName: user.name,
        avatar: user.img || null,
        followerCount: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === user.id,
      });

      getOrCreateCommunityProfile(user.id, user.name, username, user.img, "student").catch(console.error);
    }

    for (const user of teachers) {
      const username = user.username || `user_${user.id.slice(-8)}`;
      allUsersList.push({
        userId: user.id,
        username,
        displayName: user.name,
        avatar: user.img || null,
        followerCount: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === user.id,
      });

      getOrCreateCommunityProfile(user.id, user.name, username, user.img, "teacher").catch(console.error);
    }

    for (const user of parents) {
      const username = user.username || `user_${user.id.slice(-8)}`;
      allUsersList.push({
        userId: user.id,
        username,
        displayName: user.name,
        avatar: null,
        followerCount: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === user.id,
      });

      getOrCreateCommunityProfile(user.id, user.name, username, null, "parent").catch(console.error);
    }

    for (const user of admins) {
      const username = user.username || `admin_${user.id.slice(-8)}`;
      allUsersList.push({
        userId: user.id,
        username,
        displayName: user.username,
        avatar: null,
        followerCount: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === user.id,
      });

      getOrCreateCommunityProfile(user.id, user.username, username, null, "admin").catch(console.error);
    }

    const allUserIds = allUsersList.map((u) => u.userId);
    const [profiles, follows] = await Promise.all([
      prisma.userCommunityProfile.findMany({
        where: { userId: { in: allUserIds } },
        select: { userId: true, karmaPoints: true, currentStreak: true, followerCount: true },
      }),
      userId
        ? prisma.communityFollow.findMany({
            where: { followerId: userId, followingId: { in: allUserIds } },
            select: { followingId: true },
          })
        : Promise.resolve([]),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const followSet = new Set(follows.map((f) => f.followingId));

    const enrichedUsers = allUsersList.map((user) => {
      const profile = profileMap.get(user.userId);
      return {
        ...user,
        followerCount: profile?.followerCount ?? user.followerCount,
        karmaPoints: profile?.karmaPoints ?? 0,
        currentStreak: profile?.currentStreak ?? 0,
        isFollowing: user.userId !== userId ? followSet.has(user.userId) : false,
      };
    });

    console.log("Returning users:", enrichedUsers.length);
    return enrichedUsers.slice(0, 20);
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

async function getOrCreateCommunityProfile(userId: string, name: string, username: string, img: string | null, userType: string) {
  try {
    const existingProfiles = await prisma.$queryRaw`
      SELECT * FROM "UserCommunityProfile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    const existing = (existingProfiles as any[])[0] || null;

    if (existing) return existing;

    return await prisma.userCommunityProfile.create({
      data: {
        userId,
        userType,
        username: username.toLowerCase(),
        displayName: name,
        avatar: img,
        bio: null,
        isPrivate: false,
        showKarma: "everyone",
        karmaPoints: 0,
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
      },
    });
  } catch (error) {

    console.log("Profile creation skipped for:", userId);
    return null;
  }
}

export async function getPublicUsers(limit: number = 50) {
  const { userId } = auth();

  try {

    const profiles = await prisma.userCommunityProfile.findMany({
      where: { isPrivate: false },
      select: {
        userId: true,
        username: true,
        displayName: true,
        avatar: true,
        followerCount: true,
        karmaPoints: true,
        currentStreak: true,
        isPrivate: true,
      },
      orderBy: { followerCount: "desc" },
      take: limit,
    });

    const profileIds = new Set(profiles.map((p) => p.userId));

    const [students, teachers, parents, admins] = await Promise.all([
      prisma.student.findMany({
        where: profileIds.size > 0 ? { id: { notIn: Array.from(profileIds) } } : {},
        select: { id: true, name: true, username: true, img: true },
        take: limit,
      }),
      prisma.teacher.findMany({
        where: profileIds.size > 0 ? { id: { notIn: Array.from(profileIds) } } : {},
        select: { id: true, name: true, username: true, img: true },
        take: limit,
      }),
      prisma.parent.findMany({
        where: profileIds.size > 0 ? { id: { notIn: Array.from(profileIds) } } : {},
        select: { id: true, name: true, username: true },
        take: limit,
      }),
      prisma.admin.findMany({
        where: profileIds.size > 0 ? { id: { notIn: Array.from(profileIds) } } : {},
        select: { id: true, username: true },
        take: limit,
      }),
    ]);

    const allUsersList = [
      ...profiles.map((p) => ({
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        avatar: p.avatar,
        followerCount: p.followerCount,
        karmaPoints: p.karmaPoints ?? 0,
        currentStreak: p.currentStreak ?? 0,
        isPrivate: p.isPrivate,
        isFollowing: false,
        isOwnProfile: userId === p.userId,
      })),
      ...students.map((u) => ({
        userId: u.id,
        username: u.username || `user_${u.id.slice(-8)}`,
        displayName: u.name,
        avatar: u.img || null,
        followerCount: 0,
        karmaPoints: 0,
        currentStreak: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === u.id,
      })),
      ...teachers.map((u) => ({
        userId: u.id,
        username: u.username || `user_${u.id.slice(-8)}`,
        displayName: u.name,
        avatar: u.img || null,
        followerCount: 0,
        karmaPoints: 0,
        currentStreak: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === u.id,
      })),
      ...parents.map((u) => ({
        userId: u.id,
        username: u.username || `user_${u.id.slice(-8)}`,
        displayName: u.name,
        avatar: null,
        followerCount: 0,
        karmaPoints: 0,
        currentStreak: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === u.id,
      })),
      ...admins.map((u) => ({
        userId: u.id,
        username: u.username || `admin_${u.id.slice(-8)}`,
        displayName: u.username,
        avatar: null,
        followerCount: 0,
        karmaPoints: 0,
        currentStreak: 0,
        isPrivate: false,
        isFollowing: false,
        isOwnProfile: userId === u.id,
      })),
    ];

    if (userId && allUsersList.length > 0) {
      const otherUserIds = allUsersList.filter((u) => u.userId !== userId).map((u) => u.userId);
      const follows = await prisma.communityFollow.findMany({
        where: { followerId: userId, followingId: { in: otherUserIds } },
        select: { followingId: true },
      });
      const followSet = new Set(follows.map((f) => f.followingId));
      for (const user of allUsersList) {
        if (user.userId !== userId) {
          user.isFollowing = followSet.has(user.userId);
        }
      }
    }

    for (const u of students) {
      getOrCreateCommunityProfile(u.id, u.name, u.username || `user_${u.id.slice(-8)}`, u.img, "student").catch(() => {});
    }
    for (const u of teachers) {
      getOrCreateCommunityProfile(u.id, u.name, u.username || `user_${u.id.slice(-8)}`, u.img, "teacher").catch(() => {});
    }
    for (const u of parents) {
      getOrCreateCommunityProfile(u.id, u.name, u.username || `user_${u.id.slice(-8)}`, null, "parent").catch(() => {});
    }
    for (const u of admins) {
      getOrCreateCommunityProfile(u.id, u.username, u.username || `admin_${u.id.slice(-8)}`, null, "admin").catch(() => {});
    }

    return allUsersList.slice(0, limit);
  } catch (error) {
    console.error("Get public users error:", error);
    return [];
  }
}

export async function getNavbarAvatarData() {
  const { userId, sessionClaims } = auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const communityProfiles = await prisma.$queryRaw`
    SELECT "customAvatar", "avatar" FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const communityProfile = (communityProfiles as any[])[0];

  const equipped = await prisma.userEquippedAvatar.findUnique({
    where: { userId },
  });

  const fallback = clerkUser?.imageUrl || "/noAvatar.png";

  const communityEquippedUrl =
    equipped?.communityStyle && equipped?.communitySeed
      ? generateAvatarUrl(equipped.communityStyle, equipped.communitySeed)
      : null;
  const communityAvatar =
    communityProfile?.customAvatar ||
    communityProfile?.avatar ||
    communityEquippedUrl ||
    fallback;

  let academicAvatar =
    equipped?.academicStyle && equipped?.academicSeed
      ? generateAvatarUrl(equipped.academicStyle, equipped.academicSeed)
      : fallback;

  if (academicAvatar === fallback) {
    if (role === "student") {
      const student = await prisma.student.findUnique({
        where: { id: userId },
        select: { img: true },
      });
      if (student?.img) academicAvatar = student.img;
    } else if (role === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { img: true },
      });
      if (teacher?.img) academicAvatar = teacher.img;
    }
  }

  return { communityAvatar, academicAvatar, fallback };
}

export async function checkUsernameAvailable(username: string, currentUserId?: string) {
  const existingProfiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const existing = (existingProfiles as any[])[0] || null;

  if (!existing) return { available: true };
  if (currentUserId && existing.userId === currentUserId) return { available: true };

  return { available: false };
}
