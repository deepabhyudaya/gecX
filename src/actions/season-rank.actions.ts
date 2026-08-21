"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");
}

export async function createSeasonRank(
  seasonId: string,
  input: {
    rankOrder: number;
    rankName: string;
    minPoints: number;
    iconUrl?: string;
    colorHex?: string;
    isConqueror?: boolean;
  }
) {
  await requireAdmin();

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");
  if (season.status === "CONCLUDED") throw new Error("Cannot add ranks to a concluded season");

  const existing = await prisma.seasonRank.findUnique({
    where: { seasonId_rankOrder: { seasonId, rankOrder: input.rankOrder } },
  });
  if (existing) throw new Error(`Rank order ${input.rankOrder} already exists for this season`);

  const rank = await prisma.seasonRank.create({
    data: {
      seasonId,
      rankOrder: input.rankOrder,
      rankName: input.rankName,
      rankCode: `rank_${input.rankOrder}`,
      minPoints: input.minPoints,
      iconUrl: input.iconUrl ?? null,
      colorHex: input.colorHex ?? null,
      isConqueror: input.isConqueror ?? false,
    },
  });

  revalidatePath(`/admin/seasons/${seasonId}`);
  return rank;
}

export async function updateSeasonRank(
  rankId: string,
  input: Partial<{
    rankName: string;
    minPoints: number;
    iconUrl: string;
    colorHex: string;
    isConqueror: boolean;
  }>
) {
  await requireAdmin();

  const rank = await prisma.seasonRank.findUnique({ where: { id: rankId }, include: { season: true } });
  if (!rank) throw new Error("Rank not found");
  if (rank.season.status === "CONCLUDED") throw new Error("Cannot edit ranks of a concluded season");

  const updated = await prisma.seasonRank.update({
    where: { id: rankId },
    data: {
      ...(input.rankName !== undefined && { rankName: input.rankName }),
      ...(input.minPoints !== undefined && { minPoints: input.minPoints }),
      ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }),
      ...(input.colorHex !== undefined && { colorHex: input.colorHex }),
      ...(input.isConqueror !== undefined && { isConqueror: input.isConqueror }),
    },
  });

  revalidatePath(`/admin/seasons/${rank.seasonId}`);
  return updated;
}

export async function deleteSeasonRank(rankId: string) {
  await requireAdmin();

  const rank = await prisma.seasonRank.findUnique({ where: { id: rankId }, include: { season: true } });
  if (!rank) throw new Error("Rank not found");
  if (rank.season.status === "CONCLUDED") throw new Error("Cannot delete ranks of a concluded season");

  await prisma.seasonRank.delete({ where: { id: rankId } });
  revalidatePath(`/admin/seasons/${rank.seasonId}`);
  return { success: true };
}

export async function setupDefaultSeasonRanks(seasonId: string) {
  await requireAdmin();

  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");

  const defaults = [
    { rankOrder: 1, rankName: "Bronze", minPoints: 0, colorHex: "#CD7F32" },
    { rankOrder: 2, rankName: "Silver", minPoints: 200, colorHex: "#C0C0C0" },
    { rankOrder: 3, rankName: "Gold", minPoints: 500, colorHex: "#FFD700" },
    { rankOrder: 4, rankName: "Platinum", minPoints: 1000, colorHex: "#3EB489" },
    { rankOrder: 5, rankName: "Diamond", minPoints: 2000, colorHex: "#B9F2FF" },
    { rankOrder: 6, rankName: "Conqueror", minPoints: 5000, colorHex: "#FF4D4D", isConqueror: true },
  ];

  const created = await prisma.$transaction(
    defaults.map((d) =>
      prisma.seasonRank.upsert({
        where: { seasonId_rankOrder: { seasonId, rankOrder: d.rankOrder } },
        update: {},
        create: {
          seasonId,
          rankOrder: d.rankOrder,
          rankName: d.rankName,
          rankCode: `rank_${d.rankOrder}`,
          minPoints: d.minPoints,
          colorHex: d.colorHex,
          isConqueror: d.isConqueror ?? false,
        },
      })
    )
  );

  revalidatePath(`/admin/seasons/${seasonId}`);
  return created;
}
