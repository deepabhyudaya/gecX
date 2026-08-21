import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormAttemptWorkspace from "@/components/form-builder/FormAttemptWorkspace";

export default async function FormAttemptPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const { userId } = auth();
  if (!userId) return redirect("/sign-in");

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!form) return notFound();

  if (form.type !== "GENERAL" || !form.allowMultiple) {
    const existingResponse = await prisma.formResponse.findFirst({
      where: { formId: id, submittedById: userId },
    });
    if (existingResponse) {
      return (
        <div className="flex items-center justify-center p-12 text-center">
          <div className="bg-card border border-border p-6 rounded-xl space-y-3 shadow-sm max-w-md">
            <h2 className="text-lg font-bold text-foreground">Already Attempted</h2>
            <p className="text-xs text-muted-foreground">
              You have already submitted answers for this form. Multiple attempts are not enabled.
            </p>
          </div>
        </div>
      );
    }
  }

  if (form.type === "EXAM" || form.type === "ASSIGNMENT") {
    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { classId: true },
    });
    if (!student) {
      return <div>Access Denied: Only enrolled students can submit answers.</div>;
    }

    let isLinked = false;
    if (form.type === "EXAM" && form.examId) {
      const exam = await prisma.exam.findUnique({
        where: { id: form.examId },
        select: { lesson: { select: { classId: true } } },
      });
      if (exam && exam.lesson.classId === student.classId) {
        isLinked = true;
      }
    } else if (form.type === "ASSIGNMENT" && form.assignmentId) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: form.assignmentId },
        select: { lesson: { select: { classId: true } } },
      });
      if (assignment && assignment.lesson.classId === student.classId) {
        isLinked = true;
      }
    }

    if (!isLinked) {
      return <div>Access Denied: This exam/assignment is not scheduled for your class.</div>;
    }
  }

  return (
    <div className="p-6">
      <FormAttemptWorkspace form={form} />
    </div>
  );
}
