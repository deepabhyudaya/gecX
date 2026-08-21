"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import {
  AssignmentSchema,
  ClassSchema,
  ExamSchema,
  LessonSchema,
  ResultSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
  EventSchema,
  ParentSchema,
  GradeSchema,
  CollegeSchema,
} from "./formValidationSchemas";
import prisma from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { createNotificationsForUsers, getAllUserIdsByRole } from "@/lib/notifications";
import { awardGecXForResult } from "../actions/gecx.actions";
import { createClassServer, addStudentToClassServer, removeStudentFromClassServer } from "../actions/class-server.actions";

type CurrentState = { success: boolean; error: boolean };

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: data.teachers.map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const created = await prisma.class.create({
      data,
      select: { id: true, name: true },
    });

    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "New class added",
      message: `Class "${created.name}" created by @${username}.`,
      type: "CLASS_CREATED",
      entityId: String(created.id),
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    await createClassServer(created.id, created.name);

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.class.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: data.gradeId,
        supervisorId: data.supervisorId || null,
        branchCode: data.branchCode || null,
        department: data.department || null,
        totalSemesters: data.totalSemesters ?? null,
        intakeCapacity: data.intakeCapacity ?? null,
        collegeId: data.collegeId || null,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Class updated",
      message: `Class "${data.name}" updated by @${username}.`,
      type: "CLASS_UPDATED",
      entityId: String(data.id),
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {
    const classData = await prisma.class.findUnique({
      where: { id: parseInt(id) },
      select: {
        name: true,
        grade: { select: { level: true } }
      }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.class.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Class deleted",
      message: `Class "${classData?.name}" of grade "${classData?.grade?.level}" deleted by @${username}.`,
      type: "CLASS_DELETED",
      entityId: id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : undefined,
      publicMetadata: { role: "teacher" }
    });

    await prisma.teacher.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        employeeId: data.employeeId || null,
        designation: data.designation || null,
        department: data.department || null,
        qualification: data.qualification || null,
        experienceYears: Number.isFinite(data.experienceYears) ? (data.experienceYears as number) : null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate as any) : null,
        collegeId: data.collegeId || null,
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "New teacher added",
      message: `@${data.username} has joined as a teacher.`,
      type: "TEACHER_CREATED",
      entityId: user.id,
      teacherIds: teacherIds.filter((id) => id !== user.id),
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    console.error("createTeacher error:", err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      select: { username: true }
    });

    await clerkClient().users.deleteUser(id);

    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });
    const adminIds = await getAllUserIdsByRole("admin");
    await createNotificationsForUsers({
      title: "Teacher removed",
      message: `@${teacher?.username || "unknown"} account was deleted.`,
      type: "TEACHER_DELETED",
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  const { userId } = auth();
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const user = await clerkClient().users.updateUser(data.id, {
      username: data.username,
      ...(data.password ? { password: data.password } : {}),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        employeeId: data.employeeId || null,
        designation: data.designation || null,
        department: data.department || null,
        qualification: data.qualification || null,
        experienceYears: Number.isFinite(data.experienceYears) ? (data.experienceYears as number) : null,
        joiningDate: data.joiningDate ? new Date(data.joiningDate as any) : null,
        collegeId: data.collegeId || null,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Teacher updated",
      message: `@${data.username} profile was updated.`,
      type: "TEACHER_UPDATED",
      entityId: data.id,
      teacherIds: teacherIds.filter((id) => id !== data.id),
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  const { userId } = auth();
  try {
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    const user = await clerkClient().users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : undefined,
      publicMetadata: { role: "student" }
    });

    await prisma.student.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
        rollNumber: data.rollNumber || null,
        registrationNumber: data.registrationNumber || null,
        admissionYear: Number.isFinite(data.admissionYear) ? (data.admissionYear as number) : null,
        currentSemester: Number.isFinite(data.currentSemester) ? (data.currentSemester as number) : null,
        program: data.program || null,
        batch: data.batch || null,
        section: data.section || null,
        hosteller: data.hosteller ?? null,
        guardianName: data.guardianName || null,
        guardianPhone: data.guardianPhone || null,
        guardianRelation: data.guardianRelation || null,
        governmentId: data.governmentId || null,
        collegeId: data.collegeId || null,
      },
    });

    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "New student added",
      message: `@${data.username} has joined as a student.`,
      type: "STUDENT_CREATED",
      entityId: user.id,
      teacherIds,
      adminIds,
      parentIds: data.parentId ? [data.parentId] : [],
      excludeUserId: userId || null,
    });

    await addStudentToClassServer(
      user.id,
      data.classId,
      data.username,
      `${data.name} ${data.surname}`
    );

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  const { userId } = auth();
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const before = await prisma.student.findUnique({
      where: { id: data.id },
      select: {
        username: true,
        name: true,
        surname: true,
        email: true,
        phone: true,
        address: true,
        bloodType: true,
        sex: true,
        birthday: true,
        gradeId: true,
        classId: true,
        parentId: true,
      },
    });

    try {
      await clerkClient().users.updateUser(data.id, {
        username: data.username,
        ...(data.password ? { password: data.password } : {}),
        firstName: data.name,
        lastName: data.surname,
      });
    } catch (clerkErr: any) {
      console.warn("Clerk update skipped for student", data.id, ":", clerkErr?.message || clerkErr);
    }

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: data.gradeId,
        classId: data.classId,
        parentId: data.parentId,
        rollNumber: data.rollNumber || null,
        registrationNumber: data.registrationNumber || null,
        admissionYear: Number.isFinite(data.admissionYear) ? (data.admissionYear as number) : null,
        currentSemester: Number.isFinite(data.currentSemester) ? (data.currentSemester as number) : null,
        program: data.program || null,
        collegeId: data.collegeId || null,
        batch: data.batch || null,
        section: data.section || null,
        hosteller: data.hosteller ?? null,
        guardianName: data.guardianName || null,
        guardianPhone: data.guardianPhone || null,
        guardianRelation: data.guardianRelation || null,
        governmentId: data.governmentId || null,
      },
    });

    const changes: any[] = [];
    if (before) {
      if (before.name !== data.name) changes.push({ fieldName: "name", oldValue: before.name, newValue: data.name });
      if (before.surname !== data.surname) changes.push({ fieldName: "surname", oldValue: before.surname, newValue: data.surname });
      if (before.email !== (data.email || null)) changes.push({ fieldName: "email", oldValue: before.email, newValue: data.email || null });
      if (before.phone !== (data.phone || null)) changes.push({ fieldName: "phone", oldValue: before.phone, newValue: data.phone || null });
      if (before.address !== data.address) changes.push({ fieldName: "address", oldValue: before.address, newValue: data.address });
      if (before.bloodType !== data.bloodType) changes.push({ fieldName: "bloodType", oldValue: before.bloodType, newValue: data.bloodType });
      if (before.sex !== data.sex) changes.push({ fieldName: "sex", oldValue: before.sex, newValue: data.sex });
      if (before.birthday?.toISOString() !== data.birthday?.toISOString()) changes.push({ fieldName: "birthday", oldValue: before.birthday, newValue: data.birthday });
      if (before.gradeId !== data.gradeId) changes.push({ fieldName: "gradeId", oldValue: before.gradeId, newValue: data.gradeId });
      if (before.classId !== data.classId) changes.push({ fieldName: "classId", oldValue: before.classId, newValue: data.classId });
      if (before.parentId !== data.parentId) changes.push({ fieldName: "parentId", oldValue: before.parentId, newValue: data.parentId });
    }

    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Student updated",
      message: `@${data.username} profile was updated.`,
      type: "STUDENT_UPDATED",
      entityId: data.id,
      changes: changes.length > 0 ? changes : null,
      teacherIds,
      adminIds,
      parentIds: data.parentId ? [data.parentId] : [],
      studentIds: [data.id],
      excludeUserId: userId || null,
    });
    if (before && before.classId !== data.classId) {
      await removeStudentFromClassServer(data.id, before.classId);
      await addStudentToClassServer(
        data.id,
        data.classId,
        data.username,
        `${data.name} ${data.surname}`
      );
    }

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {
    const student = await prisma.student.findUnique({
      where: { id },
      select: { username: true }
    });

    await clerkClient().users.deleteUser(id);

    await prisma.student.delete({
      where: {
        id: id,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Student removed",
      message: `@${student?.username || "unknown"} account was deleted.`,
      type: "STUDENT_DELETED",
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  const { userId } = auth();
  try {
    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      select: {
        name: true,
        teacherId: true,
        class: { select: { students: { select: { id: true, parentId: true } } } },
      },
    });
    if (lesson) {
      const studentIds = lesson.class.students.map((s) => s.id);
      const parentIds = lesson.class.students.map((s) => s.parentId);
      const adminIds = await getAllUserIdsByRole("admin");

      const user = await clerkClient().users.getUser(userId || "");
      const username = user.username || "unknown";

      await createNotificationsForUsers({
        title: "New exam scheduled",
        message: `Exam "${exam.title}" scheduled for ${lesson.name} by @${username}.`,
        type: "EXAM_CREATED",
        entityId: String(exam.id),
        studentIds,
        parentIds,
        adminIds,
        teacherIds: [lesson.teacherId],
        excludeUserId: userId || null,
      });
    }

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Exam updated",
      message: `Exam "${data.title}" updated by @${username}.`,
      type: "EXAM_UPDATED",
      entityId: String(data.id),
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      select: { title: true }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.exam.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Exam deleted",
      message: `Exam "${exam?.title}" deleted by @${username}.`,
      type: "EXAM_DELETED",
      entityId: id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/exams");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  const { userId } = auth();
  try {
    const createdEvent = await prisma.event.create({
      data,
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    let teacherIds: string[] = [];
    let studentIds: string[] = [];
    let parentIds: string[] = [];
    const adminIds = await getAllUserIdsByRole("admin");

    if (data.classId) {

      const classData = await prisma.class.findUnique({
        where: { id: typeof data.classId === "string" ? parseInt(data.classId) : data.classId },
        include: {
          lessons: { select: { teacherId: true } },
          students: { select: { id: true, parentId: true } },
        },
      });
      if (classData) {
        teacherIds = Array.from(new Set(classData.lessons.map((l) => l.teacherId)));
        studentIds = classData.students.map((s) => s.id);
        parentIds = classData.students
          .filter((s) => s.parentId)
          .map((s) => s.parentId!);
      }
    } else {

      [teacherIds, studentIds, parentIds] = await Promise.all([
        getAllUserIdsByRole("teacher"),
        getAllUserIdsByRole("student"),
        getAllUserIdsByRole("parent"),
      ]);
    }

    await createNotificationsForUsers({
      title: "New event published",
      message: `Event "${data.title}" added to calendar by @${username}.`,
      type: "EVENT_CREATED",
      entityId: String(createdEvent.id),
      teacherIds,
      studentIds,
      parentIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/events");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
      },
    });

    let teacherIds: string[] = [];
    let studentIds: string[] = [];
    let parentIds: string[] = [];
    const adminIds = await getAllUserIdsByRole("admin");

    if (data.classId) {
      const classData = await prisma.class.findUnique({
        where: { id: typeof data.classId === "string" ? parseInt(data.classId) : data.classId },
        include: {
          lessons: { select: { teacherId: true } },
          students: { select: { id: true, parentId: true } },
        },
      });
      if (classData) {
        teacherIds = Array.from(new Set(classData.lessons.map((l) => l.teacherId)));
        studentIds = classData.students.map((s) => s.id);
        parentIds = classData.students.filter((s) => s.parentId).map((s) => s.parentId!);
      }
    } else {
      [teacherIds, studentIds, parentIds] = await Promise.all([
        getAllUserIdsByRole("teacher"),
        getAllUserIdsByRole("student"),
        getAllUserIdsByRole("parent"),
      ]);
    }

    await createNotificationsForUsers({
      title: "Event updated",
      message: `Event "${data.title}" updated by @${username}.`,
      type: "EVENT_UPDATED",
      entityId: String(data.id),
      teacherIds,
      studentIds,
      parentIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/events");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;

  try {
    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
      select: {
        title: true,
        startTime: true
      }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.event.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, studentIds, parentIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("student"),
      getAllUserIdsByRole("parent"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Event deleted",
      message: `Event "${event?.title}" on ${event?.startTime?.toLocaleDateString()} deleted by @${username}.`,
      type: "EVENT_DELETED",
      entityId: id,
      teacherIds,
      studentIds,
      parentIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/events");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createAttendance = async (
  currentState: CurrentState,
  data: any
) => {
  try {
    await prisma.attendance.create({
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/attendance");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateAttendance = async (
  currentState: CurrentState,
  data: any
) => {
  try {
    await prisma.attendance.update({
      where: {
        id: data.id,
      },
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

    revalidatePath("/list/attendance");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.attendance.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/attendance");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createAnnouncement = async (
  currentState: CurrentState,
  data: any
) => {
  const { userId } = auth();
  try {
    const announcementData: any = { ...data };

    if (announcementData.date && typeof announcementData.date === 'string') {
      announcementData.date = new Date(announcementData.date);
    }

    if (announcementData.classId !== undefined && announcementData.classId !== null) {
      if (typeof announcementData.classId === 'string') {
        if (announcementData.classId === '' || announcementData.classId === '0') {
          delete announcementData.classId;
        } else {
          const parsedId = parseInt(announcementData.classId);
          if (isNaN(parsedId) || parsedId === 0) {
            delete announcementData.classId;
          } else {
            announcementData.classId = parsedId;
          }
        }
      } else if (typeof announcementData.classId === 'number') {
        if (announcementData.classId === 0 || isNaN(announcementData.classId)) {
          delete announcementData.classId;
        }
      }
      if (announcementData.classId !== undefined) {
        const classExists = await prisma.class.findUnique({
          where: { id: announcementData.classId },
          select: { id: true },
        });
        if (!classExists) {
          delete announcementData.classId;
        }
      }
    }

    const createdAnnouncement = await prisma.announcement.create({
      data: announcementData,
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    let teacherIds: string[] = [];
    let studentIds: string[] = [];
    let parentIds: string[] = [];
    const adminIds = await getAllUserIdsByRole("admin");

    if (announcementData.classId) {

      const classData = await prisma.class.findUnique({
        where: { id: announcementData.classId },
        include: {
          lessons: { select: { teacherId: true } },
          students: { select: { id: true, parentId: true } },
        },
      });
      if (classData) {
        teacherIds = Array.from(new Set(classData.lessons.map((l: any) => l.teacherId)));
        studentIds = classData.students.map((s: any) => s.id);
        parentIds = classData.students
          .filter((s: any) => s.parentId)
          .map((s: any) => s.parentId!);
      }
    } else {

      [teacherIds, studentIds, parentIds] = await Promise.all([
        getAllUserIdsByRole("teacher"),
        getAllUserIdsByRole("student"),
        getAllUserIdsByRole("parent"),
      ]);
    }

    await createNotificationsForUsers({
      title: "New announcement",
      message: `Announcement "${data.title}" created by @${username}.`,
      type: "ANNOUNCEMENT_CREATED",
      entityId: String(createdAnnouncement.id),
      teacherIds,
      studentIds,
      parentIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/announcements");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    console.error("Error creating announcement:", err);
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: any
) => {
  const { userId } = auth();
  try {
    const announcementData: any = { ...data };

    if (announcementData.date && typeof announcementData.date === 'string') {
      announcementData.date = new Date(announcementData.date);
    }

    let finalClassId: number | null = null;
    if (announcementData.classId !== undefined && announcementData.classId !== null) {
      if (typeof announcementData.classId === 'string') {
        if (announcementData.classId === '' || announcementData.classId === '0') {
          finalClassId = null;
        } else {
          const parsedId = parseInt(announcementData.classId);
          if (isNaN(parsedId) || parsedId === 0) {
            finalClassId = null;
          } else {
            const classExists = await prisma.class.findUnique({
              where: { id: parsedId },
              select: { id: true },
            });
            finalClassId = classExists ? parsedId : null;
          }
        }
      } else if (typeof announcementData.classId === 'number') {
        if (announcementData.classId === 0 || isNaN(announcementData.classId)) {
          finalClassId = null;
        } else {
          const classExists = await prisma.class.findUnique({
            where: { id: announcementData.classId },
            select: { id: true },
          });
          finalClassId = classExists ? announcementData.classId : null;
        }
      }
    }

    await prisma.announcement.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        description: data.description,
        date: announcementData.date,
        classId: finalClassId,
      },
    });
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const [teacherIds, studentIds, parentIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("student"),
      getAllUserIdsByRole("parent"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Announcement updated",
      message: `Announcement "${data.title}" updated by @${username}.`,
      type: "ANNOUNCEMENT_UPDATED",
      entityId: String(data.id),
      teacherIds,
      studentIds,
      parentIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/announcements");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    console.error("Error updating announcement:", err);
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;

  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: parseInt(id) },
      select: { title: true }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.announcement.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, studentIds, parentIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("student"),
      getAllUserIdsByRole("parent"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Announcement deleted",
      message: `Announcement "${announcement?.title}" deleted by @${username}.`,
      type: "ANNOUNCEMENT_DELETED",
      entityId: id,
      teacherIds,
      studentIds,
      parentIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/announcements");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  const { userId } = auth();
  try {
    const createdLesson = await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "New lesson added",
      message: `Lesson "${data.name}" added to timetable by @${username}.`,
      type: "LESSON_CREATED",
      entityId: String(createdLesson.id),
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/lessons");
    revalidatePath("/list/attendance");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.lesson.update({
      where: { id: data.id },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Lesson updated",
      message: `Lesson "${data.name}" updated by @${username}.`,
      type: "LESSON_UPDATED",
      entityId: String(data.id),
      teacherIds,
      adminIds,
    });

    revalidatePath("/list/lessons");
    revalidatePath("/list/attendance");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: parseInt(id) },
      select: {
        name: true,
        subject: { select: { name: true } },
        class: { select: { name: true } }
      }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.lesson.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Lesson deleted",
      message: `Lesson "${lesson?.name}" (${lesson?.subject?.name}) for class "${lesson?.class?.name}" deleted by @${username}.`,
      type: "LESSON_DELETED",
      entityId: id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/lessons");
    revalidatePath("/list/attendance");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const createdAssignment = await prisma.assignment.create({
      data: {
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });

    const lesson = await prisma.lesson.findUnique({
      where: { id: data.lessonId },
      include: { class: { include: { students: true } } },
    });

    if (lesson) {
      const studentIds = lesson.class.students.map((s) => s.id);
      const parentIds = lesson.class.students.map((s) => s.parentId);
      const adminIds = await getAllUserIdsByRole("admin");
      await createNotificationsForUsers({
        title: "New assignment posted",
        message: `Assignment "${createdAssignment.title}" posted by @${username} for ${lesson.name}.`,
        type: "ASSIGNMENT_CREATED",
        entityId: String(createdAssignment.id),
        studentIds,
        parentIds,
        adminIds,
        teacherIds: [lesson.teacherId],
        excludeUserId: userId || null,
      });
    }

    revalidatePath("/list/assignments");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.assignment.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        lessonId: data.lessonId,
        startDate: data.startDate,
        dueDate: data.dueDate,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Assignment updated",
      message: `Assignment "${data.title}" updated by @${username}.`,
      type: "ASSIGNMENT_UPDATED",
      entityId: String(data.id),
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/assignments");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: parseInt(id) },
      select: {
        title: true,
        lesson: { select: { name: true } }
      }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.assignment.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Assignment deleted",
      message: `Assignment "${assignment?.title}" for "${assignment?.lesson?.name}" deleted by @${username}.`,
      type: "ASSIGNMENT_DELETED",
      entityId: id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/assignments");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const result = await prisma.result.create({
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.examId || null,
        assignmentId: data.assignmentId || null,
      },
    });

    const adminIds = await getAllUserIdsByRole("admin");
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { parentId: true },
    });

    let teacherIds: string[] = [];
    let message = `Result posted by @${username} (score: ${result.score}).`;

    if (data.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: data.examId },
        select: { title: true, lesson: { select: { teacherId: true, name: true } } },
      });
      if (exam) {
        teacherIds = [exam.lesson.teacherId];
        message = `Result posted by @${username} for exam "${exam.title}" (${exam.lesson.name}). Score: ${result.score}.`;
      }
    } else if (data.assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: data.assignmentId },
        select: { title: true, lesson: { select: { teacherId: true, name: true } } },
      });
      if (assignment) {
        teacherIds = [assignment.lesson.teacherId];
        message = `Result posted by @${username} for assignment "${assignment.title}" (${assignment.lesson.name}). Score: ${result.score}.`;
      }
    }

    await createNotificationsForUsers({
      title: "Result posted",
      message,
      type: "RESULT_POSTED",
      entityId: String(result.id),
      studentIds: [data.studentId],
      parentIds: student?.parentId ? [student.parentId] : [],
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    try {
      const examOrAssignment = data.examId ? "exam" : "assignment";
      await awardGecXForResult(data.studentId, result.score, examOrAssignment);
    } catch (error) {
      console.error("Failed to award gecX for result:", error);
    }

    revalidatePath("/list/results");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.examId || null,
        assignmentId: data.assignmentId || null,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Result updated",
      message: `Result score updated to ${data.score} by @${username}.`,
      type: "RESULT_UPDATED",
      entityId: String(data.id),
      teacherIds,
      adminIds,
      studentIds: [data.studentId],
      excludeUserId: userId || null,
    });
    revalidatePath("/list/results");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {

    const result = await prisma.result.findUnique({
      where: { id: parseInt(id) },
      select: {
        score: true,
        exam: { select: { title: true } },
        student: { select: { username: true } }
      }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.result.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Result deleted",
      message: `Result score ${result?.score} of @${result?.student?.username} for "${result?.exam?.title}" deleted by @${username}.`,
      type: "RESULT_DELETED",
      entityId: id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/results");
    revalidatePath("/admin");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      emailAddress: data.email ? [data.email] : undefined,
      publicMetadata: { role: "parent" }
    });

    await prisma.parent.create({
      data: {
        id: user.id,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "New parent added",
      message: `@${data.username} has joined as a parent.`,
      type: "PARENT_CREATED",
      entityId: user.id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  const { userId } = auth();
  if (!data.id) return { success: false, error: true };
  try {
    const user = await clerkClient().users.updateUser(data.id, {
      username: data.username,
      ...(data.password ? { password: data.password } : {}),
      firstName: data.name,
      lastName: data.surname,
    });

    await prisma.parent.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Parent updated",
      message: `@${data.username} profile was updated.`,
      type: "PARENT_UPDATED",
      entityId: data.id,
      teacherIds,
      adminIds,
      parentIds: [data.id],
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {

    const parent = await prisma.parent.findUnique({
      where: { id },
      select: { username: true }
    });

    await clerkClient().users.deleteUser(id);

    await prisma.parent.delete({ where: { id } });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Parent removed",
      message: `@${parent?.username || "unknown"} account was deleted.`,
      type: "PARENT_DELETED",
      entityId: id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createGrade = async (
  currentState: CurrentState,
  data: GradeSchema
) => {
  const { userId } = auth();
  try {
    const createdGrade = await prisma.grade.create({ data: { level: data.level } });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "New grade added",
      message: `Grade "${data.level}" added by @${username}.`,
      type: "GRADE_CREATED",
      entityId: String(createdGrade.id),
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/grades");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateGrade = async (
  currentState: CurrentState,
  data: GradeSchema
) => {
  const { userId } = auth();
  if (!data.id) return { success: false, error: true };
  try {

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.grade.update({
      where: {
        id: data.id,
      },
      data: {
        level: data.level,
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Grade updated",
      message: `Grade "${data.level}" updated by @${username}.`,
      type: "GRADE_UPDATED",
      entityId: String(data.id),
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/grades");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteGrade = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId } = auth();
  const id = data.get("id") as string;
  try {

    const grade = await prisma.grade.findUnique({
      where: { id: parseInt(id) },
      select: { level: true }
    });

    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    await prisma.grade.delete({
      where: {
        id: parseInt(id),
      },
    });
    const [teacherIds, adminIds] = await Promise.all([
      getAllUserIdsByRole("teacher"),
      getAllUserIdsByRole("admin"),
    ]);
    await createNotificationsForUsers({
      title: "Grade deleted",
      message: `Grade "${grade?.level}" deleted by @${username}.`,
      type: "GRADE_DELETED",
      entityId: id,
      teacherIds,
      adminIds,
      excludeUserId: userId || null,
    });
    revalidatePath("/list/grades");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createTicket = async (
  currentState: CurrentState,
  data: FormData
) => {
  const subject = data.get("subject") as string;
  const description = data.get("description") as string;

  if (!subject || !description) return { success: false, error: true };

  try {
    await prisma.ticket.create({
      data: {
        subject,
        description,
        status: "OPEN",
      },
    });

    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const createCollege = async (
  currentState: CurrentState,
  data: CollegeSchema
) => {
  const { userId } = auth();
  try {
    const user = await clerkClient().users.getUser(userId || "");
    const username = user.username || "unknown";

    const created = await prisma.college.create({
      data: {
        name: data.name,
        shortName: data.shortName || null,
        universityName: data.universityName || null,
        collegeCode: data.collegeCode || null,
        establishmentYear: Number.isFinite(data.establishmentYear)
          ? (data.establishmentYear as number)
          : null,
        accreditation: data.accreditation || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        websiteUrl: data.websiteUrl || null,
        logoUrl: data.logoUrl || null,
        bannerUrl: data.bannerUrl || null,
        rollNumberFormat: data.rollNumberFormat || null,
        registrationNumberFormat: data.registrationNumberFormat || null,
        isActive: data.isActive ?? true,
      },
      select: { id: true, name: true },
    });

    const adminIds = await getAllUserIdsByRole("admin");
    await createNotificationsForUsers({
      title: "New college added",
      message: `College "${created.name}" was created by @${username}.`,
      type: "GENERIC",
      entityId: created.id,
      adminIds,
      excludeUserId: userId || null,
    });

    revalidatePath("/list/colleges");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const updateCollege = async (
  currentState: CurrentState,
  data: CollegeSchema
) => {
  if (!data.id) return { success: false, error: true };
  try {
    await prisma.college.update({
      where: { id: data.id },
      data: {
        name: data.name,
        shortName: data.shortName || null,
        universityName: data.universityName || null,
        collegeCode: data.collegeCode || null,
        establishmentYear: Number.isFinite(data.establishmentYear)
          ? (data.establishmentYear as number)
          : null,
        accreditation: data.accreditation || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        websiteUrl: data.websiteUrl || null,
        logoUrl: data.logoUrl || null,
        bannerUrl: data.bannerUrl || null,
        rollNumberFormat: data.rollNumberFormat || null,
        registrationNumberFormat: data.registrationNumberFormat || null,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    revalidatePath("/list/colleges");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

export const deleteCollege = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  if (!id) return { success: false, error: true };
  try {

    await prisma.$transaction([
      prisma.class.updateMany({ where: { collegeId: id }, data: { collegeId: null } }),
      prisma.student.updateMany({ where: { collegeId: id }, data: { collegeId: null } }),
      prisma.college.delete({ where: { id } }),
    ]);
    revalidatePath("/list/colleges");
    return { success: true, error: false };
  } catch (err) {
    return { success: false, error: true };
  }
};

