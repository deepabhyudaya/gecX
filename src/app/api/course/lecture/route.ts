import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const title = data.get("title") as string;
  const videoUrl = data.get("videoUrl") as string;
  const sectionId = parseInt(data.get("sectionId") as string);
  const order = parseInt(data.get("order") as string);

  await prisma.courseLecture.create({
    data: { title, videoUrl, order, sectionId },
  });

  revalidatePath("/teacher/courses/builder");

  return NextResponse.redirect(
    new URL("/teacher/courses/builder", req.url)
  );
}
