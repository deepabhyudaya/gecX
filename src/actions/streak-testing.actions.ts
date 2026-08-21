"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function setCustomUserStreak(username: string, streak: number) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  if (!username || typeof streak !== "number" || streak < 0) {
    throw new Error("Invalid username or streak amount");
  }

  const profiles = await prisma.$queryRaw`
    SELECT "userId", "currentStreak", "longestStreak"
    FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];
  if (!profile) throw new Error("User not found");

  const newLongest = Math.max(Number(profile.longestStreak) || 0, streak);
  const lastActive = streak > 0 ? new Date().toISOString() : null;

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "currentStreak" = ${streak},
        "longestStreak" = ${newLongest},
        "lastActiveDate" = ${lastActive}::timestamp,
        "updatedAt" = NOW()
    WHERE "userId" = ${profile.userId}
  `;

  revalidatePath(`/${username}`);
  revalidatePath("/community");
  revalidatePath("/leaderboard");

  return {
    success: true,
    username,
    currentStreak: streak,
    longestStreak: newLongest,
  };
}

export async function setStreakForAllAdmins(streak: number) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const admins = await prisma.admin.findMany({
    select: { id: true, username: true },
  });

  const results = [];
  const lastActive = streak > 0 ? new Date().toISOString() : null;

  for (const admin of admins) {

    const profiles = await prisma.$queryRaw`
      SELECT "userId", "longestStreak" FROM "UserCommunityProfile"
      WHERE "userId" = ${admin.id}
      LIMIT 1
    `;
    const profile = (profiles as any[])[0];

    if (!profile) {

      await prisma.$executeRaw`
        INSERT INTO "UserCommunityProfile"
          ("userId", "userType", "username", "displayName", "currentStreak", "longestStreak", "lastActiveDate", "createdAt", "updatedAt")
        VALUES
          (${admin.id}, 'admin', ${admin.username || `admin_${admin.id.slice(-8)}`}, ${admin.username || "Admin"}, ${streak}, ${streak}, ${lastActive}::timestamp, NOW(), NOW())
      `;
    } else {
      const newLongest = Math.max(Number(profile.longestStreak) || 0, streak);
      await prisma.$executeRaw`
        UPDATE "UserCommunityProfile"
        SET "currentStreak" = ${streak},
            "longestStreak" = ${newLongest},
            "lastActiveDate" = ${lastActive}::timestamp,
            "updatedAt" = NOW()
        WHERE "userId" = ${admin.id}
      `;
    }

    results.push({
      userId: admin.id,
      username: admin.username,
      currentStreak: streak,
    });
  }

  revalidatePath("/community");
  revalidatePath("/leaderboard");

  return { success: true, updated: results.length, admins: results };
}

export async function resetUserStreak(username: string) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const profiles = await prisma.$queryRaw`
    SELECT "userId", "currentStreak", "longestStreak"
    FROM "UserCommunityProfile"
    WHERE LOWER(username) = LOWER(${username})
    LIMIT 1
  `;
  const profile = (profiles as any[])[0];
  if (!profile) throw new Error("User not found");

  await prisma.$executeRaw`
    DELETE FROM "UserActivityLog"
    WHERE "userId" = ${profile.userId}
  `;

  await prisma.$executeRaw`
    UPDATE "UserCommunityProfile"
    SET "currentStreak" = 0,
        "lastActiveDate" = NULL,
        "updatedAt" = NOW()
    WHERE "userId" = ${profile.userId}
  `;

  revalidatePath(`/${username}`);
  revalidatePath("/community");
  revalidatePath("/leaderboard");

  return {
    success: true,
    username,
    currentStreak: 0,
    longestStreak: Number(profile.longestStreak) || 0,
  };
}
