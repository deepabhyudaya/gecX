import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request, { params }: { params: { username: string } }) {
  try {
    const { userId: adminId } = auth();
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const student = await prisma.student.findUnique({ where: { username: params.username } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    await prisma.userBadge.deleteMany({
      where: { userId: student.id, adminSet: true }
    });

    await prisma.badgeCache.updateMany({
      where: { userId: student.id },
      data: { invalidated: true }
    });

    await prisma.badgeAdminOverrideLog.create({
      data: {
        adminId: adminId,
        studentId: student.id,
        overrideType: 'RESET'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to reset badges' }, { status: 500 });
  }
}
