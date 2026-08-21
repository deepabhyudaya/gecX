import { NextResponse } from "next/server";
import { getUnreadCounts } from "@/actions/notification.actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const counts = await getUnreadCounts();
    return NextResponse.json(counts, {
      headers: {

        "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch notification counts" },
      { status: 500 }
    );
  }
}
