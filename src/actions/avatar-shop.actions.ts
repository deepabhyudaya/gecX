"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { deductGecXForPurchase, getOrCreateGecXBalance } from "./gecx.actions";
import { getAvatarShopItems } from "./gecx-settings.actions";
import { DICEBEAR_CATALOG } from "@/lib/shop-catalog";
import { getOrbAvatarUrl, isOrbStyle } from "@/lib/orb-avatars";

function generateSeed(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateAvatarUrl(style: string, seed: string, size: number = 128): string {
  if (isOrbStyle(style)) {
    return getOrbAvatarUrl(seed, size);
  }

  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&randomizeIds=true`;
}

export async function getUserAvatars(userId?: string) {
  const { userId: currentUserId } = auth();
  const targetUserId = userId || currentUserId;

  if (!targetUserId) throw new Error("Unauthorized");

  const avatars = await prisma.userAvatar.findMany({
    where: { userId: targetUserId },
    orderBy: { purchasedAt: "desc" },
  });

  return avatars;
}

export async function getEquippedAvatars(userId?: string) {
  const { userId: currentUserId } = auth();
  const targetUserId = userId || currentUserId;

  if (!targetUserId) throw new Error("Unauthorized");

  const equipped = await prisma.userEquippedAvatar.findUnique({
    where: { userId: targetUserId },
  });

  return equipped || {
    userId: targetUserId,
    academicStyle: null,
    academicSeed: null,
    communityStyle: null,
    communitySeed: null,
  };
}

export async function checkAvatarOwnership(userId: string, style: string, seed: string) {
  const avatar = await prisma.userAvatar.findFirst({
    where: {
      userId,
      style,
      seed,
    },
  });

  return !!avatar;
}

export async function checkStyleOwnership(userId: string, style: string) {
  const avatar = await prisma.userAvatar.findFirst({
    where: {
      userId,
      style,
    },
  });

  return !!avatar;
}

export async function purchaseAvatar(style: string, seed: string) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const alreadyOwned = await checkAvatarOwnership(userId, style, seed);
  if (alreadyOwned) {
    throw new Error("You already own this avatar variant");
  }

  const shopItems = await getAvatarShopItems();
  let shopItem = shopItems.find((item) => item.style === style) as any;

  if (!shopItem) {
    const catalogItem =
      DICEBEAR_CATALOG.find((item) => item.style === style && item.seed === seed) ??
      DICEBEAR_CATALOG.find((item) => item.style === style);
    if (!catalogItem) {
      throw new Error("Avatar style not found");
    }
    shopItem = {
      ...catalogItem,
      isActive: true,
      description: `${catalogItem.name} avatar style`,
      previewSeed: seed,
    };
  }

  if (!shopItem) {
    throw new Error("Avatar style not found");
  }

  if (!shopItem.isActive) {
    throw new Error("This avatar is not available for purchase");
  }

  await deductGecXForPurchase({
    userId,
    amount: shopItem.cost,
    description: `Purchased ${shopItem.name} avatar`,
  });

  const userAvatar = await prisma.userAvatar.create({
    data: {
      userId,
      style,
      seed,
      cost: shopItem.cost,
    },
  });

  const equipped = await getEquippedAvatars(userId);
  if (!equipped.communityStyle) {
    await equipAvatar("community", style, seed);
  }

  revalidatePath("/shop");
  revalidatePath("/settings/community");
  revalidatePath("/profile");
  revalidatePath(`/${userId}`);

  return {
    success: true,
    avatar: userAvatar,
    remainingBalance: await getOrCreateGecXBalance(userId, userType),
  };
}

export async function equipAvatar(
  profileType: "academic" | "community",
  style: string,
  seed: string
) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const userAvatar = await prisma.userAvatar.findFirst({
    where: {
      userId,
      style,
      seed,
    },
  });

  if (!userAvatar) {
    throw new Error("You don't own this avatar variant");
  }

  const existingEquipped = await prisma.userEquippedAvatar.findUnique({
    where: { userId },
  });

  if (existingEquipped) {
    await prisma.userEquippedAvatar.update({
      where: { userId },
      data:
        profileType === "academic"
          ? {
              academicStyle: style,
              academicSeed: seed,
            }
          : {
              communityStyle: style,
              communitySeed: seed,
            },
    });
  } else {
    await prisma.userEquippedAvatar.create({
      data: {
        userId,
        ...(profileType === "academic"
          ? {
              academicStyle: style,
              academicSeed: seed,
            }
          : {
              communityStyle: style,
              communitySeed: seed,
            }),
      },
    });
  }

  if (profileType === "community") {
    await prisma.userCommunityProfile.upsert({
      where: { userId },
      update: {
        avatar: generateAvatarUrl(style, seed),
      },
      create: {
        userId,
        userType,
        username: userId.toLowerCase(),
        avatar: generateAvatarUrl(style, seed),
      },
    });
  }

  revalidatePath("/shop");
  revalidatePath("/settings/community");
  revalidatePath("/profile");
  revalidatePath(`/${userId}`);

  return { success: true, profileType, style };
}

export async function getFullShopData() {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const [shopItems, userAvatars, equipped, balance] = await Promise.all([
    getAvatarShopItems(),
    getUserAvatars(userId),
    getEquippedAvatars(userId),
    getOrCreateGecXBalance(userId, userType),
  ]);

  const ownedStyles = new Set(userAvatars.map((a) => a.style));

  return {
    items: shopItems.map((item) => ({
      ...item,
      owned: ownedStyles.has(item.style),
      equippedAcademic: equipped.academicStyle === item.style,
      equippedCommunity: equipped.communityStyle === item.style,
      previewUrl: generateAvatarUrl(item.style, item.previewSeed),
    })),
    balance,
    equipped,
  };
}

export async function getRealShopData() {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const [userAvatars, equipped, balance] = await Promise.all([
    getUserAvatars(userId),
    getEquippedAvatars(userId),
    getOrCreateGecXBalance(userId, userType),
  ]);

  const ownedVariants = new Set(userAvatars.map((a) => `${a.style}--${a.seed}`));

  const items = DICEBEAR_CATALOG.map((avatar) => ({
    id: avatar.id,
    style: avatar.style,
    seed: avatar.seed,
    name: avatar.name,
    category: avatar.category,
    cost: avatar.cost,
    previewUrl: generateAvatarUrl(avatar.style, avatar.seed, 128),
    owned: ownedVariants.has(`${avatar.style}--${avatar.seed}`),
    equippedAcademic: equipped.academicStyle === avatar.style && equipped.academicSeed === avatar.seed,
    equippedCommunity: equipped.communityStyle === avatar.style && equipped.communitySeed === avatar.seed,
  }));

  return {
    items,
    balance,
    equipped: {
      academicStyle: equipped.academicStyle || undefined,
      academicSeed: equipped.academicSeed || undefined,
      communityStyle: equipped.communityStyle || undefined,
      communitySeed: equipped.communitySeed || undefined,
    },
  };
}

export async function randomizeAvatarSeed(style: string) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const userAvatar = await prisma.userAvatar.findFirst({
    where: { userId, style },
    orderBy: { purchasedAt: "desc" },
  });

  if (!userAvatar) {
    throw new Error("You don't own this avatar");
  }

  const newSeed = generateSeed();
  await prisma.userAvatar.update({
    where: { id: userAvatar.id },
    data: { seed: newSeed },
  });

  const equipped = await getEquippedAvatars(userId);
  if (equipped.academicStyle === style) {
    await prisma.userEquippedAvatar.update({
      where: { userId },
      data: { academicSeed: newSeed },
    });
  }
  if (equipped.communityStyle === style) {
    await prisma.userEquippedAvatar.update({
      where: { userId },
      data: { communitySeed: newSeed },
    });

    await prisma.userCommunityProfile.upsert({
      where: { userId },
      update: {
        avatar: generateAvatarUrl(style, newSeed, 128),
      },
      create: {
        userId,
        userType,
        username: userId.toLowerCase(),
        avatar: generateAvatarUrl(style, newSeed, 128),
      },
    });
  }

  revalidatePath("/shop");
  revalidatePath("/settings/community");
  revalidatePath("/profile");

  return { success: true, newSeed };
}

export async function getUserAvatarUrl(
  userId: string,
  profileType: "academic" | "community"
): Promise<string | null> {
  const equipped = await prisma.userEquippedAvatar.findUnique({
    where: { userId },
  });

  if (!equipped) return null;

  const style = profileType === "academic" ? equipped.academicStyle : equipped.communityStyle;
  const seed = profileType === "academic" ? equipped.academicSeed : equipped.communitySeed;

  if (!style || !seed) return null;

  if (isOrbStyle(style)) {
    return getOrbAvatarUrl(seed, 128);
  }

  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=128&randomizeIds=true`;
}
