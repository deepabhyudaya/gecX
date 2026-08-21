import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { userId: currentUserId } = auth();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, userType, durationMinutes } = body;

    if (!userId || !userType || !durationMinutes) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const code = crypto.randomBytes(6).toString("hex");
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    const access = await prisma.profileAccess.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        userType,
        code,
        expiresAt,
      },
    });

    return NextResponse.json({ code: access.code });
  } catch (error) {
    console.error("Generate access code error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
