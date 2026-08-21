import { BadgeCategory, BadgeColor } from '@prisma/client';
import prisma from './prisma';

const TIER_COLORS: Record<number, BadgeColor> = {
  1: 'PINK', 2: 'PURPLE', 3: 'GREEN', 4: 'BLUE', 5: 'GOLD'
};

function getTierAndColor(count: number, thresholds: number[]) {
  let tier = null;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (count >= thresholds[i]) {
      tier = i + 1;
      break;
    }
  }
  return tier ? { tier, color: TIER_COLORS[tier], count } : null;
}

async function getCurrentStreak(userId: string): Promise<number> {
  const attendances = await prisma.attendance.findMany({
    where: { studentId: userId, present: true },
    orderBy: { date: 'desc' }
  });

  return attendances.length;
}

export async function calculateAttendanceBadge(userId: string) {
  const streakDays = await getCurrentStreak(userId);
  return getTierAndColor(streakDays, [5, 12, 21, 45, 75]);
}

export async function calculateResultsBadge(userId: string) {
  const count = await prisma.result.count({
    where: { studentId: userId, score: { gte: 90 } }
  });
  return getTierAndColor(count, [1, 3, 7, 15, 30]);
}

export async function calculateLeaderboardBadge(userId: string, period: 'ALL_TIME' | 'MONTH' | 'WEEK' | 'TODAY') {
  const count = await prisma.leaderboardTop10History.count({
    where: { userId, category: period }
  });
  return getTierAndColor(count, [1, 3, 7]);
}

export async function calculateCoursesBadge(userId: string) {

  const count = await prisma.courseEnrollment.count({
    where: { studentId: userId }
  });
  return getTierAndColor(count, [1, 3, 7, 15, 25]);
}

export async function calculateVerifiedBadge(userId: string) {

  const count = await prisma.communityPost.count({
    where: { authorId: userId }
  });
  return getTierAndColor(count, [1, 5, 15, 35, 75]);
}

export async function getBadgesForUser(userId: string, forceRecalculate = false) {
  if (!forceRecalculate) {
    const cached = await prisma.badgeCache.findUnique({ where: { userId } });
    if (cached && !cached.invalidated) {
      const isFresh = (Date.now() - cached.computedAt.getTime()) < 1000 * 60 * 60;
      if (isFresh) return cached.badgeJson;
    }
  }

  const safeResult = (res: { tier: number; color: BadgeColor; count: number } | null) =>
    res ?? { tier: null, color: null, count: 0 };

  const calculations = await Promise.all([
    calculateAttendanceBadge(userId).then(res => ({ category: BadgeCategory.ATTENDANCE_STREAK, ...safeResult(res) })),
    calculateResultsBadge(userId).then(res => ({ category: BadgeCategory.RESULTS_90, ...safeResult(res) })),
    calculateLeaderboardBadge(userId, 'ALL_TIME').then(res => ({ category: BadgeCategory.LEADERBOARD_ALL_TIME, ...safeResult(res) })),
    calculateLeaderboardBadge(userId, 'MONTH').then(res => ({ category: BadgeCategory.LEADERBOARD_MONTH, ...safeResult(res) })),
    calculateLeaderboardBadge(userId, 'WEEK').then(res => ({ category: BadgeCategory.LEADERBOARD_WEEK, ...safeResult(res) })),
    calculateLeaderboardBadge(userId, 'TODAY').then(res => ({ category: BadgeCategory.LEADERBOARD_TODAY, ...safeResult(res) })),
    calculateCoursesBadge(userId).then(res => ({ category: BadgeCategory.COURSES_COMPLETED, ...safeResult(res) })),
    calculateVerifiedBadge(userId).then(res => ({ category: BadgeCategory.VERIFIED_ANSWERS, ...safeResult(res) }))
  ]);

  const userBadges = await prisma.userBadge.findMany({ where: { userId } });
  const badgeMap = new Map(userBadges.map(b => [b.category, b]));

  const finalBadges = calculations.map(calc => {
    const existing = badgeMap.get(calc.category);

    if (existing?.adminSet) {
      return {
        category: calc.category,
        tier: existing.currentTier,
        color: existing.currentColor || TIER_COLORS[existing.currentTier ?? 1] || 'PINK',
        count: existing.achievementCount || calc.count || 0,
      };
    }

    if (calc.tier) {
      prisma.userBadge.upsert({
        where: { userId_category: { userId, category: calc.category } },
        update: { currentTier: calc.tier, currentColor: calc.color as BadgeColor, achievementCount: calc.count! },
        create: { userId, category: calc.category, currentTier: calc.tier, currentColor: calc.color as BadgeColor, achievementCount: calc.count! }
      }).catch(console.error);
    } else if (existing && !existing.adminSet) {
       prisma.userBadge.delete({ where: { id: existing.id } }).catch(console.error);
    }

    return {
      category: calc.category,
      tier: calc.tier,
      color: calc.color,
      count: calc.count,
    };
  }).filter(b => !!b.tier);

  await prisma.badgeCache.upsert({
    where: { userId },
    update: { badgeJson: JSON.parse(JSON.stringify(finalBadges)), computedAt: new Date(), invalidated: false },
    create: { userId, badgeJson: JSON.parse(JSON.stringify(finalBadges)) }
  });

  return finalBadges;
}
