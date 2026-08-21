import { NextRequest, NextResponse } from "next/server";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || process.env.NEXT_PUBLIC_GIPHY_API_KEY;
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

export async function GET(req: NextRequest) {
  if (!GIPHY_API_KEY) {
    return NextResponse.json({ results: [], error: "Giphy API key not configured" }, { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") || "24"), 50);

  try {
    const endpoint = q
      ? `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg`
      : `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=pg`;

    const res = await fetch(endpoint, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`Giphy responded with ${res.status}`);

    const json = await res.json();
    const results = (json.data || []).map((gif: any) => ({
      id: gif.id,
      title: gif.title,
      url: gif.images?.fixed_height?.url || gif.images?.original?.url || "",
      preview: gif.images?.fixed_height_small?.url || gif.images?.fixed_height?.url || "",
      width: Number(gif.images?.fixed_height?.width || 200),
      height: Number(gif.images?.fixed_height?.height || 150),
    }));

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    console.error("Giphy error:", err);
    return NextResponse.json({ results: [], error: "Failed to fetch GIFs" }, { status: 200 });
  }
}
