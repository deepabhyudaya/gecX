"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { FormStatus, FormType, QuestionType } from "@prisma/client";

export async function createForm(data: {
  title: string;
  description?: string | null;
  type: "GENERAL" | "EXAM" | "ASSIGNMENT";
  timeLimit?: number | null;
  dueDate?: Date | null;
  allowMultiple?: boolean;
  examId?: number | null;
  assignmentId?: number | null;
}) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin" && role !== "teacher") {
    throw new Error("Forbidden: Only teachers and admins can create forms");
  }

  if (data.type === "EXAM" && data.examId) {
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
      include: { lesson: true },
    });
    if (!exam) throw new Error("Linked Exam not found");
    if (role === "teacher" && exam.lesson.teacherId !== userId) {
      throw new Error("Unauthorized: You do not teach this class");
    }
  }

  if (data.type === "ASSIGNMENT" && data.assignmentId) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId },
      include: { lesson: true },
    });
    if (!assignment) throw new Error("Linked Assignment not found");
    if (role === "teacher" && assignment.lesson.teacherId !== userId) {
      throw new Error("Unauthorized: You do not teach this class");
    }
  }

  const form = await prisma.form.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type as any,
      status: "DRAFT",
      createdById: userId,
      timeLimit: data.timeLimit,
      dueDate: data.dueDate,
      allowMultiple: data.type === "GENERAL" ? (data.allowMultiple ?? false) : false,
      examId: data.type === "EXAM" ? data.examId : null,
      assignmentId: data.type === "ASSIGNMENT" ? data.assignmentId : null,
    },
  });

  revalidatePath("/list/forms");
  return { success: true, formId: form.id };
}

export async function updateForm(
  id: string,
  data: {
    title: string;
    description?: string | null;
    timeLimit?: number | null;
    dueDate?: Date | null;
    allowMultiple?: boolean;
    examId?: number | null;
    assignmentId?: number | null;
  }
) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) throw new Error("Form not found");

  if (form.createdById !== userId && role !== "admin") {
    throw new Error("Forbidden: You do not own this form");
  }

  await prisma.form.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      timeLimit: data.timeLimit,
      dueDate: data.dueDate,
      allowMultiple: form.type === "GENERAL" ? (data.allowMultiple ?? false) : false,
      examId: form.type === "EXAM" ? data.examId : null,
      assignmentId: form.type === "ASSIGNMENT" ? data.assignmentId : null,
    },
  });

  revalidatePath("/list/forms");
  revalidatePath(`/list/forms/builder/${id}`);
  return { success: true };
}

export async function deleteForm(id: string) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) throw new Error("Form not found");

  if (form.createdById !== userId && role !== "admin") {
    throw new Error("Forbidden: You do not own this form");
  }

  await prisma.form.delete({ where: { id } });

  revalidatePath("/list/forms");
  return { success: true };
}

export async function publishForm(id: string, status: "DRAFT" | "PUBLISHED") {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) throw new Error("Form not found");

  if (form.createdById !== userId && role !== "admin") {
    throw new Error("Forbidden: You do not own this form");
  }

  await prisma.form.update({
    where: { id },
    data: { status: status as FormStatus },
  });

  revalidatePath("/list/forms");
  revalidatePath(`/list/forms/builder/${id}`);
  return { success: true };
}

export async function saveFormQuestions(
  formId: string,
  questions: Array<{
    id?: string;
    type: "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "DROPDOWN" | "RATING" | "DATE";
    title: string;
    description?: string | null;
    isRequired: boolean;
    order: number;
    points?: number | null;
    options?: Array<{
      id?: string;
      text: string;
      isCorrect: boolean;
      order: number;
    }>;
  }>
) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  const form = await prisma.form.findUnique({ where: { id: formId } });
  if (!form) throw new Error("Form not found");

  if (form.createdById !== userId && role !== "admin") {
    throw new Error("Forbidden");
  }

  await prisma.$transaction(async (tx) => {

    const existingQuestions = await tx.formQuestion.findMany({
      where: { formId },
      select: { id: true },
    });
    const existingIds = existingQuestions.map((q) => q.id);

    const incomingIds = questions.map((q) => q.id).filter(Boolean) as string[];
    const idsToDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (idsToDelete.length > 0) {
      await tx.formQuestion.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    for (const q of questions) {
      const qId = q.id || undefined;

      const savedQuestion = await tx.formQuestion.upsert({
        where: { id: qId || "new-question-placeholder" },
        create: {
          formId,
          type: q.type as QuestionType,
          title: q.title,
          description: q.description,
          isRequired: q.isRequired,
          order: q.order,
          points: q.points,
        },
        update: {
          type: q.type as QuestionType,
          title: q.title,
          description: q.description,
          isRequired: q.isRequired,
          order: q.order,
          points: q.points,
        },
      });

      if (q.options) {
        const existingOptions = await tx.questionOption.findMany({
          where: { questionId: savedQuestion.id },
          select: { id: true },
        });
        const existingOptIds = existingOptions.map((o) => o.id);

        const incomingOptIds = q.options.map((o) => o.id).filter(Boolean) as string[];
        const optsToDelete = existingOptIds.filter((id) => !incomingOptIds.includes(id));

        if (optsToDelete.length > 0) {
          await tx.questionOption.deleteMany({
            where: { id: { in: optsToDelete } },
          });
        }

        for (const opt of q.options) {
          const optId = opt.id || undefined;
          await tx.questionOption.upsert({
            where: { id: optId || "new-option-placeholder" },
            create: {
              questionId: savedQuestion.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
              order: opt.order,
            },
            update: {
              text: opt.text,
              isCorrect: opt.isCorrect,
              order: opt.order,
            },
          });
        }
      } else {

        await tx.questionOption.deleteMany({
          where: { questionId: savedQuestion.id },
        });
      }
    }
  });

  revalidatePath(`/list/forms/builder/${formId}`);
  return { success: true };
}

export async function submitFormResponse(data: {
  formId: string;
  answers: Array<{
    questionId: string;
    textResponse?: string | null;
    selectedOptionIds?: string[];
  }>;
}) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const form = await prisma.form.findUnique({
    where: { id: data.formId },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  if (!form) throw new Error("Form not found");
  if (form.status !== "PUBLISHED") throw new Error("Form is not published");

  if (form.type !== "GENERAL" || !form.allowMultiple) {
    const existing = await prisma.formResponse.findFirst({
      where: { formId: data.formId, submittedById: userId },
    });
    if (existing) {
      throw new Error("You have already submitted a response for this form");
    }
  }

  let studentId: string | null = null;
  if (form.type === "EXAM" || form.type === "ASSIGNMENT") {
    const student = await prisma.student.findUnique({ where: { id: userId } });
    if (!student) {
      throw new Error("Only students can submit exam/assignment answers");
    }
    studentId = userId;

    if (form.dueDate && new Date() > new Date(form.dueDate)) {
      throw new Error("Submission deadline has passed");
    }
  }

  let totalPoints = 0;
  let earnedPoints = 0;
  let hasManualGrading = false;

  const answersToCreate = data.answers.map((ans) => {
    const question = form.questions.find((q) => q.id === ans.questionId);
    if (!question) throw new Error("Invalid question ID in submission");

    const points = question.points || 0;

    if (question.type === "SINGLE_CHOICE" || question.type === "DROPDOWN") {
      totalPoints += points;
      const selectedId = ans.selectedOptionIds?.[0];
      const correctOption = question.options.find((o) => o.isCorrect);
      if (selectedId && correctOption && selectedId === correctOption.id) {
        earnedPoints += points;
      }
    } else if (question.type === "MULTI_CHOICE") {
      totalPoints += points;
      const selectedIds = ans.selectedOptionIds || [];
      const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);

      const isExactlyCorrect =
        selectedIds.length === correctOptionIds.length &&
        selectedIds.every((id) => correctOptionIds.includes(id));

      if (isExactlyCorrect) {
        earnedPoints += points;
      }
    } else if (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") {

      if (points > 0) {
        hasManualGrading = true;
      }
    }

    return {
      questionId: ans.questionId,
      textResponse: ans.textResponse || null,
      selectedOptionIds: ans.selectedOptionIds || [],
    };
  });

  const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : null;
  const isGraded = !hasManualGrading;

  const response = await prisma.$transaction(async (tx) => {
    let resultId: number | null = null;

    if (form.type === "EXAM" || form.type === "ASSIGNMENT") {

      const scoreToSave = finalScore !== null ? finalScore : 0;

      const result = await tx.result.create({
        data: {
          score: scoreToSave,
          studentId: studentId!,
          examId: form.type === "EXAM" ? form.examId : null,
          assignmentId: form.type === "ASSIGNMENT" ? form.assignmentId : null,
        },
      });
      resultId = result.id;
    }

    const res = await tx.formResponse.create({
      data: {
        formId: data.formId,
        studentId,
        submittedById: userId,
        score: finalScore,
        isGraded,
        resultId,
        answers: {
          create: answersToCreate,
        },
      },
    });

    return res;
  });

  revalidatePath(`/list/forms/attempt/${data.formId}`);
  revalidatePath("/list/results");
  return { success: true, responseId: response.id, autoGraded: isGraded, score: finalScore };
}

export async function gradeFormResponse(
  responseId: string,
  manualScores: Record<string, number>
) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  const response = await prisma.formResponse.findUnique({
    where: { id: responseId },
    include: {
      form: {
        include: {
          questions: {
            include: { options: true },
          },
        },
      },
      answers: true,
    },
  });

  if (!response) throw new Error("Response not found");
  if (response.form.createdById !== userId && role !== "admin") {
    throw new Error("Forbidden: Only form creator can grade answers");
  }

  let totalPoints = 0;
  let earnedPoints = 0;

  for (const question of response.form.questions) {
    const points = question.points || 0;

    if (question.type === "SINGLE_CHOICE" || question.type === "DROPDOWN") {
      totalPoints += points;
      const studentAnswer = response.answers.find((a) => a.questionId === question.id);
      const selectedId = studentAnswer?.selectedOptionIds?.[0];
      const correctOption = question.options.find((o) => o.isCorrect);
      if (selectedId && correctOption && selectedId === correctOption.id) {
        earnedPoints += points;
      }
    } else if (question.type === "MULTI_CHOICE") {
      totalPoints += points;
      const studentAnswer = response.answers.find((a) => a.questionId === question.id);
      const selectedIds = studentAnswer?.selectedOptionIds || [];
      const correctOptionIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);

      const isExactlyCorrect =
        selectedIds.length === correctOptionIds.length &&
        selectedIds.every((id) => correctOptionIds.includes(id));

      if (isExactlyCorrect) {
        earnedPoints += points;
      }
    } else if (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") {
      totalPoints += points;

      const manualScore = manualScores[question.id] || 0;
      earnedPoints += Math.min(manualScore, points);
    }
  }

  const finalScorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  await prisma.$transaction(async (tx) => {

    await tx.formResponse.update({
      where: { id: responseId },
      data: {
        score: finalScorePercentage,
        isGraded: true,
      },
    });

    if (response.resultId) {
      await tx.result.update({
        where: { id: response.resultId },
        data: {
          score: finalScorePercentage,
        },
      });
    }
  });

  revalidatePath(`/list/forms/attempt/${response.formId}`);
  revalidatePath("/list/results");
  return { success: true, score: finalScorePercentage };
}
