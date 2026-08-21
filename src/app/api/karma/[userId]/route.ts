import { NextRequest, NextResponse } from "next/server";
import { getUserKarmaBreakdown } from "@/actions/karma-tracking.actions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const breakdown = await getUserKarmaBreakdown(userId);

    return NextResponse.json(
      { breakdown },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[Karma API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch karma breakdown" },
      { status: 500 }
    );
  }
}
