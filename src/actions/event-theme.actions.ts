"use server";

import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function checkAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");
  return auth();
}

export type EventThemeInput = {
  name: string;
  backgroundImage?: string;
  bannerImage?: string;
  bannerText?: string;
  bannerTextColor?: string;
  bannerBgColor?: string;
  bannerOverlayOpacity?: number;
  panelBgOpacity?: number;
  greetingMessage?: string;
  greetingAuthorName?: string;
  themeVars: string;
};

export async function createEventTheme(input: EventThemeInput) {
  const { userId } = checkAdmin();
  if (!userId) throw new Error("Unauthorized");

  const theme = await prisma.eventTheme.create({
    data: {
      name: input.name,
      backgroundImage: input.backgroundImage || null,
      bannerImage: input.bannerImage || null,
      bannerText: input.bannerText || null,
      bannerTextColor: input.bannerTextColor || "#ffffff",
      bannerBgColor: input.bannerBgColor || "rgba(0,0,0,0.6)",
      bannerOverlayOpacity: input.bannerOverlayOpacity ?? 0.4,
      panelBgOpacity: input.panelBgOpacity ?? 0.92,
      greetingMessage: input.greetingMessage || null,
      greetingAuthorName: input.greetingAuthorName || null,
      themeVars: input.themeVars,
      createdBy: userId,
    },
  });

  revalidatePath("/admin/event-themes");
  return { success: true, theme };
}

export async function updateEventTheme(id: string, input: EventThemeInput) {
  checkAdmin();

  const theme = await prisma.eventTheme.update({
    where: { id },
    data: {
      name: input.name,
      backgroundImage: input.backgroundImage || null,
      bannerImage: input.bannerImage || null,
      bannerText: input.bannerText || null,
      bannerTextColor: input.bannerTextColor || "#ffffff",
      bannerBgColor: input.bannerBgColor || "rgba(0,0,0,0.6)",
      bannerOverlayOpacity: input.bannerOverlayOpacity ?? 0.4,
      panelBgOpacity: input.panelBgOpacity ?? 0.92,
      greetingMessage: input.greetingMessage || null,
      greetingAuthorName: input.greetingAuthorName || null,
      themeVars: input.themeVars,
    },
  });

  revalidatePath("/admin/event-themes");
  return { success: true, theme };
}

export async function deleteEventTheme(id: string) {
  checkAdmin();

  await prisma.eventTheme.delete({ where: { id } });
  revalidatePath("/admin/event-themes");
  return { success: true };
}

export async function getEventThemes() {
  checkAdmin();
  const themes = await prisma.eventTheme.findMany({
    orderBy: { createdAt: "desc" },
  });
  return themes;
}

export async function getActiveEventTheme() {
  const theme = await prisma.eventTheme.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return theme;
}

export async function pushEventTheme(themeId: string) {
  const { userId } = checkAdmin();
  if (!userId) throw new Error("Unauthorized");

  await prisma.eventTheme.updateMany({
    where: { id: { not: themeId } },
    data: { isActive: false },
  });

  const theme = await prisma.eventTheme.update({
    where: { id: themeId },
    data: { isActive: true },
  });

  const equippedColors = await prisma.userEquippedColors.findMany({
    select: { userId: true, themeId: true },
  });

  const existingStates = await prisma.userEventThemeState.findMany({
    where: { eventThemeId: themeId },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingStates.map((s: { userId: string }) => s.userId));

  const newStates = equippedColors
    .filter((ec: { userId: string; themeId: string | null }) => !existingUserIds.has(ec.userId))
    .map((ec: { userId: string; themeId: string | null }) => ({
      userId: ec.userId,
      eventThemeId: themeId,
      previousThemeId: ec.themeId,
    }));

  if (newStates.length > 0) {

    for (const state of newStates) {
      await prisma.userEventThemeState.create({ data: state });
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/event-themes");
  return { success: true, theme };
}

export async function endEventTheme(themeId: string) {
  checkAdmin();

  await prisma.eventTheme.update({
    where: { id: themeId },
    data: { isActive: false },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/event-themes");
  return { success: true };
}

export async function getMyEventThemeState() {
  const { userId } = auth();
  if (!userId) return null;

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

export async function dismissEventTheme(eventThemeId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.userEventThemeState.updateMany({
    where: { userId, eventThemeId },
    data: { dismissedAt: new Date() },
  });

  return { success: true };
}

export async function dismissBanner(eventThemeId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  await prisma.userEventThemeState.updateMany({
    where: { userId, eventThemeId },
    data: { bannerDismissedAt: new Date() },
  });

  return { success: true };
}

export async function revertEventTheme(eventThemeId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const state = await prisma.userEventThemeState.findUnique({
    where: {
      userId_eventThemeId: {
        userId,
        eventThemeId,
      },
    },
  });

  if (!state) throw new Error("No event theme state found");

  const existing = await prisma.userEquippedColors.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.userEquippedColors.update({
      where: { userId },
      data: { themeId: state.previousThemeId },
    });
  } else if (state.previousThemeId) {
    await prisma.userEquippedColors.create({
      data: { userId, themeId: state.previousThemeId },
    });
  }

  await prisma.userEventThemeState.updateMany({
    where: { userId, eventThemeId },
    data: { revertedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
