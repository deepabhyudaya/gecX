"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");
}

async function getPointConfig(seasonId: string) {
  const config = await prisma.seasonPointConfig.findUnique({ where: { seasonId } });
  const defaults = {
    branchWarWin: 150,
    branchWarWinDominant: 50,
    branchWarPerfect: 75,
    branchWarLoss: 25,
    branchWarRoundWin: 30,
    branchWarMvpBonus: 20,
    individualBranchWin: 50,
    individualWarriorBonus: 30,
    individualWarriorWinBonus: 40,
    individualMvpBonus: 60,
    individualLoserTopScorer: 25,
    individualParticipation: 10,
    studentWarWin: 100,
    studentWarSweep: 50,
    studentWarLoss: 15,
    studentWarUnderdog: 25,
    studentWarAllyWin: 20,
  };
  return { ...defaults, ...config };
}

function applyMultiplier(points: number, multiplier: number) {
  return Math.round(points * multiplier);
}

export async function recordBranchWarSeasonPoints(
  rivalryId: string,
  seasonId: string,
  tx?: any
) {
  const db = tx ?? prisma;
  const rivalry = await db.classRivalry.findUnique({
    where: { id: rivalryId },
    include: {
      bouts: true,
      members: { include: { student: true } },
      classA: true,
      classB: true,
    },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "CONCLUDED") throw new Error("War must be concluded");
  if (rivalry.seasonPointsDistributed) return { recorded: false, reason: "Already distributed" };

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");
  if (season.status === "CONCLUDED") throw new Error("Season already concluded");

  const config = await getPointConfig(seasonId);
  const mult = season.pointMultiplierActive ? season.pointMultiplierValue : 1.0;

  const winnerClassId = rivalry.winnerClassId;
  const totalBouts = rivalry.bouts.length;
  const aBoutsWon = rivalry.bouts.filter((b: any) => b.winnerId === rivalry.classAId).length;
  const bBoutsWon = rivalry.bouts.filter((b: any) => b.winnerId === rivalry.classBId).length;
  const isDominant = winnerClassId
    ? (winnerClassId === rivalry.classAId && aBoutsWon > bBoutsWon + 2) ||
      (winnerClassId === rivalry.classBId && bBoutsWon > aBoutsWon + 2)
    : false;
  const isPerfect = winnerClassId && totalBouts > 0
    ? (winnerClassId === rivalry.classAId && bBoutsWon === 0) ||
      (winnerClassId === rivalry.classBId && aBoutsWon === 0)
    : false;

  const branchPointsA =
    (winnerClassId === rivalry.classAId ? config.branchWarWin : config.branchWarLoss) +
    (winnerClassId === rivalry.classAId && isDominant ? config.branchWarWinDominant : 0) +
    (winnerClassId === rivalry.classAId && isPerfect ? config.branchWarPerfect : 0) +
    aBoutsWon * config.branchWarRoundWin;

  const branchPointsB =
    (winnerClassId === rivalry.classBId ? config.branchWarWin : config.branchWarLoss) +
    (winnerClassId === rivalry.classBId && isDominant ? config.branchWarWinDominant : 0) +
    (winnerClassId === rivalry.classBId && isPerfect ? config.branchWarPerfect : 0) +
    bBoutsWon * config.branchWarRoundWin;

  const txs: any[] = [];

  for (const { classId, points, warsWon, warsLost } of [
    {
      classId: rivalry.classAId,
      points: applyMultiplier(branchPointsA, mult),
      warsWon: winnerClassId === rivalry.classAId ? 1 : 0,
      warsLost: winnerClassId === rivalry.classBId ? 1 : 0,
    },
    {
      classId: rivalry.classBId,
      points: applyMultiplier(branchPointsB, mult),
      warsWon: winnerClassId === rivalry.classBId ? 1 : 0,
      warsLost: winnerClassId === rivalry.classAId ? 1 : 0,
    },
  ]) {
    txs.push(
      db.branchSeasonPoints.upsert({
        where: { seasonId_classId: { seasonId, classId } },
        update: {
          totalPoints: { increment: points },
          warsWon: { increment: warsWon },
          warsLost: { increment: warsLost },
          warsParticipated: { increment: 1 },
          lastUpdatedAt: new Date(),
        },
        create: {
          seasonId,
          classId,
          totalPoints: points,
          warsWon,
          warsLost,
          warsParticipated: 1,
        },
      })
    );
    txs.push(
      db.seasonPointTransaction.create({
        data: {
          seasonId,
          recipientType: "BRANCH",
          recipientId: String(classId),
          classRivalryId: rivalryId,
          pointsEarned: points,
          transactionType: warsWon ? "WAR_WIN" : "WAR_LOSS",
          multiplierApplied: mult,
          note: `Branch war ${warsWon ? "win" : warsWon === 0 && warsLost === 0 ? "draw" : "loss"}`,
        },
      })
    );
  }

  const mvpIds = new Set(
    rivalry.members.filter((m: any) => m.isMvp).map((m: any) => m.studentId)
  );
  const topScorerId = rivalry.members.reduce((best: any, m: any) =>
    m.pointsContributed > (best?.pointsContributed ?? -1) ? m : best
  , null)?.studentId;

  for (const member of rivalry.members) {
    const isWinner = member.classId === winnerClassId;
    const isMvp = mvpIds.has(member.studentId);
    const isTopScorer = member.studentId === topScorerId && !isWinner;
    const isWarrior = member.boutsParticipated > 0;
    const warriorWon = isWarrior && isWinner;

    const indPoints =
      (isWinner ? config.individualBranchWin : 0) +
      (isWarrior ? config.individualWarriorBonus : 0) +
      (warriorWon ? config.individualWarriorWinBonus : 0) +
      (isMvp ? config.individualMvpBonus : 0) +
      (isTopScorer ? config.individualLoserTopScorer : 0) +
      config.individualParticipation;

    const finalPoints = applyMultiplier(indPoints, mult);

    txs.push(
      db.studentSeasonPoints.upsert({
        where: { seasonId_studentId: { seasonId, studentId: member.studentId } },
        update: {
          totalPoints: { increment: finalPoints },
          warsWon: { increment: isWinner ? 1 : 0 },
          warsLost: { increment: !isWinner && winnerClassId ? 1 : 0 },
          warsParticipated: { increment: 1 },
          lastUpdatedAt: new Date(),
        },
        create: {
          seasonId,
          studentId: member.studentId,
          totalPoints: finalPoints,
          warsWon: isWinner ? 1 : 0,
          warsLost: !isWinner && winnerClassId ? 1 : 0,
          warsParticipated: 1,
        },
      })
    );
    txs.push(
      db.seasonPointTransaction.create({
        data: {
          seasonId,
          recipientType: "STUDENT",
          recipientId: member.studentId,
          classRivalryId: rivalryId,
          pointsEarned: finalPoints,
          transactionType: isWinner
            ? isMvp
              ? "WAR_MVP"
              : warriorWon
              ? "WAR_WARRIOR_WIN"
              : "WAR_WIN"
            : isTopScorer
            ? "WAR_UNDERDOG"
            : "WAR_PARTICIPATION",
          multiplierApplied: mult,
          note: `Individual ${isWinner ? "win" : "loss"}${isMvp ? " + MVP" : ""}${warriorWon ? " + warrior" : ""}`,
        },
      })
    );
  }

  txs.push(
    db.classRivalry.update({
      where: { id: rivalryId },
      data: { seasonPointsDistributed: true },
    })
  );

  await db.$transaction(txs);

  return { recorded: true, branchPointsA, branchPointsB };
}

export async function recordStudentWarSeasonPoints(
  rivalryId: string,
  seasonId: string,
  tx?: any
) {
  const db = tx ?? prisma;
  const rivalry = await db.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { bouts: true, studentA: true, studentB: true, allies: { where: { status: "ACCEPTED" } } },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.status !== "CONCLUDED") throw new Error("War must be concluded");
  if (rivalry.seasonPointsDistributed) return { recorded: false, reason: "Already distributed" };

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");
  if (season.status === "CONCLUDED") throw new Error("Season already concluded");

  const config = await getPointConfig(seasonId);
  const mult = season.pointMultiplierActive ? season.pointMultiplierValue : 1.0;

  const winnerStudentId = rivalry.winnerStudentId;
  const totalBouts = rivalry.bouts.length;
  const aBoutsWon = rivalry.bouts.filter((b: any) => b.winnerId === rivalry.studentAId).length;
  const bBoutsWon = rivalry.bouts.filter((b: any) => b.winnerId === rivalry.studentBId).length;
  const isSweep = winnerStudentId
    ? (winnerStudentId === rivalry.studentAId && bBoutsWon === 0 && totalBouts > 0) ||
      (winnerStudentId === rivalry.studentBId && aBoutsWon === 0 && totalBouts > 0)
    : false;

  const [aggA, aggB] = await Promise.all([
    db.studentSeasonPoints.findUnique({ where: { seasonId_studentId: { seasonId, studentId: rivalry.studentAId } } }),
    db.studentSeasonPoints.findUnique({ where: { seasonId_studentId: { seasonId, studentId: rivalry.studentBId } } }),
  ]);
  const isUnderdog = winnerStudentId && (
    (winnerStudentId === rivalry.studentAId && (aggB?.totalPoints ?? 0) > (aggA?.totalPoints ?? 0)) ||
    (winnerStudentId === rivalry.studentBId && (aggA?.totalPoints ?? 0) > (aggB?.totalPoints ?? 0))
  );

  const txs: any[] = [];

  for (const { studentId, isWinner, isSweepWin, isUnderdogWin } of [
    {
      studentId: rivalry.studentAId,
      isWinner: winnerStudentId === rivalry.studentAId,
      isSweepWin: winnerStudentId === rivalry.studentAId && isSweep,
      isUnderdogWin: winnerStudentId === rivalry.studentAId && isUnderdog,
    },
    {
      studentId: rivalry.studentBId,
      isWinner: winnerStudentId === rivalry.studentBId,
      isSweepWin: winnerStudentId === rivalry.studentBId && isSweep,
      isUnderdogWin: winnerStudentId === rivalry.studentBId && isUnderdog,
    },
  ]) {
    const points =
      (isWinner ? config.studentWarWin : config.studentWarLoss) +
      (isSweepWin ? config.studentWarSweep : 0) +
      (isUnderdogWin ? config.studentWarUnderdog : 0);
    const finalPoints = applyMultiplier(points, mult);

    txs.push(
      db.studentSeasonPoints.upsert({
        where: { seasonId_studentId: { seasonId, studentId } },
        update: {
          totalPoints: { increment: finalPoints },
          warsWon: { increment: isWinner ? 1 : 0 },
          warsLost: { increment: !isWinner && winnerStudentId ? 1 : 0 },
          warsParticipated: { increment: 1 },
          lastUpdatedAt: new Date(),
        },
        create: {
          seasonId,
          studentId,
          totalPoints: finalPoints,
          warsWon: isWinner ? 1 : 0,
          warsLost: !isWinner && winnerStudentId ? 1 : 0,
          warsParticipated: 1,
        },
      })
    );
    txs.push(
      db.seasonPointTransaction.create({
        data: {
          seasonId,
          recipientType: "STUDENT",
          recipientId: studentId,
          studentRivalryId: rivalryId,
          pointsEarned: finalPoints,
          transactionType: isWinner
            ? isSweepWin
              ? "WAR_SWEEP"
              : isUnderdogWin
              ? "WAR_UNDERDOG"
              : "WAR_WIN"
            : "WAR_LOSS",
          multiplierApplied: mult,
          note: `1v1 duel ${isWinner ? "win" : "loss"}${isSweepWin ? " (sweep)" : ""}${isUnderdogWin ? " (underdog)" : ""}`,
        },
      })
    );
  }

  if (winnerStudentId) {
    const winningAllies = rivalry.allies.filter((a: any) => a.sideStudentId === winnerStudentId);
    for (const ally of winningAllies) {
      const pts = applyMultiplier(config.studentWarAllyWin, mult);
      txs.push(
        db.studentSeasonPoints.upsert({
          where: { seasonId_studentId: { seasonId, studentId: ally.allyStudentId } },
          update: {
            totalPoints: { increment: pts },
            warsParticipated: { increment: 1 },
            lastUpdatedAt: new Date(),
          },
          create: {
            seasonId,
            studentId: ally.allyStudentId,
            totalPoints: pts,
            warsParticipated: 1,
          },
        })
      );
      txs.push(
        db.seasonPointTransaction.create({
          data: {
            seasonId,
            recipientType: "STUDENT",
            recipientId: ally.allyStudentId,
            studentRivalryId: rivalryId,
            pointsEarned: pts,
            transactionType: "WAR_ALLY_WIN",
            multiplierApplied: mult,
            note: `Ally win bonus`,
          },
        })
      );
    }
  }

  txs.push(
    db.studentRivalry.update({
      where: { id: rivalryId },
      data: { seasonPointsDistributed: true },
    })
  );

  await db.$transaction(txs);

  return { recorded: true };
}

export async function recalculateSeasonRanks(seasonId: string, tx?: any) {
  const db = tx ?? prisma;

  const season = await db.season.findUnique({
    where: { id: seasonId },
    include: { ranks: { orderBy: { minPoints: "asc" } } },
  });
  if (!season) throw new Error("Season not found");

  const ranks = season.ranks;
  if (ranks.length === 0) return { branchUpdated: 0, studentUpdated: 0 };

  const branchRows = await db.branchSeasonPoints.findMany({ where: { seasonId } });
  let branchUpdated = 0;
  for (const row of branchRows) {
    let newRankId: string | null = null;
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (row.totalPoints >= ranks[i].minPoints) {
        newRankId = ranks[i].id;
        break;
      }
    }
    if (newRankId !== row.currentRankId) {
      await db.branchSeasonPoints.update({
        where: { id: row.id },
        data: { currentRankId: newRankId },
      });
      branchUpdated++;
    }
  }

  const studentRows = await db.studentSeasonPoints.findMany({ where: { seasonId } });
  let studentUpdated = 0;
  for (const row of studentRows) {
    let newRankId: string | null = null;
    for (let i = ranks.length - 1; i >= 0; i--) {
      if (row.totalPoints >= ranks[i].minPoints) {
        newRankId = ranks[i].id;
        break;
      }
    }
    if (newRankId !== row.currentRankId) {
      await db.studentSeasonPoints.update({
        where: { id: row.id },
        data: { currentRankId: newRankId },
      });
      studentUpdated++;
    }
  }

  return { branchUpdated, studentUpdated };
}

export async function recalculateConquerors(seasonId: string, tx?: any) {
  const db = tx ?? prisma;

  const season = await db.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Season not found");
  const size = season.conquerorSize;

  const branchTop = await db.branchSeasonPoints.findMany({
    where: { seasonId },
    orderBy: { totalPoints: "desc" },
    take: size,
  });
  await db.branchSeasonPoints.updateMany({
    where: { seasonId },
    data: { isConqueror: false, conquerorRank: null },
  });
  for (let i = 0; i < branchTop.length; i++) {
    await db.branchSeasonPoints.update({
      where: { id: branchTop[i].id },
      data: { isConqueror: true, conquerorRank: i + 1 },
    });
  }

  const studentTop = await db.studentSeasonPoints.findMany({
    where: { seasonId },
    orderBy: { totalPoints: "desc" },
    take: size,
  });
  await db.studentSeasonPoints.updateMany({
    where: { seasonId },
    data: { isConqueror: false, conquerorRank: null },
  });
  for (let i = 0; i < studentTop.length; i++) {
    await db.studentSeasonPoints.update({
      where: { id: studentTop[i].id },
      data: { isConqueror: true, conquerorRank: i + 1 },
    });
  }

  return { branchConquerors: branchTop.length, studentConquerors: studentTop.length };
}

export async function updateSeasonPointConfig(
  seasonId: string,
  data: Partial<{
    branchWarWin: number;
    branchWarWinDominant: number;
    branchWarPerfect: number;
    branchWarLoss: number;
    branchWarRoundWin: number;
    branchWarMvpBonus: number;
    individualBranchWin: number;
    individualWarriorBonus: number;
    individualWarriorWinBonus: number;
    individualMvpBonus: number;
    individualLoserTopScorer: number;
    individualParticipation: number;
    studentWarWin: number;
    studentWarSweep: number;
    studentWarLoss: number;
    studentWarUnderdog: number;
    studentWarAllyWin: number;
    gecxRewardsByRank: any;
  }>
) {
  await requireAdmin();

  const existing = await prisma.seasonPointConfig.findUnique({ where: { seasonId } });
  if (existing) {
    await prisma.seasonPointConfig.update({ where: { seasonId }, data });
  } else {
    await prisma.seasonPointConfig.create({
      data: {
        seasonId,
        branchWarWin: data.branchWarWin ?? 150,
        branchWarWinDominant: data.branchWarWinDominant ?? 50,
        branchWarPerfect: data.branchWarPerfect ?? 75,
        branchWarLoss: data.branchWarLoss ?? 25,
        branchWarRoundWin: data.branchWarRoundWin ?? 30,
        branchWarMvpBonus: data.branchWarMvpBonus ?? 20,
        individualBranchWin: data.individualBranchWin ?? 50,
        individualWarriorBonus: data.individualWarriorBonus ?? 30,
        individualWarriorWinBonus: data.individualWarriorWinBonus ?? 40,
        individualMvpBonus: data.individualMvpBonus ?? 60,
        individualLoserTopScorer: data.individualLoserTopScorer ?? 25,
        individualParticipation: data.individualParticipation ?? 10,
        studentWarWin: data.studentWarWin ?? 100,
        studentWarSweep: data.studentWarSweep ?? 50,
        studentWarLoss: data.studentWarLoss ?? 15,
        studentWarUnderdog: data.studentWarUnderdog ?? 25,
        studentWarAllyWin: data.studentWarAllyWin ?? 20,
        gecxRewardsByRank: data.gecxRewardsByRank ?? undefined,
      },
    });
  }

  revalidatePath("/admin/seasons");
  return { success: true };
}
