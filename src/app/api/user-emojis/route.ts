import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json({ emojis: [] }, { status: 401 });
  }

  try {

    const memberships = await prisma.serverMember.findMany({
      where: { userId },
      select: { serverId: true },
    });
    const userServerIds = new Set(memberships.map((m) => m.serverId));

    const ownedGlobalEmojis = await prisma.userOwnedGlobalEmoji.findMany({
      where: { userId },
      select: { emojiId: true },
    });
    const ownedGlobalEmojiIds = new Set(ownedGlobalEmojis.map((o) => o.emojiId));

    const [allServerEmojis, globalEmojis] = await Promise.all([
      prisma.serverEmoji.findMany({
        orderBy: { name: "asc" },
        include: { server: { select: { id: true, name: true } } },
      }),
      prisma.globalEmoji.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const emojis = [
      ...allServerEmojis.map((e) => ({
        id: e.id,
        name: e.name,
        imageUrl: e.imageUrl,
        groupName: e.server?.name || "Server",

        usable: userServerIds.has(e.serverId),
      })),
      ...globalEmojis.map((e) => ({
        id: e.id,
        name: e.name,
        imageUrl: e.imageUrl,
        groupName: e.packId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),

        usable: ownedGlobalEmojiIds.has(e.id),
        packId: e.packId,
      })),
    ];

    return NextResponse.json(
      { emojis },
      {
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch user emojis:", error);
    return NextResponse.json({ emojis: [] }, { status: 500 });
  }
}
