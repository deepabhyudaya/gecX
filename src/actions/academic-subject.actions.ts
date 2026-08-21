"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

function checkAdmin() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
}

export async function getAcademicSubjects() {
  return prisma.academicSubject.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getAllAcademicSubjects() {
  checkAdmin();
  return prisma.academicSubject.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createAcademicSubject(name: string, color?: string) {
  checkAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Subject name is required");
  if (trimmed.length > 50) throw new Error("Subject name must be 50 characters or less");

  const subject = await prisma.academicSubject.create({
    data: {
      name: trimmed,
      color: color || "#3B82F6",
    },
  });

  revalidatePath("/admin/academic-subjects");
  revalidatePath("/community");
  return subject;
}

export async function updateAcademicSubject(id: string, name: string, color?: string, isActive?: boolean) {
  checkAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Subject name is required");

  const subject = await prisma.academicSubject.update({
    where: { id },
    data: {
      name: trimmed,
      color: color !== undefined ? color : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    },
  });

  revalidatePath("/admin/academic-subjects");
  revalidatePath("/community");
  return subject;
}

export async function deleteAcademicSubject(id: string) {
  checkAdmin();

  const postCount = await prisma.communityPost.count({
    where: { subjectId: id },
  });

  if (postCount > 0) {

    await prisma.academicSubject.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    await prisma.academicSubject.delete({
      where: { id },
    });
  }

  revalidatePath("/admin/academic-subjects");
  revalidatePath("/community");
  return { success: true };
}
