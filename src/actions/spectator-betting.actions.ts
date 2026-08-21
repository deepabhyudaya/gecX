"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers } from "@/lib/notifications";
import { deductGecXForPurchase, awardGecX } from "./gecx.actions";
import { publishWarEvent } from "@/lib/war-events";

const MIN_STAKE = 10;
const MAX_STAKE = 5000;

export async function placeBet(
  rivalryId: string,
  sideStudentId: string,
  stakeGecx: number
) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");
  const user = (await auth()) as any;

  const clerkRole = ((user?.sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  const bettorUserType = clerkRole || "student";

  if (!Number.isFinite(stakeGecx) || stakeGecx < MIN_STAKE || stakeGecx > MAX_STAKE) {
    throw new Error(`Stake must be between ${MIN_STAKE} and ${MAX_STAKE} GecX`);
  }
  if (stakeGecx % 1 !== 0) throw new Error("Stake must be a whole number");

  const rivalry = await prisma.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { allies: { where: { status: "ACCEPTED" } }, spectatorBets: true },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (!rivalry.bettingEnabled) throw new Error("Betting is disabled for this duel");
  if (rivalry.status === "CONCLUDED" || rivalry.status === "REJECTED") {
    throw new Error("Betting is closed for this duel");
  }
  if (rivalry.bettingClosesAt && new Date() >= rivalry.bettingClosesAt) {
    throw new Error("Betting window has closed");
  }
  if (sideStudentId !== rivalry.studentAId && sideStudentId !== rivalry.studentBId) {
    throw new Error("You must bet on one of the duelists");
  }

  if (userId === rivalry.studentAId || userId === rivalry.studentBId) {
    throw new Error("Duelists cannot bet on their own match");
  }
  const isAlly = rivalry.allies.some((a) => a.allyStudentId === userId);
  if (isAlly) throw new Error("Allies of this duel cannot place bets");

  const existing = rivalry.spectatorBets.find(
    (b) => b.bettorUserId === userId && b.status === "OPEN"
  );
  if (existing) throw new Error("You already have an open bet on this duel");

  await deductGecXForPurchase({
    userId,
    amount: stakeGecx,
    description: `Bet ${stakeGecx} GecX on duel ${rivalryId}`,
  });

  const bet = await prisma.spectatorBet.create({
    data: {
      studentRivalryId: rivalryId,
      bettorUserId: userId,
      bettorUserType,
      sideStudentId,
      stakeGecx,
      status: "OPEN",
      bettorWasFighter: false,
      bettorWasAlly: isAlly,
    },
  });

  await createNotificationsForUsers({
    title: "Bet Placed",
    message: `You staked ${stakeGecx} GecX on this duel. Good luck!`,
    type: "STUDENT_WAR_BET_PLACED",
    entityId: rivalryId,
    studentIds: bettorUserType === "student" ? [userId] : [],
    adminIds: bettorUserType === "admin" ? [userId] : [],
  });

  await publishWarEvent("student", {
    type: "war:bet",
    rivalryId,
    betId: bet.id,
    sideStudentId,
    stakeGecx,
  } as any);

  revalidatePath(`/student/wars/${rivalryId}`);
  return bet;
}

export async function cancelBet(betId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");

  const bet = await prisma.spectatorBet.findUnique({
    where: { id: betId },
    include: { rivalry: true },
  });
  if (!bet) throw new Error("Bet not found");
  if (bet.bettorUserId !== userId) throw new Error("You can only cancel your own bet");
  if (bet.status !== "OPEN") throw new Error("Only open bets can be cancelled");
  if (bet.rivalry.bettingClosesAt && new Date() >= bet.rivalry.bettingClosesAt) {
    throw new Error("Betting window has closed — cannot cancel");
  }

  await awardGecX({
    userId: bet.bettorUserId,
    userType: bet.bettorUserType,
    amount: bet.stakeGecx,
    type: "bet_cancelled",
    description: `Refunded ${bet.stakeGecx} GecX from cancelled bet`,
    relatedId: bet.studentRivalryId,
  });

  const updated = await prisma.spectatorBet.update({
    where: { id: betId },
    data: { status: "CANCELLED", payoutGecx: 0 },
  });

  revalidatePath(`/student/wars/${bet.studentRivalryId}`);
  return updated;
}

export async function settleRivalryBets(
  rivalryId: string,
  winnerStudentId: string | null,
  tx?: any
) {
  const db = tx ?? prisma;

  const rivalry = await db.studentRivalry.findUnique({
    where: { id: rivalryId },
    include: { spectatorBets: { where: { status: "OPEN" } } },
  });
  if (!rivalry) throw new Error("Rivalry not found");
  if (rivalry.betsSettled) return { settled: 0, refunded: 0 };

  const openBets = rivalry.spectatorBets;
  if (openBets.length === 0) {
    await db.studentRivalry.update({ where: { id: rivalryId }, data: { betsSettled: true } });
    return { settled: 0, refunded: 0 };
  }

  if (winnerStudentId === null) {
    let refunded = 0;
    for (const b of openBets) {
      await awardGecX({
        userId: b.bettorUserId,
        userType: b.bettorUserType,
        amount: b.stakeGecx,
        type: "bet_refunded",
        description: `Draw — refunded ${b.stakeGecx} GecX from bet`,
        relatedId: rivalryId,
      });
      await db.spectatorBet.update({
        where: { id: b.id },
        data: { status: "REFUNDED", payoutGecx: b.stakeGecx, settledAt: new Date() },
      });
      await createNotificationsForUsers({
        title: "Bet Refunded",
        message: `The duel ended in a draw. Your ${b.stakeGecx} GecX bet has been refunded.`,
        type: "STUDENT_WAR_BET_REFUNDED",
        entityId: rivalryId,
        studentIds: b.bettorUserType === "student" ? [b.bettorUserId] : [],
      });
      refunded += 1;
    }
    await db.studentRivalry.update({ where: { id: rivalryId }, data: { betsSettled: true } });
    return { settled: 0, refunded };
  }

  const winnerBets = openBets.filter((b) => b.sideStudentId === winnerStudentId);
  const loserBets = openBets.filter((b) => b.sideStudentId !== winnerStudentId);

  const winnerPool = winnerBets.reduce((s, b) => s + b.stakeGecx, 0);
  const loserPool = loserBets.reduce((s, b) => s + b.stakeGecx, 0);
  const houseCut = Math.round(loserPool * rivalry.bettingHouseCutPct);
  const distributionPool = loserPool - houseCut;

  let settled = 0;
  for (const b of winnerBets) {
    const share = winnerPool > 0 ? b.stakeGecx / winnerPool : 0;
    const payout = Math.floor(b.stakeGecx + distributionPool * share);
    await awardGecX({
      userId: b.bettorUserId,
      userType: b.bettorUserType,
      amount: payout,
      type: "bet_won",
      description: `Won ${payout} GecX (stake ${b.stakeGecx} + share of pool)`,
      relatedId: rivalryId,
    });
    await db.spectatorBet.update({
      where: { id: b.id },
      data: { status: "SETTLED_WON", payoutGecx: payout, settledAt: new Date() },
    });
    await createNotificationsForUsers({
      title: "Bet Won!",
      message: `You won ${payout} GecX from your duel bet.`,
      type: "STUDENT_WAR_BET_WON",
      entityId: rivalryId,
      studentIds: b.bettorUserType === "student" ? [b.bettorUserId] : [],
    });
    settled += 1;
  }

  for (const b of loserBets) {
    await db.spectatorBet.update({
      where: { id: b.id },
      data: { status: "SETTLED_LOST", payoutGecx: 0, settledAt: new Date() },
    });
    await createNotificationsForUsers({
      title: "Bet Lost",
      message: `Your side lost the duel. Better luck next time!`,
      type: "STUDENT_WAR_BET_LOST",
      entityId: rivalryId,
      studentIds: b.bettorUserType === "student" ? [b.bettorUserId] : [],
    });
  }

  await db.studentRivalry.update({ where: { id: rivalryId }, data: { betsSettled: true } });
  return { settled, refunded: 0 };
}

export async function getRivalryBets(rivalryId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Not authenticated");

  return prisma.spectatorBet.findMany({
    where: { studentRivalryId: rivalryId },
    orderBy: { placedAt: "desc" },
  });
}

export async function getMyRivalryBet(rivalryId: string) {
  const { userId } = auth();
  if (!userId) return null;
  return prisma.spectatorBet.findFirst({
    where: { studentRivalryId: rivalryId, bettorUserId: userId },
  });
}
