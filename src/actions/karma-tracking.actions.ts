"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function recordKarmaEarned(
  userId: string,
  points: number,
  source?: string
) {
  if (points <= 0) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  await prisma.$executeRaw`
    INSERT INTO "KarmaHistory" ("id", "userId", "date", "year", "month", "day", "karmaEarned", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${userId}, ${today}, ${year}, ${month}, ${day}, ${points}, NOW(), NOW())
    ON CONFLICT ("userId", "date") DO UPDATE
    SET "karmaEarned" = "KarmaHistory"."karmaEarned" + EXCLUDED."karmaEarned",
        "updatedAt" = NOW();
  `;

  await prisma.userCommunityProfile.upsert({
    where: { userId },
    update: { karmaPoints: { increment: points } },
    create: {
      userId,
      userType: "student",
      username: userId.toLowerCase(),
      karmaPoints: points,
    },
  });

  revalidateTag("leaderboard");
  revalidatePath("/leaderboard");
  revalidatePath(`/${userId}`);

  console.log(`[Karma] ${userId} earned ${points} points from ${source || "unknown"}`);
}

export async function getKarmaHistory(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.karmaHistory.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: "desc",
    },
  });
}

export async function getTodayKarma(userId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStr = today.toISOString().split('T')[0];

  const result = await prisma.$queryRaw`
    SELECT "karmaEarned" FROM "KarmaHistory"
    WHERE "userId" = ${userId} AND "date" = ${dateStr}::date
    LIMIT 1
  `;
  const history = (result as any[])[0];

  return history?.karmaEarned || 0;
}

export async function getThisWeekKarma(userId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startStr = startOfWeek.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  const result = await prisma.$queryRaw`
    SELECT SUM("karmaEarned") as "totalKarma" FROM "KarmaHistory"
    WHERE "userId" = ${userId}
    AND "date" >= ${startStr}::date
    AND "date" <= ${endStr}::date
  `;
  const total = (result as any[])[0]?.totalKarma;

  return Number(total) || 0;
}

export async function getThisMonthKarma(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const result = await prisma.$queryRaw`
    SELECT SUM("karmaEarned") as "totalKarma" FROM "KarmaHistory"
    WHERE "userId" = ${userId}
    AND "year" = ${year}
    AND "month" = ${month}
  `;
  const total = (result as any[])[0]?.totalKarma;

  return Number(total) || 0;
}

export async function getMyKarmaBreakdown() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const [today, week, month] = await Promise.all([
    getTodayKarma(userId),
    getThisWeekKarma(userId),
    getThisMonthKarma(userId),
  ]);

  const profiles = await prisma.$queryRaw`
    SELECT "karmaPoints" FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  return {
    today,
    week,
    month,
    total: profile?.karmaPoints || 0,
  };
}

export async function getUserKarmaBreakdown(userId: string) {
  const [today, week, month] = await Promise.all([
    getTodayKarma(userId),
    getThisWeekKarma(userId),
    getThisMonthKarma(userId),
  ]);

  const profiles = await prisma.$queryRaw`
    SELECT "karmaPoints", "showKarma" FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0] || null;

  if (!profile || profile.showKarma === "nobody") {
    return null;
  }

  return {
    today,
    week,
    month,
    total: profile.karmaPoints || 0,
  };
}

export async function getDailyLeaderboard(limit: number = 20) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStr = today.toISOString().split('T')[0];

  const entries = await prisma.$queryRaw`
    SELECT kh."karmaEarned", ucp."userId", ucp."username", ucp."displayName", ucp."avatar", ucp."customAvatar", ucp."karmaPoints", ucp."currentStreak"
    FROM "KarmaHistory" kh
    JOIN "UserCommunityProfile" ucp ON kh."userId" = ucp."userId"
    WHERE kh."date" = ${dateStr}::date AND ucp."showKarma" = 'everyone'
    ORDER BY kh."karmaEarned" DESC
    LIMIT ${limit}
  `;

  return (entries as any[]).map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    username: entry.username,
    displayName: entry.displayName,
    avatar: entry.customAvatar || entry.avatar,
    karmaEarned: entry.karmaEarned,
    totalKarma: entry.karmaPoints,
    currentStreak: Number(entry.currentStreak) || 0,
  }));
}

export async function getWeeklyLeaderboard(limit: number = 20) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startStr = startOfWeek.toISOString().split('T')[0];
  const endStr = endOfWeek.toISOString().split('T')[0];

  const entries = await prisma.$queryRaw`
    SELECT "userId", SUM("karmaEarned") as "totalKarma"
    FROM "KarmaHistory"
    WHERE "date" >= ${startStr}::date AND "date" <= ${endStr}::date
    GROUP BY "userId"
    ORDER BY SUM("karmaEarned") DESC
    LIMIT ${limit}
  `;

  const userIds = (entries as any[]).map((e) => e.userId);
  if (userIds.length === 0) return [];

  const users = await prisma.$queryRaw`
    SELECT "userId", "username", "displayName", "avatar", "customAvatar", "karmaPoints", "currentStreak"
    FROM "UserCommunityProfile"
    WHERE "userId" IN (${Prisma.join(userIds)}) AND "showKarma" = 'everyone'
  `;

  const userMap = new Map((users as any[]).map((u) => [u.userId, u]));

  return (entries as any[])
    .map((entry, index) => {
      const user = userMap.get(entry.userId);
      if (!user) return null;
      return {
        rank: index + 1,
        userId: entry.userId,
        username: user.username,
        displayName: user.displayName,
        avatar: user.customAvatar || user.avatar,
        karmaEarned: Number(entry.totalKarma) || 0,
        totalKarma: user.karmaPoints,
        currentStreak: Number(user.currentStreak) || 0,
      };
    })
    .filter(Boolean) as LeaderboardEntry[];
}

export async function getMonthlyLeaderboard(limit: number = 20) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const entries = await prisma.$queryRaw`
    SELECT "userId", SUM("karmaEarned") as "totalKarma"
    FROM "KarmaHistory"
    WHERE "year" = ${year} AND "month" = ${month}
    GROUP BY "userId"
    ORDER BY SUM("karmaEarned") DESC
    LIMIT ${limit}
  `;

  const userIds = (entries as any[]).map((e) => e.userId);
  if (userIds.length === 0) return [];

  const users = await prisma.$queryRaw`
    SELECT "userId", "username", "displayName", "avatar", "customAvatar", "karmaPoints", "currentStreak"
    FROM "UserCommunityProfile"
    WHERE "userId" IN (${Prisma.join(userIds)}) AND "showKarma" = 'everyone'
  `;

  const userMap = new Map((users as any[]).map((u) => [u.userId, u]));

  return (entries as any[])
    .map((entry, index) => {
      const user = userMap.get(entry.userId);
      if (!user) return null;
      return {
        rank: index + 1,
        userId: entry.userId,
        username: user.username,
        displayName: user.displayName,
        avatar: user.customAvatar || user.avatar,
        karmaEarned: Number(entry.totalKarma) || 0,
        totalKarma: user.karmaPoints,
        currentStreak: Number(user.currentStreak) || 0,
      };
    })
    .filter(Boolean) as LeaderboardEntry[];
}

export async function getAllTimeLeaderboard(limit: number = 20) {

  const users = await prisma.$queryRaw`
    SELECT "userId", "username", "displayName", "avatar", "customAvatar", "karmaPoints", "currentStreak"
    FROM "UserCommunityProfile"
    WHERE "showKarma" = 'everyone' AND "karmaPoints" > 0
    ORDER BY "karmaPoints" DESC
    LIMIT ${limit}
  `;

  return (users as any[]).map((user, index) => ({
    rank: index + 1,
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    avatar: user.customAvatar || user.avatar,
    karmaEarned: user.karmaPoints,
    totalKarma: user.karmaPoints,
    currentStreak: Number(user.currentStreak) || 0,
  }));
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  karmaEarned: number;
  totalKarma: number;
  currentStreak: number;
};

export async function getLeaderboard(
  timeframe: "today" | "week" | "month" | "all",
  limit: number = 20
) {
  switch (timeframe) {
    case "today":
      return getDailyLeaderboard(limit);
    case "week":
      return getWeeklyLeaderboard(limit);
    case "month":
      return getMonthlyLeaderboard(limit);
    case "all":
      return getAllTimeLeaderboard(limit);
    default:
      return getAllTimeLeaderboard(limit);
  }
}

export async function getMyRank(timeframe: "today" | "week" | "month" | "all") {
  const { userId } = auth();
  if (!userId) return null;

  const profiles = await prisma.$queryRaw`
    SELECT "showKarma" FROM "UserCommunityProfile"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];

  if (!profile || profile.showKarma === "nobody") return null;

  const leaderboard = await getLeaderboard(timeframe, 100);
  const userEntry = leaderboard.find((e: LeaderboardEntry) => e.userId === userId);

  return userEntry?.rank || null;
}
