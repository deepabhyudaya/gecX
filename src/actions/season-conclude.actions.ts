"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";
import { awardGecX } from "./gecx.actions";
import { recalculateSeasonRanks, recalculateConquerors } from "./season-points.actions";
import { autoAwardHonorBadgesForSeason } from "./honor-badge.actions";

async function requireAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");
}

export async function finalizeSeason(seasonId: string) {
  await requireAdmin();

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      pointConfig: true,
      ranks: { orderBy: { rankOrder: "asc" } },
    },
  });
  if (!season) throw new Error("Season not found");
  if (season.status === "CONCLUDED") throw new Error("Season already concluded");

  await recalculateSeasonRanks(seasonId);

  await recalculateConquerors(seasonId);

  const studentRows = await prisma.studentSeasonPoints.findMany({ where: { seasonId } });
  for (const row of studentRows) {
    const total = row.warsWon + row.warsLost;
    const winRate = total > 0 ? row.warsWon / total : 0;
    await prisma.studentSeasonPoints.update({
      where: { id: row.id },
      data: { winRate },
    });
  }

  const gecxRewards: Record<string, number> =
    (season.pointConfig?.gecxRewardsByRank as Record<string, number>) ?? {};
  let rewardsDistributed = 0;

  for (const rank of season.ranks) {
    const rewardAmount = gecxRewards[rank.rankCode];
    if (!rewardAmount || rewardAmount <= 0) continue;

    const studentHolders = await prisma.studentSeasonPoints.findMany({
      where: { seasonId, currentRankId: rank.id },
      include: { student: true },
    });
    for (const holder of studentHolders) {
      try {
        await awardGecX({
          userId: holder.studentId,
          userType: "student",
          amount: rewardAmount,
          type: "season_rank_reward",
          description: `Season ${season.seasonCode} ${rank.rankName} rank reward`,
          relatedId: seasonId,
        });
        await prisma.seasonRewardsDistributed.create({
          data: {
            seasonId,
            userId: holder.studentId,
            rewardType: "GECX",
            rewardValue: String(rewardAmount),
          },
        });
        rewardsDistributed++;
      } catch (err) {
        console.error(`[finalizeSeason] GecX reward failed for ${holder.studentId}:`, err);
      }
    }
  }

  let badgesAwarded = 0;
  try {
    const result = await autoAwardHonorBadgesForSeason(seasonId);
    badgesAwarded = result.awarded;
  } catch (err) {
    console.error("[finalizeSeason] honor badge auto-award failed:", err);
  }

  const { userId } = auth();
  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: {
      status: "CONCLUDED",
      concludedAt: new Date(),
      concludedById: userId ?? null,
    },
  });

  await createNotificationsForUsers({
    title: `Season ${season.seasonCode} Concluded!`,
    message: season.displayName
      ? `${season.displayName} has ended. Check your profile for rewards and badges!`
      : `The season has ended. Rewards distributed!`,
    type: "SEASON_CONCLUDED",
    entityId: seasonId,
    studentIds: [],
  });

  revalidatePath("/admin/seasons");
  return {
    season: updated,
    rewardsDistributed,
    badgesAwarded,
  };
}
