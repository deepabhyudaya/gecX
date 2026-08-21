import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Edit2, Eye, Play, Trash2, Calendar, FileText, Lock, Globe } from "lucide-react";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Prisma } from "@prisma/client";

import Pagination from "@/components/Pagination";
import { CreateFormDialog } from "@/components/form-builder/CreateFormDialog";
import { deleteForm } from "@/actions/form.actions";
import { Button } from "@/components/ui/button";

interface FormItem {
  id: string;
  title: string;
  type: "GENERAL" | "EXAM" | "ASSIGNMENT";
  status: "DRAFT" | "PUBLISHED";
  createdAt: Date;
  responsesCount: number;
  dueDate: Date | null;
}

export default async function FormsListPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const { userId, sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  const currentUserId = userId;

  const { page } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.FormWhereInput = {};

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.createdById = currentUserId!;
      break;
    case "student":
      query.status = "PUBLISHED";
      query.OR = [
        { type: "GENERAL" },
        { exam: { lesson: { class: { students: { some: { id: currentUserId! } } } } } },
        { assignment: { lesson: { class: { students: { some: { id: currentUserId! } } } } } },
      ];
      break;
    case "parent":
      query.status = "PUBLISHED";
      query.OR = [
        { type: "GENERAL" },
        { exam: { lesson: { class: { students: { some: { parentId: currentUserId! } } } } } },
        { assignment: { lesson: { class: { students: { some: { parentId: currentUserId! } } } } } },
      ];
      break;
  }

  const [dataRes, totalCount] = await prisma.$transaction([
    prisma.form.findMany({
      where: query,
      include: {
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.form.count({ where: query }),
  ]);

  let exams: Array<{ id: number; title: string }> = [];
  let assignments: Array<{ id: number; title: string }> = [];

  if (role === "admin" || role === "teacher") {
    exams = await prisma.exam.findMany({
      where: {
        ...(role === "teacher" ? { lesson: { teacherId: currentUserId! } } : {}),
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 100,
    });

    assignments = await prisma.assignment.findMany({
      where: {
        ...(role === "teacher" ? { lesson: { teacherId: currentUserId! } } : {}),
      },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 100,
    });
  }

  const isTeacherOrAdmin = role === "admin" || role === "teacher";

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <div className="bg-card text-card-foreground p-6 rounded-xl border border-border flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dynamic Forms Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTeacherOrAdmin
              ? "Build general surveys, feedback forms, and scheduled exams or assignments."
              : "Access and attempt general surveys, academic assignments, or exams."}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <CreateFormDialog exams={exams} assignments={assignments} />
        )}
      </div>

      <div className="bg-card text-card-foreground rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/15 text-muted-foreground font-semibold">
                <th className="p-4">Title</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">Submissions</th>
                <th className="p-4">Deadline</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dataRes.map((form) => {
                const responseCount = form._count.responses;
                return (
                  <tr key={form.id} className="border-b border-border/40 hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-bold text-foreground">{form.title}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground">
                        {form.type === "GENERAL" ? (
                          <>
                            <Globe size={11} className="text-blue-500" />
                            General Form
                          </>
                        ) : (
                          <>
                            <FileText size={11} className="text-purple-500" />
                            {form.type} Form
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                        form.status === "PUBLISHED"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}>
                        {form.status}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-muted-foreground">{responseCount} Submissions</td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {form.dueDate ? new Date(form.dueDate).toLocaleString() : "No deadline"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {role === "student" && form.status === "PUBLISHED" && (
                          <Link href={`/list/forms/attempt/${form.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-primary/20 bg-primary/10 hover:bg-primary text-foreground hover:text-primary-foreground flex items-center gap-1">
                              <Play size={12} className="fill-current" />
                              Attempt
                            </Button>
                          </Link>
                        )}

                        {isTeacherOrAdmin && (
                          <>
                            <Link href={`/list/forms/builder/${form.id}`}>
                              <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-border bg-muted/20 hover:bg-muted text-foreground flex items-center gap-1">
                                <Edit2 size={12} />
                                Build
                              </Button>
                            </Link>
                            <Link href={`/list/forms/analytics/${form.id}`}>
                              <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-border bg-muted/20 hover:bg-muted text-foreground flex items-center gap-1">
                                <Eye size={12} />
                                Responses
                              </Button>
                            </Link>
                            <form action={async (fd) => {
                              "use server";
                              await deleteForm(form.id);
                            }}>
                              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 size={13} />
                              </Button>
                            </form>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {dataRes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    No active forms found matching your permissions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={p} count={totalCount} />
      </div>
    </div>
  );
}
