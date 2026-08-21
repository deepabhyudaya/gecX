"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getKarmaSettings } from "./karma-settings.actions";

const KARMA_WEIGHTS = {
  academic: 0.4,
  engagement: 0.6,
};

export async function addKarmaToAdminsForTesting() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const admins = await prisma.admin.findMany({
    select: { id: true, username: true },
  });

  const results = [];

  for (const admin of admins) {

    let profile = await prisma.userCommunityProfile.findUnique({
      where: { userId: admin.id },
    });

    if (!profile) {

      profile = await prisma.userCommunityProfile.create({
        data: {
          userId: admin.id,
          userType: "admin",
          username: admin.username || `admin_${admin.id.slice(-8)}`,
          displayName: admin.username || "Admin",
          karmaPoints: 5000000,
        },
      });
    } else {

      profile = await prisma.userCommunityProfile.update({
        where: { userId: admin.id },
        data: { karmaPoints: profile.karmaPoints + 5000000 },
      });
    }

    results.push({
      adminId: admin.id,
      username: profile.username,
      newKarma: profile.karmaPoints,
    });
  }

  return { success: true, updated: results.length, admins: results };
}

export async function addCustomKarmaToUser(username: string, amount: number) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  if (!username || typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid username or amount");
  }

  let userProfile = await prisma.userCommunityProfile.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (!userProfile) {
    const clerkUser = await (await import("@clerk/nextjs/server")).clerkClient.users.getUserList({ query: username.toLowerCase() });
    const matched = clerkUser.data[0];
    if (!matched) throw new Error("User not found in auth system");
    const userType = ((matched.publicMetadata as any)?.role as string) || "student";
    userProfile = await prisma.userCommunityProfile.create({
      data: {
        userId: matched.id,
        userType,
        username: username.toLowerCase(),
        displayName: matched.firstName || matched.username || username,
        karmaPoints: amount,
      },
    });
    return {
      success: true,
      username: userProfile.username,
      oldKarma: 0,
      newKarma: amount,
      added: amount,
    };
  }

  const updatedProfile = await prisma.userCommunityProfile.update({
    where: { userId: userProfile.userId },
    data: { karmaPoints: userProfile.karmaPoints + amount },
  });

  return {
    success: true,
    username: updatedProfile.username,
    oldKarma: userProfile.karmaPoints,
    newKarma: updatedProfile.karmaPoints,
    added: amount,
  };
}

export async function calculateKarma(userId: string) {

  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: {
      results: {
        include: {
          exam: true,
          assignment: true,
        },
      },
      attendances: true,
    },
  });

  let academicKarma = 0;
  const settings = await getKarmaSettings();

  if (student) {

    for (const result of student.results) {
      if (result.score >= 95) {
        academicKarma += settings.resultAbove95;
      } else if (result.score >= 90) {
        academicKarma += settings.resultAbove90;
      } else if (result.score >= 85) {
        academicKarma += settings.resultAbove85;
      } else if (result.score >= 80) {
        academicKarma += settings.resultAbove80;
      } else if (result.score >= 70) {
        academicKarma += settings.resultAbove70;
      } else if (result.score >= 60) {
        academicKarma += settings.resultAbove60;
      }
    }

    const attendanceByWeek = new Map<string, { total: number; present: number }>();
    for (const attendance of student.attendances) {
      const weekKey = getWeekKey(attendance.date);
      const week = attendanceByWeek.get(weekKey) || { total: 0, present: 0 };
      week.total++;
      if (attendance.present) {
        week.present++;

        academicKarma += settings.attendancePerDay;
      }
      attendanceByWeek.set(weekKey, week);
    }

    for (const week of Array.from(attendanceByWeek.values())) {
      if (week.total > 0 && week.present === week.total) {
        academicKarma += settings.perfectAttendanceWeek;
      }
    }
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: userId },
    include: { attendances: true },
  });

  if (teacher) {
    const attendanceByWeek = new Map<string, { total: number; present: number }>();
    for (const attendance of teacher.attendances) {
      const weekKey = getWeekKey(attendance.date);
      const week = attendanceByWeek.get(weekKey) || { total: 0, present: 0 };
      week.total++;
      if (attendance.present) week.present++;
      attendanceByWeek.set(weekKey, week);
    }

    for (const week of Array.from(attendanceByWeek.values())) {
      if (week.total > 0 && week.present === week.total) {
        academicKarma += settings.perfectAttendanceWeek;
      }
    }
  }

  const profile = await prisma.userCommunityProfile.findUnique({
    where: { userId },
    include: {
      posts: {
        include: {
          likes: true,
          reposts: { where: { isDeleted: false } },
        },
      },
    },
  });

  let engagementKarma = 0;
  let postLikesReceived = 0;
  let repostsReceived = 0;

  if (profile) {

    for (const post of profile.posts) {
      postLikesReceived += post.likes.length;
    }

    for (const post of profile.posts) {
      repostsReceived += post.reposts.length;
    }
  }

  const totalPostLikesReceived = postLikesReceived;

  const commentLikes = await prisma.communityCommentLike.count({
    where: {
      comment: { authorId: userId },
    },
  });

  const groupMessageReactions = await prisma.groupMessageReaction.count({
    where: {
      message: { senderId: userId },
    },
  });

  const maxAcademicKarma = 1000;
  const maxEngagementKarma = 2000;

  const cappedAcademic = Math.min(academicKarma, maxAcademicKarma);
  const cappedEngagement = Math.min(engagementKarma, maxEngagementKarma);

  const totalKarma = Math.round(
    cappedAcademic * KARMA_WEIGHTS.academic +
    cappedEngagement * KARMA_WEIGHTS.engagement
  );

  await prisma.userCommunityProfile.upsert({
    where: { userId },
    update: { karmaPoints: totalKarma },
    create: {
      userId,
      userType: "student",
      username: userId.toLowerCase(),
      karmaPoints: totalKarma,
    },
  });

  return {
    totalKarma,
    breakdown: {
      academic: {
        raw: academicKarma,
        capped: cappedAcademic,
        weight: KARMA_WEIGHTS.academic,
        contribution: Math.round(cappedAcademic * KARMA_WEIGHTS.academic),
      },
      engagement: {
        raw: engagementKarma,
        capped: cappedEngagement,
        weight: KARMA_WEIGHTS.engagement,
        contribution: Math.round(cappedEngagement * KARMA_WEIGHTS.engagement),
      },
    },
    details: {
      assignmentsCompleted: student?.results.length || 0,
      postsCreated: profile?.postCount || 0,
      postLikesReceived,
      commentLikesReceived: commentLikes,
      repostsReceived: profile?.posts.reduce((acc: number, p: { reposts: { length: number } }) => acc + p.reposts.length, 0) || 0,
      groupMessageReactionsReceived: groupMessageReactions,
    },
  };
}

export async function getKarmaBreakdown(userId?: string) {
  const { userId: currentUserId } = auth();
  const targetUserId = userId || currentUserId;

  if (!targetUserId) throw new Error("Unauthorized");

  return await calculateKarma(targetUserId);
}

export async function syncAllKarma() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const profiles = await prisma.userCommunityProfile.findMany({
    select: { userId: true },
  });

  const results = [];
  for (const profile of profiles) {
    try {
      const karma = await calculateKarma(profile.userId);
      results.push({ userId: profile.userId, karma: karma.totalKarma });
    } catch (e) {
      results.push({ userId: profile.userId, error: (e as Error).message });
    }
  }

  return { synced: results.length, results };
}

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export async function getKarmaLeaderboard(limit: number = 20) {

  const { getAllTimeLeaderboard } = await import("./karma-tracking.actions");
  return getAllTimeLeaderboard(limit);
}

export async function getLeaderboard(timeframe: "today" | "week" | "month" | "all" = "all", limit: number = 20) {
  const { getLeaderboard: getLeaderboardImpl } = await import("./karma-tracking.actions");
  return getLeaderboardImpl(timeframe, limit);
}

export async function getUserKarmaBreakdown(userId: string) {
  const { getUserKarmaBreakdown: getUserKarmaBreakdownImpl } = await import("./karma-tracking.actions");
  return getUserKarmaBreakdownImpl(userId);
}
