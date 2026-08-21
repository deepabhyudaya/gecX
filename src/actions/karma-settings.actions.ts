"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export type KarmaSettingsData = {
  likeReceived: number;
  commentCreated: number;
  commentReceived: number;
  postCreated: number;
  repostReceived: number;
  perfectAttendanceWeek: number;
  attendancePerDay: number;
  resultAbove95: number;
  resultAbove90: number;
  resultAbove85: number;
  resultAbove80: number;
  resultAbove70: number;
  resultAbove60: number;
  messageSent: number;
  messageReactionReceived: number;
  serverBumpReceived: number;
  bestAnswerKarma: number;
  helpfulAnswerKarma: number;
  promisingAnswerKarma: number;
};

function checkAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
}

export async function getKarmaSettings(): Promise<KarmaSettingsData> {
  let settings = await prisma.karmaSettings.findFirst();

  if (!settings) {

    settings = await prisma.karmaSettings.create({
      data: {
        likeReceived: 2,
        commentCreated: 1,
        commentReceived: 1,
        postCreated: 2,
        repostReceived: 10,
        perfectAttendanceWeek: 5,
        attendancePerDay: 1,
        resultAbove95: 25,
        resultAbove90: 20,
        resultAbove85: 15,
        resultAbove80: 12,
        resultAbove70: 8,
        resultAbove60: 5,
        messageSent: 2,
        messageReactionReceived: 1,
        serverBumpReceived: 5,
        bestAnswerKarma: 100,
        helpfulAnswerKarma: 50,
        promisingAnswerKarma: 25,
      },
    });
  }

  return {
    likeReceived: settings.likeReceived,
    commentCreated: settings.commentCreated,
    commentReceived: settings.commentReceived,
    postCreated: settings.postCreated,
    repostReceived: settings.repostReceived,
    perfectAttendanceWeek: settings.perfectAttendanceWeek,
    attendancePerDay: settings.attendancePerDay,
    resultAbove95: settings.resultAbove95,
    resultAbove90: settings.resultAbove90,
    resultAbove85: settings.resultAbove85,
    resultAbove80: settings.resultAbove80,
    resultAbove70: settings.resultAbove70,
    resultAbove60: settings.resultAbove60,
    messageSent: settings.messageSent,
    messageReactionReceived: settings.messageReactionReceived,
    serverBumpReceived: settings.serverBumpReceived,
    bestAnswerKarma: settings.bestAnswerKarma,
    helpfulAnswerKarma: settings.helpfulAnswerKarma,
    promisingAnswerKarma: settings.promisingAnswerKarma,
  };
}

export async function updateKarmaSettings(settings: Partial<KarmaSettingsData>) {
  checkAdmin();

  for (const [key, value] of Object.entries(settings)) {
    if (typeof value !== "number" || value < 0 || !Number.isInteger(value)) {
      throw new Error(`${key} must be a non-negative integer`);
    }
  }

  const existing = await prisma.karmaSettings.findFirst();

  if (existing) {
    await prisma.karmaSettings.update({
      where: { id: existing.id },
      data: settings,
    });
  } else {
    await prisma.karmaSettings.create({
      data: settings as KarmaSettingsData,
    });
  }

  revalidatePath("/admin/karma-settings");
  return { success: true };
}

export async function resetKarmaSettingsToDefaults() {
  checkAdmin();

  const defaults: KarmaSettingsData = {
    likeReceived: 2,
    commentCreated: 1,
    commentReceived: 1,
    postCreated: 2,
    repostReceived: 10,
    perfectAttendanceWeek: 5,
    attendancePerDay: 1,
    resultAbove95: 25,
    resultAbove90: 20,
    resultAbove85: 15,
    resultAbove80: 12,
    resultAbove70: 8,
    resultAbove60: 5,
    messageSent: 2,
    messageReactionReceived: 1,
    serverBumpReceived: 5,
    bestAnswerKarma: 100,
    helpfulAnswerKarma: 50,
    promisingAnswerKarma: 25,
  };

  const existing = await prisma.karmaSettings.findFirst();

  if (existing) {
    await prisma.karmaSettings.update({
      where: { id: existing.id },
      data: defaults,
    });
  } else {
    await prisma.karmaSettings.create({
      data: defaults,
    });
  }

  revalidatePath("/admin/karma-settings");
  return { success: true, defaults };
}
