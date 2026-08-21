"use server";

import { revalidatePath } from "next/cache";
import prisma from "./prisma";
import { auth } from "@clerk/nextjs/server";
import { createNotificationsForUsers, getAllUserIdsByRole } from "@/lib/notifications";
import { clerkClient } from "@clerk/nextjs/server";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

type State = { success: boolean; error: boolean };

export const createTicket = async (currentState: State, data: FormData) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const subject = data.get("subject") as string;
  const description = data.get("description") as string;
  try {
    await prisma.ticket.create({
      data: {
        subject, description, status: "OPEN",
        ...(role === "teacher" ? { teacherId: userId! } : {}),
        ...(role === "student" ? { studentId: userId! } : {}),
        ...(role === "parent"  ? { parentId:  userId! } : {}),
      },
    });
    revalidatePath("/list/tickets");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const approveCourse = async (currentState: State, data: FormData) => {
  const { userId } = auth();
  const id = parseInt(data.get("id") as string);
  try {
    const updated = await prisma.course.update({
      where: { id },
      data: { status: "APPROVED" },
      select: { id: true, title: true, teacherId: true },
    });

    const teacher = await prisma.teacher.findUnique({
      where: { id: updated.teacherId },
      select: { username: true },
    });

    const adminIds = await getAllUserIdsByRole("admin");
    await createNotificationsForUsers({
      title: "Course approved",
      message: `Course "${updated.title}" by ${teacher?.username || "a teacher"} was approved.`,
      type: "COURSE_APPROVED",
      entityId: String(updated.id),
      teacherIds: [updated.teacherId],
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/courses"); revalidatePath("/list/approvals");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const rejectCourse = async (currentState: State, data: FormData) => {
  const { userId } = auth();
  const id = parseInt(data.get("id") as string);
  try {
    const updated = await prisma.course.update({
      where: { id },
      data: { status: "REJECTED" },
      select: { id: true, title: true, teacherId: true },
    });

    const adminIds = await getAllUserIdsByRole("admin");

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await createNotificationsForUsers({
      title: "Course rejected",
      message: `Your course "${updated.title}" was rejected by @${username}.`,
      type: "COURSE_REJECTED",
      entityId: String(updated.id),
      teacherIds: [updated.teacherId],
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/courses"); revalidatePath("/list/approvals");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const adminDeleteCourse = async (currentState: State, data: FormData) => {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return { success: false, error: true };
  const id = parseInt(data.get("id") as string);
  try {
    const deleted = await prisma.course.delete({ where: { id }, select: { title: true, teacherId: true } });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await createNotificationsForUsers({
      title: "Course deleted",
      message: `Course "${deleted.title}" deleted by @${username}.`,
      type: "COURSE_DELETED",
      entityId: String(id),
      teacherIds: [deleted.teacherId],
      excludeUserId: userId || null,
    });
    revalidatePath("/list/courses"); revalidatePath("/list/approvals");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const adminExpireCourse = async (currentState: State, data: FormData) => {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const id = parseInt(data.get("id") as string);
  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return { success: false, error: true };

    if (role !== "admin" && course.teacherId !== userId) {
      return { success: false, error: true };
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status: "EXPIRED" },
      select: { id: true, title: true, teacherId: true },
    });
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const adminIds = await getAllUserIdsByRole("admin");
    await createNotificationsForUsers({
      title: "Course expired",
      message: `Course "${updated.title}" was marked as expired by @${username}.`,
      type: "COURSE_EXPIRED",
      entityId: String(updated.id),
      teacherIds: [updated.teacherId],
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/courses");
    revalidatePath("/list/approvals");
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const unexpireCourse = async (currentState: State, data: FormData) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const id = parseInt(data.get("id") as string);

  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return { success: false, error: true };

    if (role !== "admin" && course.teacherId !== userId) {
      return { success: false, error: true };
    }

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.course.update({ where: { id }, data: { status: "APPROVED" } });

    const adminIds = await getAllUserIdsByRole("admin");
    await createNotificationsForUsers({
      title: "Course un-expired",
      message: `Course "${course.title}" was marked as active again by @${username}.`,
      type: "COURSE_UNEXPIRED",
      entityId: String(id),
      teacherIds: [course.teacherId],
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/courses");
    revalidatePath("/list/approvals");
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const updateCourse = async (currentState: State, data: FormData) => {
  const { userId } = auth();
  const id = parseInt(data.get("id") as string);
  const title = data.get("title") as string;
  const description = data.get("description") as string;
  const slug = data.get("slug") as string;
  try {
    const before = await prisma.course.findUnique({
      where: { id },
      select: { title: true, description: true, slug: true, teacherId: true },
    });

    const updated = await prisma.course.update({
      where: { id },
      data: { title, description, slug },
      select: { title: true, description: true, slug: true, teacherId: true },
    });

    if (before) {
      const changes = [];
      if (before.title !== updated.title) changes.push({ fieldName: "title", oldValue: before.title, newValue: updated.title });
      if (before.description !== updated.description) changes.push({ fieldName: "description", oldValue: before.description, newValue: updated.description });
      if (before.slug !== updated.slug) changes.push({ fieldName: "slug", oldValue: before.slug, newValue: updated.slug });

      const user = await clerkClient().users.getUser(userId || "");
      const username = user.username || "unknown";

      await createNotificationsForUsers({
        title: "Course updated",
        message: `Course "${updated.title}" updated by @${username}.`,
        type: "COURSE_UPDATED",
        entityId: String(id),
        changes: changes.length > 0 ? changes : null,
        teacherIds: [updated.teacherId],
        excludeUserId: userId || null,
      });
    }
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const deleteCourse = async (currentState: State, data: FormData) => {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const id = parseInt(data.get("id") as string);
  try {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) return { success: false, error: true };

    if (role !== "admin" && course.teacherId !== userId) {
      return { success: false, error: true };
    }

    const deleted = await prisma.course.delete({ where: { id }, select: { title: true, teacherId: true } });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await createNotificationsForUsers({
      title: "Course deleted",
      message: `Course "${deleted.title}" deleted by @${username}.`,
      type: "COURSE_DELETED",
      entityId: String(id),
      teacherIds: [deleted.teacherId],
      excludeUserId: userId || null,
    });
    revalidatePath("/teacher/courses/builder"); revalidatePath("/list/courses");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const createLecture = async (currentState: State, data: FormData) => {
  const title = data.get("title") as string;
  const videoUrl = data.get("videoUrl") as string;
  const sectionId = parseInt(data.get("sectionId") as string);
  const order = parseInt(data.get("order") as string);
  try {
    await prisma.courseLecture.create({
      data: { title, videoUrl, order, sectionId },
    });
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const createCourse = async (currentState: State, data: FormData) => {
  const { userId } = auth();
  if (!userId) return { success: false, error: true };
  const title = data.get("title") as string;
  const description = data.get("description") as string;
  const baseSlug = toSlug(title);
  const slug = `${baseSlug}-${Date.now()}`;
  try {

    const teacher = await prisma.teacher.findUnique({
      where: { id: userId || "" },
      select: { username: true }
    });

    const course = await prisma.course.create({
      data: { title, description, slug, teacherId: userId, status: "PENDING" },
      select: { id: true, title: true, teacherId: true },
    });

    const adminIds = await getAllUserIdsByRole("admin");
    await createNotificationsForUsers({
      title: "New course submitted",
      message: `Course "${course.title}" submitted by @${teacher?.username || "unknown"} for approval.`,
      type: "COURSE_SUBMITTED",
      entityId: String(course.id),
      adminIds,
      teacherIds: [course.teacherId],
      excludeUserId: userId || null,
    });
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const createSection = async (currentState: State, data: FormData) => {
  const title = data.get("title") as string;
  const courseId = parseInt(data.get("courseId") as string);
  const order = parseInt(data.get("order") as string);
  try {
    await prisma.courseSection.create({ data: { title, order, courseId } });
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const updateSection = async (currentState: State, data: FormData) => {
  const id = parseInt(data.get("id") as string);
  const title = data.get("title") as string;
  try {
    await prisma.courseSection.update({ where: { id }, data: { title } });
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const deleteSection = async (currentState: State, data: FormData) => {
  const id = parseInt(data.get("id") as string);
  try {
    await prisma.courseSection.delete({ where: { id } });
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const updateLecture = async (currentState: State, data: FormData) => {
  const id = parseInt(data.get("id") as string);
  const title = data.get("title") as string;
  const videoUrl = data.get("videoUrl") as string;
  try {
    await prisma.courseLecture.update({ where: { id }, data: { title, videoUrl } });
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const deleteLecture = async (currentState: State, data: FormData) => {
  const id = parseInt(data.get("id") as string);
  try {
    await prisma.courseLecture.delete({ where: { id } });
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const enrollCourse = async (currentState: State, data: FormData) => {
  const { userId } = auth();
  const courseId = parseInt(data.get("courseId") as string);
  if (!userId) return { success: false, error: true };
  try {
    const enrollment = await prisma.courseEnrollment.create({ data: { courseId, studentId: userId } });
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true, teacherId: true },
    });
    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (course) {
      await createNotificationsForUsers({
        title: "New course enrollment",
        message: `${student?.username || "A student"} enrolled in "${course.title}".`,
        type: "COURSE_ENROLLMENT",
        entityId: String(enrollment.id),
        teacherIds: [course.teacherId],
        excludeUserId: userId || null,
      });
    }
    revalidatePath("/student/courses");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const markLectureComplete = async (currentState: State, data: FormData) => {
  const { userId } = auth();
  if (!userId) return { success: false, error: true };
  const lectureId  = parseInt(data.get("lectureId") as string);
  const courseSlug = data.get("courseSlug") as string;
  const completed  = data.get("completed") === "true";
  try {
    await prisma.courseProgress.upsert({
      where: { lectureId_studentId: { lectureId, studentId: userId } },
      update: { completed: !completed },
      create: { lectureId, studentId: userId, completed: true },
    });
    revalidatePath(`/student/courses/${courseSlug}`);
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const reorderSections = async (
  currentState: State,
  data: FormData
) => {
  const orderedIds = JSON.parse(data.get("orderedIds") as string) as number[];
  try {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.courseSection.update({ where: { id }, data: { order: idx + 1 } })
      )
    );
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};

export const reorderLectures = async (
  currentState: State,
  data: FormData
) => {
  const orderedIds = JSON.parse(data.get("orderedIds") as string) as number[];
  try {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.courseLecture.update({ where: { id }, data: { order: idx + 1 } })
      )
    );
    revalidatePath("/teacher/courses/builder");
    return { success: true, error: false };
  } catch (err) { return { success: false, error: true }; }
};
