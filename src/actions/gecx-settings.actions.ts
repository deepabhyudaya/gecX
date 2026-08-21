"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const DEFAULT_AVATAR_PRICES = [

  { style: "adventurer", name: "Adventurer", cost: 25, category: "basic" },
  { style: "adventurer-neutral", name: "Adventurer Neutral", cost: 25, category: "basic" },
  { style: "big-ears", name: "Big Ears", cost: 25, category: "basic" },
  { style: "big-ears-neutral", name: "Big Ears Neutral", cost: 25, category: "basic" },
  { style: "big-smile", name: "Big Smile", cost: 25, category: "basic" },
  { style: "identicon", name: "Identicon", cost: 25, category: "basic" },
  { style: "initials", name: "Initials", cost: 25, category: "basic" },
  { style: "shapes", name: "Shapes", cost: 25, category: "basic" },
  { style: "thumbs", name: "Thumbs", cost: 25, category: "basic" },

  { style: "avataaars", name: "Avataaars", cost: 50, category: "standard" },
  { style: "avataaars-neutral", name: "Avataaars Neutral", cost: 50, category: "standard" },
  { style: "bottts", name: "Bottts", cost: 50, category: "standard" },
  { style: "bottts-neutral", name: "Bottts Neutral", cost: 50, category: "standard" },
  { style: "croodles", name: "Croodles", cost: 50, category: "standard" },
  { style: "croodles-neutral", name: "Croodles Neutral", cost: 50, category: "standard" },
  { style: "fun-emoji", name: "Fun Emoji", cost: 50, category: "standard" },
  { style: "glass", name: "Glass", cost: 50, category: "standard" },
  { style: "icons", name: "Icons", cost: 50, category: "standard" },
  { style: "lorelei", name: "Lorelei", cost: 50, category: "standard" },
  { style: "lorelei-neutral", name: "Lorelei Neutral", cost: 50, category: "standard" },
  { style: "micah", name: "Micah", cost: 50, category: "standard" },
  { style: "miniavs", name: "Miniavs", cost: 50, category: "standard" },
  { style: "notionists", name: "Notionists", cost: 50, category: "standard" },
  { style: "notionists-neutral", name: "Notionists Neutral", cost: 50, category: "standard" },
  { style: "open-peeps", name: "Open Peeps", cost: 50, category: "standard" },
  { style: "pixel-art", name: "Pixel Art", cost: 50, category: "standard" },
  { style: "pixel-art-neutral", name: "Pixel Art Neutral", cost: 50, category: "standard" },
  { style: "rings", name: "Rings", cost: 50, category: "standard" },

  { style: "dylan", name: "Dylan", cost: 100, category: "premium" },
  { style: "personas", name: "Personas", cost: 100, category: "premium" },
  { style: "toon-head", name: "Toon Head", cost: 100, category: "premium" },

  { style: "orb", name: "Orb", cost: 75, category: "orbs" },
];

function checkAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
}

export type GecXSettingsData = {
  defaultStartingBalance: number;
  attendancePerDay: number;
  perfectAttendanceWeek: number;
  resultAbove95: number;
  resultAbove90: number;
  resultAbove85: number;
  resultAbove80: number;
  resultAbove70: number;
  resultAbove60: number;
  teacherAttendanceBonusPercent: number;
  teacherResultBonusPercent: number;
  parentAttendanceBonusPercent: number;
  parentResultBonusPercent: number;
};

export async function getGecXSettings(): Promise<GecXSettingsData> {
  let settings = await prisma.gecXSettings.findFirst();

  if (!settings) {
    settings = await prisma.gecXSettings.create({
      data: {
        defaultStartingBalance: 0,
        attendancePerDay: 1,
        perfectAttendanceWeek: 5,
        resultAbove95: 25,
        resultAbove90: 20,
        resultAbove85: 15,
        resultAbove80: 12,
        resultAbove70: 8,
        resultAbove60: 5,
        teacherAttendanceBonusPercent: 10,
        teacherResultBonusPercent: 10,
        parentAttendanceBonusPercent: 5,
        parentResultBonusPercent: 5,
      },
    });
  }

  return {
    defaultStartingBalance: settings.defaultStartingBalance,
    attendancePerDay: settings.attendancePerDay,
    perfectAttendanceWeek: settings.perfectAttendanceWeek,
    resultAbove95: settings.resultAbove95,
    resultAbove90: settings.resultAbove90,
    resultAbove85: settings.resultAbove85,
    resultAbove80: settings.resultAbove80,
    resultAbove70: settings.resultAbove70,
    resultAbove60: settings.resultAbove60,
    teacherAttendanceBonusPercent: settings.teacherAttendanceBonusPercent,
    teacherResultBonusPercent: settings.teacherResultBonusPercent,
    parentAttendanceBonusPercent: settings.parentAttendanceBonusPercent,
    parentResultBonusPercent: settings.parentResultBonusPercent,
  };
}

export async function updateGecXSettings(settings: Partial<GecXSettingsData>) {
  checkAdmin();

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value !== "number" || value < 0 || !Number.isInteger(value)) {
      throw new Error(`${key} must be a non-negative integer`);
    }
  }

  const existing = await prisma.gecXSettings.findFirst();

  if (existing) {
    await prisma.gecXSettings.update({
      where: { id: existing.id },
      data: settings,
    });
  } else {
    await prisma.gecXSettings.create({
      data: settings as GecXSettingsData,
    });
  }

  revalidatePath("/admin/gecx-settings");
  return { success: true };
}

export async function resetGecXSettingsToDefaults() {
  checkAdmin();

  const defaults: GecXSettingsData = {
    defaultStartingBalance: 0,
    attendancePerDay: 1,
    perfectAttendanceWeek: 5,
    resultAbove95: 25,
    resultAbove90: 20,
    resultAbove85: 15,
    resultAbove80: 12,
    resultAbove70: 8,
    resultAbove60: 5,
    teacherAttendanceBonusPercent: 10,
    teacherResultBonusPercent: 10,
    parentAttendanceBonusPercent: 5,
    parentResultBonusPercent: 5,
  };

  const existing = await prisma.gecXSettings.findFirst();

  if (existing) {
    await prisma.gecXSettings.update({
      where: { id: existing.id },
      data: defaults,
    });
  } else {
    await prisma.gecXSettings.create({
      data: defaults,
    });
  }

  revalidatePath("/admin/gecx-settings");
  return { success: true, defaults };
}

export async function getAvatarShopItems() {
  const items = await prisma.avatarShopItem.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { cost: "asc" }, { name: "asc" }],
  });

  if (items.length === 0) {
    await initializeAvatarShopItems();
    return prisma.avatarShopItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { cost: "asc" }, { name: "asc" }],
    });
  }

  return items;
}

export async function initializeAvatarShopItems() {
  checkAdmin();

  for (const item of DEFAULT_AVATAR_PRICES) {
    await prisma.avatarShopItem.upsert({
      where: { style: item.style },
      update: {},
      create: {
        style: item.style,
        name: item.name,
        cost: item.cost,
        category: item.category,
        description: `${item.name} avatar style`,
      },
    });
  }

  revalidatePath("/admin/avatar-pricing");
  return { success: true, initialized: DEFAULT_AVATAR_PRICES.length };
}

export async function updateAvatarPrice(style: string, cost: number, category?: string) {
  checkAdmin();

  if (typeof cost !== "number" || cost < 0 || !Number.isInteger(cost)) {
    throw new Error("Cost must be a non-negative integer");
  }

  await prisma.avatarShopItem.update({
    where: { style },
    data: {
      cost,
      ...(category && { category }),
    },
  });

  revalidatePath("/admin/avatar-pricing");
  revalidatePath("/shop");
  return { success: true };
}

export async function toggleAvatarItemStatus(style: string, isActive: boolean) {
  checkAdmin();

  await prisma.avatarShopItem.update({
    where: { style },
    data: { isActive },
  });

  revalidatePath("/admin/avatar-pricing");
  revalidatePath("/shop");
  return { success: true };
}

export async function resetAvatarPricesToDefaults() {
  checkAdmin();

  for (const item of DEFAULT_AVATAR_PRICES) {
    await prisma.avatarShopItem.update({
      where: { style: item.style },
      data: {
        cost: item.cost,
        category: item.category,
        isActive: true,
      },
    });
  }

  revalidatePath("/admin/avatar-pricing");
  revalidatePath("/shop");
  return { success: true, reset: DEFAULT_AVATAR_PRICES.length };
}
