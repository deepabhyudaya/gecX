"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export function generateSimpleAvatarUrl(style: string, seed: string, size: number = 128): string {
  const dicebearStyle = style
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^([a-z])/, (_, letter) => letter.toLowerCase());

  return `https://api.dicebear.com/7.x/${dicebearStyle}/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

export async function getUserGecXBalance(userId: string) {
  if (!userId) throw new Error("Unauthorized");

  const balance = await prisma.userGecXBalance.findUnique({
    where: { userId },
  });

  return {
    balance: balance?.balance || 0,
    totalEarned: balance?.totalEarned || 0,
    totalSpent: balance?.totalSpent || 0,
  };
}

export async function getBasicShopData() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const balance = await getUserGecXBalance(userId);

  const defaultAvatars = [
    { style: "adventurer", name: "Adventurer", cost: 50, category: "basic" },
    { style: "avataaars", name: "Avataaars", cost: 50, category: "basic" },
    { style: "big-smile", name: "Big Smile", cost: 75, category: "standard" },
    { style: "bottts", name: "Bottts", cost: 75, category: "standard" },
    { style: "croodles", name: "Croodles", cost: 100, category: "premium" },
    { style: "dylan", name: "Dylan", cost: 100, category: "premium" },
    { style: "fun-emoji", name: "Fun Emoji", cost: 50, category: "basic" },
    { style: "lorelei", name: "Lorelei", cost: 75, category: "standard" },
    { style: "micah", name: "Micah", cost: 75, category: "standard" },
    { style: "notionists", name: "Notionists", cost: 100, category: "premium" },
    { style: "open-peeps", name: "Open Peeps", cost: 50, category: "basic" },
    { style: "personas", name: "Personas", cost: 75, category: "standard" },
    { style: "pixel-art", name: "Pixel Art", cost: 100, category: "premium" },
  ];

  const items = defaultAvatars.map(avatar => ({
    ...avatar,
    id: avatar.style,
    previewUrl: generateSimpleAvatarUrl(avatar.style, userId, 64),
    owned: false,
    equippedAcademic: false,
    equippedCommunity: false,
  }));

  return {
    items,
    balance,
    equipped: {
      academicStyle: undefined,
      academicSeed: userId,
      communityStyle: undefined,
      communitySeed: userId,
    },
  };
}
