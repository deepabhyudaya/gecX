import { cache } from "react";
import prisma from "@/lib/prisma";

async function _getEquippedColors(userId: string) {
  const impersonation = await prisma.userImpersonation.findUnique({
    where: { userId },
  });

  if (impersonation && impersonation.expiresAt >= new Date()) {
    const targetEquipped = await prisma.userEquippedColors.findUnique({
      where: { userId: impersonation.targetUserId },
      include: {
        usernameColorItem: true,
        profileBgColorItem: true,
        themeItem: true,
        nameplateItem: true,
      },
    });

    return {
      usernameColorId: targetEquipped?.usernameColorId || null,
      usernameColor: targetEquipped?.usernameColorItem?.colorValue || null,
      profileBgColorId: targetEquipped?.profileBgColorId || null,
      profileBgColor: targetEquipped?.profileBgColorItem?.colorValue || null,
      themeId: targetEquipped?.themeId || null,
      themeVars: targetEquipped?.themeItem?.colorValue || null,
      nameplateId: targetEquipped?.nameplateId || null,
      nameplateBg: targetEquipped?.nameplateItem?.colorValue || null,
      isImpersonating: true,
      impersonationExpiresAt: impersonation.expiresAt,
    };
  }

  if (impersonation && impersonation.expiresAt < new Date()) {
    await prisma.userImpersonation.delete({ where: { userId } }).catch(() => {});
  }

  const equipped = await prisma.userEquippedColors.findUnique({
    where: { userId },
    include: {
      usernameColorItem: true,
      profileBgColorItem: true,
      themeItem: true,
      nameplateItem: true,
    },
  });

  return {
    usernameColorId: equipped?.usernameColorId || null,
    usernameColor: equipped?.usernameColorItem?.colorValue || null,
    profileBgColorId: equipped?.profileBgColorId || null,
    profileBgColor: equipped?.profileBgColorItem?.colorValue || null,
    themeId: equipped?.themeId || null,
    themeVars: equipped?.themeItem?.colorValue || null,
    nameplateId: equipped?.nameplateId || null,
    nameplateBg: equipped?.nameplateItem?.colorValue || null,
    isImpersonating: false,
    impersonationExpiresAt: null,
  };
}

export const getEquippedColorsCached = cache(_getEquippedColors);
