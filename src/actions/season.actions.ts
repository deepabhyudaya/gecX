"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";

async function requireAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");
  return role;
}

function generateSeasonCode(cycleNumber: number, seasonNumber: number) {
  return `C${cycleNumber}S${seasonNumber}`;
}

export async function createSeason(input: {
  collegeId?: string | null;
  cycleNumber: number;
  seasonNumber: number;
  displayName?: string;
  seasonType?: "BRANCH" | "STUDENT" | "BOTH";
  startDate: Date;
  endDate: Date;
  conquerorSize?: number;
  iconUrl?: string;
  bannerUrl?: string;
  ranks?: Array<{
    rankOrder: number;
    rankName: string;
    minPoints: number;
    iconUrl?: string;
    colorHex?: string;
    isConqueror?: boolean;
  }>;
  pointConfig?: {
    branchWarWin?: number;
    branchWarWinDominant?: number;
    branchWarPerfect?: number;
    branchWarLoss?: number;
    branchWarRoundWin?: number;
    branchWarMvpBonus?: number;
    individualBranchWin?: number;
    individualWarriorBonus?: number;
    individualWarriorWinBonus?: number;
    individualMvpBonus?: number;
    individualLoserTopScorer?: number;
    individualParticipation?: number;
    studentWarWin?: number;
    studentWarSweep?: number;
    studentWarLoss?: number;
    studentWarUnderdog?: number;
    studentWarAllyWin?: number;
    gecxRewardsByRank?: Record<string, number>;
  };
}) {
  await requireAdmin();

  const seasonCode = generateSeasonCode(input.cycleNumber, input.seasonNumber);

  const existing = await prisma.season.findFirst({
    where: {
      collegeId: input.collegeId ?? null,
      cycleNumber: input.cycleNumber,
      seasonNumber: input.seasonNumber,
      seasonType: input.seasonType ?? "BOTH",
    },
  });
  if (existing) throw new Error(`Season ${seasonCode} already exists for this college and type`);

  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");

  const season = await prisma.season.create({
    data: {
      collegeId: input.collegeId ?? null,
      cycleNumber: input.cycleNumber,
      seasonNumber: input.seasonNumber,
      seasonCode,
      displayName: input.displayName ?? null,
      seasonType: input.seasonType ?? "BOTH",
      startDate: input.startDate,
      endDate: input.endDate,
      conquerorSize: input.conquerorSize ?? 10,
      iconUrl: input.iconUrl ?? null,
      bannerUrl: input.bannerUrl ?? null,
      createdById: userId,
      pointConfig: input.pointConfig
        ? {
            create: {
              branchWarWin: input.pointConfig.branchWarWin ?? 150,
              branchWarWinDominant: input.pointConfig.branchWarWinDominant ?? 50,
              branchWarPerfect: input.pointConfig.branchWarPerfect ?? 75,
              branchWarLoss: input.pointConfig.branchWarLoss ?? 25,
              branchWarRoundWin: input.pointConfig.branchWarRoundWin ?? 30,
              branchWarMvpBonus: input.pointConfig.branchWarMvpBonus ?? 20,
              individualBranchWin: input.pointConfig.individualBranchWin ?? 50,
              individualWarriorBonus: input.pointConfig.individualWarriorBonus ?? 30,
              individualWarriorWinBonus: input.pointConfig.individualWarriorWinBonus ?? 40,
              individualMvpBonus: input.pointConfig.individualMvpBonus ?? 60,
              individualLoserTopScorer: input.pointConfig.individualLoserTopScorer ?? 25,
              individualParticipation: input.pointConfig.individualParticipation ?? 10,
              studentWarWin: input.pointConfig.studentWarWin ?? 100,
              studentWarSweep: input.pointConfig.studentWarSweep ?? 50,
              studentWarLoss: input.pointConfig.studentWarLoss ?? 15,
              studentWarUnderdog: input.pointConfig.studentWarUnderdog ?? 25,
              studentWarAllyWin: input.pointConfig.studentWarAllyWin ?? 20,
              gecxRewardsByRank: input.pointConfig.gecxRewardsByRank ?? undefined,
            },
          }
        : undefined,
      ranks: input.ranks?.length
        ? {
            create: input.ranks.map((r) => ({
              rankOrder: r.rankOrder,
              rankName: r.rankName,
              rankCode: `rank_${r.rankOrder}`,
              minPoints: r.minPoints,
              iconUrl: r.iconUrl ?? null,
              colorHex: r.colorHex ?? null,
              isConqueror: r.isConqueror ?? false,
            })),
          }
        : undefined,
    },
    include: { ranks: true, pointConfig: true },
  });

  revalidatePath("/admin/seasons");
  return season;
}

export async function updateSeason(
  seasonId: string,
  input: Partial<{
    displayName: string;
    startDate: Date;
    endDate: Date;
    conquerorSize: number;
    iconUrl: string;
    bannerUrl: string;
    pointMultiplierActive: boolean;
    pointMultiplierValue: number;
    multiplierLabel: string;
  }>
) {
  await requireAdmin();

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");
  if (season.status === "CONCLUDED") throw new Error("Cannot edit a concluded season");

  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.conquerorSize !== undefined && { conquerorSize: input.conquerorSize }),
      ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }),
      ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
      ...(input.pointMultiplierActive !== undefined && { pointMultiplierActive: input.pointMultiplierActive }),
      ...(input.pointMultiplierValue !== undefined && { pointMultiplierValue: input.pointMultiplierValue }),
      ...(input.multiplierLabel !== undefined && { multiplierLabel: input.multiplierLabel }),
    },
  });

  revalidatePath("/admin/seasons");
  return updated;
}

export async function startSeason(seasonId: string) {
  await requireAdmin();

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");
  if (season.status !== "UPCOMING") throw new Error("Only upcoming seasons can be started");

  const now = new Date();
  if (now < season.startDate) throw new Error("Cannot start before scheduled start date");

  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: { status: "ACTIVE" },
  });

  await createNotificationsForUsers({
    title: `Season ${season.seasonCode} Started!`,
    message: season.displayName
      ? `${season.displayName} is now live. Fight for glory!`
      : `A new season has begun. Good luck!`,
    type: "SEASON_STARTED",
    entityId: seasonId,

    studentIds: [],
  });

  revalidatePath("/admin/seasons");
  return updated;
}

export async function triggerSeasonConclusion(seasonId: string) {
  await requireAdmin();

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { ranks: true, pointConfig: true },
  });
  if (!season) throw new Error("Season not found");
  if (season.status !== "ACTIVE") throw new Error("Only active seasons can be concluded");

  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");

  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: {
      status: "CONCLUDING",
      concludingStartedAt: new Date(),
      concludedById: userId,
    },
  });

  await createNotificationsForUsers({
    title: `Season ${season.seasonCode} is Concluding`,
    message: "Final results are being calculated. Rewards will be distributed shortly.",
    type: "SEASON_CONCLUDING",
    entityId: seasonId,
    studentIds: [],
  });

  revalidatePath("/admin/seasons");
  return updated;
}

export async function activateSeasonMultiplier(
  seasonId: string,
  multiplierValue: number,
  label: string
) {
  await requireAdmin();

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");
  if (season.status !== "ACTIVE") throw new Error("Multiplier can only be activated on active seasons");

  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: {
      pointMultiplierActive: true,
      pointMultiplierValue: multiplierValue,
      multiplierLabel: label,
    },
  });

  await createNotificationsForUsers({
    title: `Multiplier Active: ${label}`,
    message: `Season points are now multiplied by ${multiplierValue}x!`,
    type: "SEASON_MULTIPLIER_ACTIVE",
    entityId: seasonId,
    studentIds: [],
  });

  return updated;
}

export async function deactivateSeasonMultiplier(seasonId: string) {
  await requireAdmin();

  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: {
      pointMultiplierActive: false,
      pointMultiplierValue: 1.0,
      multiplierLabel: null,
    },
  });

  return updated;
}

export async function listSeasons(collegeId?: string | null) {
  await requireAdmin();

  return prisma.season.findMany({
    where: collegeId !== undefined ? { collegeId: collegeId ?? null } : {},
    include: { ranks: { orderBy: { rankOrder: "asc" } }, pointConfig: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSeasonById(seasonId: string) {
  return prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      ranks: { orderBy: { rankOrder: "asc" } },
      pointConfig: true,
      branchPoints: { include: { class: true, rank: true }, orderBy: { totalPoints: "desc" } },
      studentPoints: { include: { student: true, rank: true }, orderBy: { totalPoints: "desc" } },
    },
  });
}

export async function getActiveSeason(collegeId?: string | null) {
  return prisma.season.findFirst({
    where: {
      status: "ACTIVE",
      collegeId: collegeId ?? null,
    },
    include: { ranks: { orderBy: { rankOrder: "asc" } }, pointConfig: true },
    orderBy: { startDate: "desc" },
  });
}

export async function getStudentSeasonPoints(studentId: string, seasonId: string) {
  return prisma.studentSeasonPoints.findUnique({
    where: { seasonId_studentId: { seasonId, studentId } },
    include: { season: true, rank: true },
  });
}

export async function getStudentSeasonHistory(studentId: string, limit = 10) {
  return prisma.studentSeasonPoints.findMany({
    where: { studentId },
    include: { season: true, rank: true },
    orderBy: { season: { endDate: "desc" } },
    take: limit,
  });
}

export async function getClassSeasonPoints(classId: number, seasonId: string) {
  return prisma.branchSeasonPoints.findUnique({
    where: { seasonId_classId: { seasonId, classId } },
    include: { season: true, rank: true },
  });
}

export async function getActiveSeasonForWar(
  collegeId: string | null,
  warType: "BRANCH" | "STUDENT"
) {
  const typeFilter = warType === "BRANCH"
    ? { in: ["BRANCH", "BOTH"] as const }
    : { in: ["STUDENT", "BOTH"] as const };

  let season = await prisma.season.findFirst({
    where: {
      status: "ACTIVE",
      collegeId,
      seasonType: typeFilter,
    },
    orderBy: { startDate: "desc" },
  });

  if (!season && collegeId !== null) {
    season = await prisma.season.findFirst({
      where: {
        status: "ACTIVE",
        collegeId: null,
        seasonType: typeFilter,
      },
      orderBy: { startDate: "desc" },
    });
  }

  return season;
}

export async function getSeasonLeaderboard(seasonId: string, type: "branch" | "student", limit = 50) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");

  if (type === "branch") {
    return prisma.branchSeasonPoints.findMany({
      where: { seasonId },
      include: { class: true, rank: true },
      orderBy: { totalPoints: "desc" },
      take: limit,
    });
  }

  return prisma.studentSeasonPoints.findMany({
    where: { seasonId },
    include: { student: true, rank: true },
    orderBy: { totalPoints: "desc" },
    take: limit,
  });
}
