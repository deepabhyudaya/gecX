import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BadgeCategory, BadgeColor } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId: adminId } = auth();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { username, category, tier, color } = await req.json();

    const student = await prisma.student.findUnique({ where: { username } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    await prisma.$transaction([
      prisma.userBadge.upsert({
        where: { userId_category: { userId: student.id, category } },
        update: { currentTier: tier, currentColor: color, adminSet: true, adminSetById: adminId, adminSetAt: new Date() },
        create: { userId: student.id, category, currentTier: tier, currentColor: color, adminSet: true, adminSetById: adminId, adminSetAt: new Date() }
      }),
      prisma.badgeAdminOverrideLog.create({
        data: { adminId, studentId: student.id, category, newTier: tier, newColor: color, overrideType: 'SINGLE' }
      }),
      prisma.badgeCache.update({
        where: { userId: student.id },
        data: { invalidated: true }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to set badge' }, { status: 500 });
  }
}
