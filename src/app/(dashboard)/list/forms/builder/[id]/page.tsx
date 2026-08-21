import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import FormBuilderWorkspace from "@/components/form-builder/FormBuilderWorkspace";
import { AiStubCard } from "@/components/AiStubCard";

export default async function FormBuilderPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const { userId, sessionClaims } = auth();
  if (!userId) return redirect("/sign-in");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin" && role !== "teacher") {
    return <div>Access Denied: Only teachers and administrators can access the form builder.</div>;
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
    },
  });

  if (!form) return notFound();

  if (role === "teacher" && form.createdById !== userId) {
    return <div>Access Denied: You do not own this form.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <AiStubCard
        title="AI Question Generator"
        description="Describe a topic and let Gemini generate a draft question with options for your form."
        feature="question-generator"
      />
      <FormBuilderWorkspace form={form} />
    </div>
  );
}
