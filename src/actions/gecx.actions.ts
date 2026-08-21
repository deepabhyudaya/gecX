"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getGecXSettings } from "./gecx-settings.actions";

export async function getOrCreateGecXBalance(userId: string, userType: string) {
  const settings = await getGecXSettings();
  return prisma.userGecXBalance.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      userType,
      balance: settings.defaultStartingBalance,
      totalEarned: settings.defaultStartingBalance,
      totalSpent: 0,
    },
  });
}

export async function getUserGecXBalance(userId?: string) {
  const { userId: currentUserId, sessionClaims } = auth();
  const targetUserId = userId || currentUserId;
  const userType = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  if (!targetUserId) throw new Error("Unauthorized");

  const balance = await getOrCreateGecXBalance(targetUserId, userType);
  return balance;
}

export async function getGecXTransactionHistory(userId?: string, limit: number = 50) {
  const { userId: currentUserId } = auth();
  const targetUserId = userId || currentUserId;

  if (!targetUserId) throw new Error("Unauthorized");

  const transactions = await prisma.gecXTransaction.findMany({
    where: { userId: targetUserId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return transactions;
}

export async function awardGecX({
  userId,
  userType,
  amount,
  type,
  description,
  relatedId,
}: {
  userId: string;
  userType: string;
  amount: number;
  type: string;
  description?: string;
  relatedId?: string;
}) {
  const balance = await getOrCreateGecXBalance(userId, userType);

  await prisma.userGecXBalance.update({
    where: { userId },
    data: {
      balance: balance.balance + amount,
      totalEarned: balance.totalEarned + amount,
    },
  });

  await prisma.gecXTransaction.create({
    data: {
      userId,
      userType,
      amount,
      type,
      description,
      relatedId,
    },
  });

  return { success: true, newBalance: balance.balance + amount };
}

export async function deductGecXForPurchase({
  userId,
  amount,
  description,
}: {
  userId: string;
  amount: number;
  description: string;
}) {
  const balance = await prisma.userGecXBalance.findUnique({
    where: { userId },
  });

  if (!balance || balance.balance < amount) {
    throw new Error("Insufficient gecX balance");
  }

  await prisma.userGecXBalance.update({
    where: { userId },
    data: {
      balance: balance.balance - amount,
      totalSpent: balance.totalSpent + amount,
    },
  });

  await prisma.gecXTransaction.create({
    data: {
      userId,
      userType: balance.userType,
      amount: -amount,
      type: "purchase",
      description,
    },
  });

  return { success: true, newBalance: balance.balance - amount };
}

export async function awardGecXForAttendance(studentId: string, date: Date, present: boolean) {
  if (!present) return { success: false, reason: "Not present" };

  const settings = await getGecXSettings();
  const amount = settings.attendancePerDay;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parent: true,
      class: { include: { teacher: true } },
    },
  });

  if (!student) throw new Error("Student not found");

  await awardGecX({
    userId: studentId,
    userType: "student",
    amount,
    type: "attendance",
    description: `Attendance on ${date.toDateString()}`,
  });

  if (student.class?.teacher) {
    const teacherAmount = Math.ceil(amount * settings.teacherAttendanceBonusPercent / 100);
    if (teacherAmount > 0) {
      await awardGecX({
        userId: student.class.teacher.id,
        userType: "teacher",
        amount: teacherAmount,
        type: "teacher_bonus",
        description: `Bonus from ${student.name}'s attendance`,
        relatedId: studentId,
      });
    }
  }

  if (student.parent) {
    const parentAmount = Math.ceil(amount * settings.parentAttendanceBonusPercent / 100);
    if (parentAmount > 0) {
      await awardGecX({
        userId: student.parent.id,
        userType: "parent",
        amount: parentAmount,
        type: "parent_bonus",
        description: `Bonus from ${student.name}'s attendance`,
        relatedId: studentId,
      });
    }
  }

  return { success: true, amount, studentId };
}

export async function awardGecXForResult(studentId: string, score: number, examOrAssignment: string) {
  const settings = await getGecXSettings();

  let amount = 0;
  if (score >= 95) amount = settings.resultAbove95;
  else if (score >= 90) amount = settings.resultAbove90;
  else if (score >= 85) amount = settings.resultAbove85;
  else if (score >= 80) amount = settings.resultAbove80;
  else if (score >= 70) amount = settings.resultAbove70;
  else if (score >= 60) amount = settings.resultAbove60;

  if (amount === 0) return { success: false, reason: "Score below threshold" };

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      parent: true,
      class: { include: { teacher: true } },
    },
  });

  if (!student) throw new Error("Student not found");

  await awardGecX({
    userId: studentId,
    userType: "student",
    amount,
    type: "result",
    description: `${examOrAssignment} score: ${score}%`,
  });

  if (student.class?.teacher) {
    const teacherAmount = Math.ceil(amount * settings.teacherResultBonusPercent / 100);
    if (teacherAmount > 0) {
      await awardGecX({
        userId: student.class.teacher.id,
        userType: "teacher",
        amount: teacherAmount,
        type: "teacher_bonus",
        description: `Bonus from ${student.name}'s ${examOrAssignment} result`,
        relatedId: studentId,
      });
    }
  }

  if (student.parent) {
    const parentAmount = Math.ceil(amount * settings.parentResultBonusPercent / 100);
    if (parentAmount > 0) {
      await awardGecX({
        userId: student.parent.id,
        userType: "parent",
        amount: parentAmount,
        type: "parent_bonus",
        description: `Bonus from ${student.name}'s ${examOrAssignment} result`,
        relatedId: studentId,
      });
    }
  }

  return { success: true, amount, studentId, score };
}

export async function adminGrantGecX(userId: string, amount: number, reason?: string) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  if (typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    throw new Error("Amount must be a positive integer");
  }

  let userType = "student";
  const existingBalance = await prisma.userGecXBalance.findUnique({
    where: { userId },
  });

  if (existingBalance) {
    userType = existingBalance.userType;
  } else {

    const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
    if (teacher) userType = "teacher";
    else {
      const parent = await prisma.parent.findUnique({ where: { id: userId } });
      if (parent) userType = "parent";
      else {
        const admin = await prisma.admin.findUnique({ where: { id: userId } });
        if (admin) userType = "admin";
      }
    }
  }

  const result = await awardGecX({
    userId,
    userType,
    amount,
    type: "admin_grant",
    description: reason || "Admin grant",
  });

  return { success: true, newBalance: result.newBalance };
}

export async function getAllGecXBalances() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const balances = await prisma.userGecXBalance.findMany({
    orderBy: { balance: "desc" },
  });

  return balances;
}

export async function addGecXToAdminsForTesting() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const admins = await prisma.admin.findMany({
    select: { id: true, username: true },
  });

  const results = [];

  for (const admin of admins) {

    let userType = "admin";
    let balance = await prisma.userGecXBalance.findUnique({
      where: { userId: admin.id },
    });

    if (!balance) {

      balance = await prisma.userGecXBalance.create({
        data: {
          userId: admin.id,
          userType,
          balance: 5000000,
          totalEarned: 5000000,
          totalSpent: 0,
        },
      });
    } else {

      balance = await prisma.userGecXBalance.update({
        where: { userId: admin.id },
        data: {
          balance: balance.balance + 5000000,
          totalEarned: balance.totalEarned + 5000000,
        },
      });
    }

    await prisma.gecXTransaction.create({
      data: {
        userId: admin.id,
        userType,
        amount: 5000000,
        type: "admin_grant",
        description: "Testing: Added 5M gecX to admin",
      },
    });

    results.push({
      adminId: admin.id,
      username: admin.username,
      newBalance: balance.balance,
    });
  }

  return { success: true, updated: results.length, admins: results };
}

export async function addCustomGecXToUser(username: string, amount: number) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  if (!username || typeof amount !== "number" || amount <= 0) {
    throw new Error("Invalid username or amount");
  }

  const [student, teacher, parent, admin] = await Promise.all([
    prisma.student.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true },
    }),
    prisma.teacher.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true },
    }),
    prisma.parent.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true },
    }),
    prisma.admin.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true, username: true },
    }),
  ]);

  const user = student || teacher || parent || admin;

  if (!user) {
    throw new Error("User not found");
  }

  let userType = "admin";
  if (student) userType = "student";
  else if (teacher) userType = "teacher";
  else if (parent) userType = "parent";

  let balance = await prisma.userGecXBalance.findUnique({
    where: { userId: user.id },
  });

  const oldBalance = balance?.balance || 0;

  if (!balance) {
    balance = await prisma.userGecXBalance.create({
      data: {
        userId: user.id,
        userType,
        balance: amount,
        totalEarned: amount,
        totalSpent: 0,
      },
    });
  } else {
    balance = await prisma.userGecXBalance.update({
      where: { userId: user.id },
      data: {
        balance: balance.balance + amount,
        totalEarned: balance.totalEarned + amount,
      },
    });
  }

  await prisma.gecXTransaction.create({
    data: {
      userId: user.id,
      userType,
      amount,
      type: "admin_grant",
      description: `Testing: Added ${amount.toLocaleString()} gecX`,
    },
  });

  return {
    success: true,
    username: user.username,
    oldBalance,
    newBalance: balance.balance,
    added: amount,
  };
}
