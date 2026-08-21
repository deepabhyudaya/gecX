import prisma from "@/lib/prisma";
import { cache } from "react";

export const getActiveEventThemeForUser = cache(_getActiveEventThemeForUser);
async function _getActiveEventThemeForUser(userId: string) {
  const activeTheme = await prisma.eventTheme.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!activeTheme) return null;

  const state = await prisma.userEventThemeState.findUnique({
    where: {
      userId_eventThemeId: {
        userId,
        eventThemeId: activeTheme.id,
      },
    },
  });

  if (!state) {
    const equipped = await prisma.userEquippedColors.findUnique({
      where: { userId },
      select: { themeId: true },
    });

    const newState = await prisma.userEventThemeState.create({
      data: {
        userId,
        eventThemeId: activeTheme.id,
        previousThemeId: equipped?.themeId || null,
      },
    });

    return {
      theme: activeTheme,
      state: newState,
      isCreator: activeTheme.createdBy === userId,
    };
  }

  return {
    theme: activeTheme,
    state,
    isCreator: activeTheme.createdBy === userId,
  };
}

export async function getActiveEventTheme() {
  return prisma.eventTheme.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}
