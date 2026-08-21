"use server";

import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getEquippedColorsCached } from "@/lib/equipped-colors";

import {
  USERNAME_COLORS as DEFAULT_USERNAME_COLORS,
  PROFILE_BG_COLORS as DEFAULT_PROFILE_BG_COLORS,
  APP_THEMES as DEFAULT_APP_THEMES,
  NAMEPLATES as DEFAULT_NAMEPLATES,
  CUSTOM_MEDIA_ITEMS as DEFAULT_CUSTOM_MEDIA
} from "@/lib/color-catalog";

async function initializeDefaultColors() {
  const existing = await prisma.usernameColorShopItem.findMany({ select: { name: true, type: true } });
  const existingNames = new Set(existing.map((e) => e.name));

  const newUsername = DEFAULT_USERNAME_COLORS.filter((i) => !existingNames.has(i.name));
  const newBg       = DEFAULT_PROFILE_BG_COLORS.filter((i) => !existingNames.has(i.name));
  const newThemes   = DEFAULT_APP_THEMES.filter((i) => !existingNames.has(i.name));
  const newPlates   = DEFAULT_NAMEPLATES.filter((i) => !existingNames.has(i.name));
  const newMedia    = DEFAULT_CUSTOM_MEDIA.filter((i) => !existingNames.has(i.name));

  if (newUsername.length > 0)
    await prisma.usernameColorShopItem.createMany({
      data: newUsername.map((i) => ({ ...i, type: "username" })),
    });

  if (newBg.length > 0)
    await prisma.usernameColorShopItem.createMany({
      data: newBg.map((i) => ({ ...i, type: "profileBg" })),
    });

  if (newThemes.length > 0)
    await prisma.usernameColorShopItem.createMany({
      data: newThemes.map((i) => ({ ...i, type: "theme" })),
    });

  if (newPlates.length > 0)
    await prisma.usernameColorShopItem.createMany({
      data: newPlates.map((i) => ({ ...i, type: "nameplate" })),
    });

  if (newMedia.length > 0) {

    await prisma.usernameColorShopItem.createMany({
      data: [
        ...newMedia.filter(i => i.name === "Custom Avatar").map((i) => ({ ...i, type: "customAvatar" })),
        ...newMedia.filter(i => i.name === "Profile Banner").map((i) => ({ ...i, type: "profileBanner" })),
      ],
    });
  }

  const existingTypes = new Set(existing.map((e: any) => e.type));
  if (!existingTypes.has("customAvatar") && !existingNames.has("Custom Avatar")) {
    await prisma.usernameColorShopItem.create({
      data: {
        name: "Custom Avatar",
        colorValue: "",
        category: "special",
        shade: "feature",
        cost: 5000,
        type: "customAvatar",
        isActive: true,
      },
    });
  }
  if (!existingTypes.has("profileBanner") && !existingNames.has("Profile Banner")) {
    await prisma.usernameColorShopItem.create({
      data: {
        name: "Profile Banner",
        colorValue: "",
        category: "special",
        shade: "feature",
        cost: 8000,
        type: "profileBanner",
        isActive: true,
      },
    });
  }

  if (!existingTypes.has("impersonate") && !existingNames.has("Impersonate 1 Day")) {
    await prisma.usernameColorShopItem.createMany({
      data: [
        { name: "Impersonate 1 Day", colorValue: "1", category: "special", shade: "consumable", cost: 2500, type: "impersonate", isActive: true },
        { name: "Impersonate 7 Days", colorValue: "7", category: "special", shade: "consumable", cost: 8000, type: "impersonate", isActive: true },
        { name: "Impersonate 15 Days", colorValue: "15", category: "special", shade: "consumable", cost: 15000, type: "impersonate", isActive: true },
      ],
    });
  }

  const allThemes = await prisma.usernameColorShopItem.findMany({ where: { type: "theme" } });
  for (const theme of DEFAULT_APP_THEMES) {
    const existing = allThemes.find(t => t.name === theme.name);
    if (existing && existing.colorValue !== theme.colorValue) {
      await prisma.usernameColorShopItem.update({
        where: { id: existing.id },
        data: { colorValue: theme.colorValue }
      });
    }
  }
}

export async function initializeColorShopItems() {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");

  const existingCount = await prisma.usernameColorShopItem.count();

  await initializeDefaultColors();

  return {
    message: "Shop items initialized",
    usernameColors: DEFAULT_USERNAME_COLORS.length,
    profileBgColors: DEFAULT_PROFILE_BG_COLORS.length,
  };
}

export async function getColorShopData() {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const CATALOG_TOTAL = DEFAULT_USERNAME_COLORS.length + DEFAULT_PROFILE_BG_COLORS.length + DEFAULT_APP_THEMES.length + DEFAULT_NAMEPLATES.length + DEFAULT_CUSTOM_MEDIA.length + 3;
  const existingCount = await prisma.usernameColorShopItem.count();
  if (existingCount < CATALOG_TOTAL) {
    await initializeDefaultColors();
  }

  const impersonateCheck = await prisma.usernameColorShopItem.findFirst({ where: { type: "impersonate" } });
  if (!impersonateCheck) {
    await prisma.usernameColorShopItem.createMany({
      data: [
        { name: "Impersonate 1 Day", colorValue: "1", category: "special", shade: "consumable", cost: 2500, type: "impersonate", isActive: true },
        { name: "Impersonate 7 Days", colorValue: "7", category: "special", shade: "consumable", cost: 8000, type: "impersonate", isActive: true },
        { name: "Impersonate 15 Days", colorValue: "15", category: "special", shade: "consumable", cost: 15000, type: "impersonate", isActive: true },
      ],
    });
  }

  const [allItems, ownedColors, equipped, balance, profile, activeImpersonation] = await Promise.all([
    prisma.usernameColorShopItem.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { shade: "asc" }],
    }),
    prisma.userOwnedColor.findMany({
      where: { userId },
      select: { colorItemId: true },
    }),
    prisma.userEquippedColors.findUnique({
      where: { userId },
    }),
    getOrCreateGecXBalance(userId, userType),
    prisma.userCommunityProfile.findUnique({
      where: { userId },
      select: { customAvatar: true, bannerUrl: true },
    }),
    prisma.userImpersonation.findUnique({
      where: { userId },
    }),
  ]);

  const ownedIds = new Set(ownedColors.map((c: { colorItemId: string }) => c.colorItemId));

  const usernameColors = allItems.filter((item) => item.type === "username");
  const profileBgColors = allItems.filter((item) => item.type === "profileBg");
  const appThemes = allItems.filter((item) => item.type === "theme");
  const nameplates = allItems.filter((item) => item.type === "nameplate");
  const impersonateItems = allItems.filter((item) => item.type === "impersonate");
  let customAvatarItem = allItems.find((item) => item.type === "customAvatar");
  let profileBannerItem = allItems.find((item) => item.type === "profileBanner");

  if (!customAvatarItem) {
    customAvatarItem = await prisma.usernameColorShopItem.create({
      data: { name: "Custom Avatar", colorValue: "", category: "special", shade: "feature", cost: 5000, type: "customAvatar", isActive: true },
    });
    allItems.push(customAvatarItem);
  }

  if (!profileBannerItem) {
    profileBannerItem = await prisma.usernameColorShopItem.create({
      data: { name: "Profile Banner", colorValue: "", category: "special", shade: "feature", cost: 8000, type: "profileBanner", isActive: true },
    });
    allItems.push(profileBannerItem);
  }

  if (activeImpersonation && activeImpersonation.expiresAt < new Date()) {
    await prisma.userImpersonation.delete({ where: { userId } });
  }

  const groupedUsernameColors = usernameColors.reduce((acc: Record<string, typeof usernameColors>, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({
      ...item,
      owned: ownedIds.has(item.id),
      equipped: equipped?.usernameColorId === item.id,
    });
    return acc;
  }, {} as Record<string, typeof usernameColors>);

  return {
    usernameColors: groupedUsernameColors,
    profileBgColors: profileBgColors.map((item) => ({
      ...item,
      owned: ownedIds.has(item.id),
      equipped: equipped?.profileBgColorId === item.id,
    })),
    appThemes: appThemes.map((item) => ({
      ...item,
      owned: ownedIds.has(item.id),
      equipped: equipped?.themeId === item.id,
    })),
    nameplates: nameplates.map((item) => ({
      ...item,
      owned: ownedIds.has(item.id),
      equipped: equipped?.nameplateId === item.id,
    })),

    customMediaItems: [
      ...(customAvatarItem ? [{
        ...customAvatarItem,
        owned: ownedIds.has(customAvatarItem.id),
        equipped: false,
      }] : []),
      ...(profileBannerItem ? [{
        ...profileBannerItem,
        owned: ownedIds.has(profileBannerItem.id),
        equipped: false,
      }] : []),
    ],
    impersonateItems: impersonateItems.map((item) => ({
      ...item,
      owned: false,
      equipped: false,
    })),
    equippedUsernameColorId: equipped?.usernameColorId || null,
    equippedProfileBgColorId: equipped?.profileBgColorId || null,
    equippedThemeId: equipped?.themeId || null,
    equippedNameplateId: equipped?.nameplateId || null,
    balance,

    ownsCustomAvatar: customAvatarItem ? ownedIds.has(customAvatarItem.id) : false,
    ownsProfileBanner: profileBannerItem ? ownedIds.has(profileBannerItem.id) : false,
    customAvatarUrl: profile?.customAvatar || null,
    bannerUrl: profile?.bannerUrl || null,
    customAvatarItemId: customAvatarItem?.id || null,
    profileBannerItemId: profileBannerItem?.id || null,
    activeImpersonation: activeImpersonation && activeImpersonation.expiresAt >= new Date()
      ? { targetUserId: activeImpersonation.targetUserId, targetUsername: activeImpersonation.targetUsername || activeImpersonation.targetUserId, expiresAt: activeImpersonation.expiresAt }
      : null,
  };
}

export async function purchaseColor(colorItemId: string) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const existing = await prisma.userOwnedColor.findUnique({
    where: { userId_colorItemId: { userId, colorItemId } },
  });
  if (existing) throw new Error("You already own this color");

  const item = await prisma.usernameColorShopItem.findUnique({
    where: { id: colorItemId },
  });
  if (!item) throw new Error("Color item not found");
  if (!item.isActive) throw new Error("This item is not available");

  const balance = await getOrCreateGecXBalance(userId, userType);
  if (balance.balance < item.cost) {
    throw new Error(`Insufficient GecX balance. Need ${item.cost}, have ${balance.balance}`);
  }

  await prisma.userGecXBalance.update({
    where: { userId },
    data: {
      balance: { decrement: item.cost },
      totalSpent: { increment: item.cost },
    },
  });

  await prisma.userOwnedColor.create({
    data: {
      userId,
      colorItemId,
      cost: item.cost,
    },
  });

  await prisma.gecXTransaction.create({
    data: {
      userId,
      userType,
      amount: -item.cost,
      type: "purchase",
      description: `Purchased ${item.name} (${item.type})`,
      relatedId: colorItemId,
    },
  });

  revalidatePath("/shop");
  return { success: true, item };
}

export async function equipUsernameColor(colorItemId: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (colorItemId) {
    const owned = await prisma.userOwnedColor.findUnique({
      where: {
        userId_colorItemId: { userId, colorItemId },
      },
    });
    if (!owned) throw new Error("You don't own this color");

    const colorItem = await prisma.usernameColorShopItem.findUnique({
      where: { id: colorItemId },
    });
    if (!colorItem || colorItem.type !== "username") {
      throw new Error("Invalid color item");
    }
  }

  const existing = await prisma.userEquippedColors.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.userEquippedColors.update({
      where: { userId },
      data: { usernameColorId: colorItemId },
    });
  } else {
    await prisma.userEquippedColors.create({
      data: { userId, usernameColorId: colorItemId },
    });
  }

  revalidatePath("/shop");
  revalidatePath("/settings/community");
  revalidatePath("/community");
  revalidatePath(`/${userId}`);

  return { success: true, colorItemId };
}

export async function equipProfileBgColor(colorItemId: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (colorItemId) {
    const owned = await prisma.userOwnedColor.findUnique({
      where: {
        userId_colorItemId: { userId, colorItemId },
      },
    });
    if (!owned) throw new Error("You don't own this color");

    const colorItem = await prisma.usernameColorShopItem.findUnique({
      where: { id: colorItemId },
    });
    if (!colorItem || colorItem.type !== "profileBg") {
      throw new Error("Invalid color item");
    }
  }

  const existing = await prisma.userEquippedColors.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.userEquippedColors.update({
      where: { userId },
      data: { profileBgColorId: colorItemId },
    });
  } else {
    await prisma.userEquippedColors.create({
      data: { userId, profileBgColorId: colorItemId },
    });
  }

  revalidatePath("/shop");
  revalidatePath("/settings/community");
  revalidatePath("/community");
  revalidatePath(`/${userId}`);

  return { success: true, colorItemId };
}

export async function unequipUsernameColor() {
  return equipUsernameColor(null);
}

export async function unequipProfileBgColor() {
  return equipProfileBgColor(null);
}

export async function getEquippedColors(userId: string) {
  return getEquippedColorsCached(userId);
}

export async function getMyEquippedColors() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  return getEquippedColors(userId);
}

export async function equipAppTheme(colorItemId: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (colorItemId) {
    const owned = await prisma.userOwnedColor.findUnique({
      where: { userId_colorItemId: { userId, colorItemId } },
    });
    if (!owned) throw new Error("You don't own this theme");
  }

  const existing = await prisma.userEquippedColors.findUnique({ where: { userId } });
  if (existing) {
    await prisma.userEquippedColors.update({ where: { userId }, data: { themeId: colorItemId } });
  } else {
    await prisma.userEquippedColors.create({ data: { userId, themeId: colorItemId } });
  }

  const activeEventTheme = await prisma.eventTheme.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  if (activeEventTheme) {
    await prisma.userEventThemeState.updateMany({
      where: { userId, eventThemeId: activeEventTheme.id, revertedAt: null },
      data: { revertedAt: new Date() },
    });
  }

  revalidatePath("/", "layout");
  return { success: true, colorItemId };
}

export async function equipNameplate(colorItemId: string | null) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  if (colorItemId) {
    const owned = await prisma.userOwnedColor.findUnique({
      where: { userId_colorItemId: { userId, colorItemId } },
    });
    if (!owned) throw new Error("You don't own this nameplate");
  }

  const existing = await prisma.userEquippedColors.findUnique({ where: { userId } });
  if (existing) {
    await prisma.userEquippedColors.update({ where: { userId }, data: { nameplateId: colorItemId } });
  } else {
    await prisma.userEquippedColors.create({ data: { userId, nameplateId: colorItemId } });
  }

  revalidatePath("/community");
  revalidatePath("/messages");
  return { success: true, colorItemId };
}

export async function unequipAppTheme() {
  return equipAppTheme(null);
}

export async function unequipNameplate() {
  return equipNameplate(null);
}

export async function purchaseImpersonation(colorItemId: string) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const item = await prisma.usernameColorShopItem.findUnique({
    where: { id: colorItemId },
  });
  if (!item) throw new Error("Item not found");
  if (item.type !== "impersonate") throw new Error("Invalid item type");
  if (!item.isActive) throw new Error("This item is not available");

  const balance = await getOrCreateGecXBalance(userId, userType);
  if (balance.balance < item.cost) {
    throw new Error(`Insufficient GecX balance. Need ${item.cost}, have ${balance.balance}`);
  }

  await prisma.userGecXBalance.update({
    where: { userId },
    data: {
      balance: { decrement: item.cost },
      totalSpent: { increment: item.cost },
    },
  });

  await prisma.gecXTransaction.create({
    data: {
      userId,
      userType,
      amount: -item.cost,
      type: "purchase",
      description: `Purchased ${item.name}`,
      relatedId: colorItemId,
    },
  });

  revalidatePath("/shop");
  return { success: true, item };
}

export async function activateImpersonation(targetUsername: string, durationDays: number) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const profiles = await prisma.$queryRaw`
    SELECT * FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${targetUsername})
    LIMIT 1
  `;
  const targetProfile = (profiles as any[])[0] || null;

  if (!targetProfile) throw new Error("User not found");
  const targetUserId = targetProfile.userId;

  if (userId === targetUserId) throw new Error("You can't impersonate yourself");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  await prisma.userImpersonation.upsert({
    where: { userId },
    create: {
      userId,
      targetUserId,
      expiresAt,
    },
    update: {
      targetUserId,
      expiresAt,
    },
  });

  revalidatePath("/community");
  revalidatePath("/messages");
  revalidatePath("/settings/community");
  revalidatePath("/shop");
  revalidatePath(`/${userId}`);
  return { success: true, expiresAt, targetUsername: targetProfile.username };
}

export async function cancelImpersonation() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.userImpersonation.deleteMany({
    where: { userId },
  });

  revalidatePath("/community");
  revalidatePath("/messages");
  revalidatePath("/settings/community");
  revalidatePath("/shop");
  revalidatePath(`/${userId}`);
  return { success: true };
}

export async function getActiveImpersonation() {
  const { userId } = auth();
  if (!userId) return null;

  const record = await prisma.userImpersonation.findUnique({
    where: { userId },
  });

  if (!record) return null;
  if (record.expiresAt < new Date()) {
    await prisma.userImpersonation.delete({ where: { userId } });
    return null;
  }

  const profiles = await prisma.$queryRaw`
    SELECT username FROM "UserCommunityProfile"
    WHERE "userId" = ${record.targetUserId}
    LIMIT 1
  `;
  const targetProfile = (profiles as any[])[0] || null;

  return {
    targetUserId: record.targetUserId,
    targetUsername: targetProfile?.username || record.targetUserId,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}

async function getOrCreateGecXBalance(userId: string, userType: string) {
  return prisma.userGecXBalance.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      userType,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
    },
  });
}
