import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormAnalyticsWorkspace from "@/components/form-builder/FormAnalyticsWorkspace";

export default async function FormAnalyticsPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const { userId, sessionClaims } = auth();
  if (!userId) return redirect("/sign-in");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin" && role !== "teacher") {
    return <div>Access Denied: Only teachers and administrators can view response analytics.</div>;
  }

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
      responses: {
        orderBy: { submittedAt: "desc" },
        include: {
          student: {
            select: {
              name: true,
              surname: true,
            },
          },
          answers: true,
        },
      },
    },
  });

  if (!form) return notFound();

  if (role === "teacher" && form.createdById !== userId) {
    return <div>Access Denied: You do not own this form.</div>;
  }

  return (
    <div className="p-6">
      <FormAnalyticsWorkspace form={form} />
    </div>
  );
}
