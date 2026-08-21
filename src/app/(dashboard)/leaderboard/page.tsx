import { auth, currentUser } from "@clerk/nextjs/server";
import { getLeaderboard, getMyRank } from "@/actions/karma-tracking.actions";
import { LeaderboardClient } from "@/components/leaderboard/LeaderboardClient";
import type { Timeframe } from "@/components/leaderboard/TimeframeTabs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard | gecX",
  description: "See who's earning the most karma in your college community",
};

interface LeaderboardPageProps {
  searchParams: { timeframe?: string };
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const clerkUser = await currentUser();
  const userId = clerkUser?.id;

  const validTimeframes: Timeframe[] = ["today", "week", "month", "all"];
  const timeframe = validTimeframes.includes(searchParams.timeframe as Timeframe)
    ? (searchParams.timeframe as Timeframe)
    : "all";

  const [leaderboard, myRank] = await Promise.all([
    getLeaderboard(timeframe, 20),
    userId ? getMyRank(timeframe) : null,
  ]);

  return (
    <LeaderboardClient
      initialLeaderboard={leaderboard}
      initialMyRank={myRank}
      userId={userId || null}
      initialTimeframe={timeframe}
    />
  );
}
