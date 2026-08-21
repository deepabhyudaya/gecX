import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard } from "@/actions/karma-tracking.actions";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();

    const searchParams = request.nextUrl.searchParams;
    const timeframe = (searchParams.get("timeframe") as "today" | "week" | "month" | "all") || "all";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const validTimeframes = ["today", "week", "month", "all"];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: "Invalid timeframe. Must be one of: today, week, month, all" },
        { status: 400 }
      );
    }

    const leaderboard = await getLeaderboard(timeframe, limit);

    return NextResponse.json(
      {
        timeframe,
        leaderboard,
        currentUserId: userId,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[Leaderboard API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
