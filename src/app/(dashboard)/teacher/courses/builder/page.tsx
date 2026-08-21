import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import {
  DeleteCourseBtn,
  EditCourseForm,
  AdminDeleteCourseBtn,
  AdminExpireCourseBtn,
  UnexpireCourseBtn,
  AddCourseForm,
  AddSectionForm,
} from "@/components/BuilderClient";
import { createCourse, createSection } from "@/lib/courseActions";
import { DraggableSectionList } from "@/components/DraggableSectionList";
import { BuilderResizableLayout } from "@/components/BuilderResizableLayout";
import { BookOpen, Layers, Play, FileEdit } from "lucide-react";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "APPROVED"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : status === "REJECTED"
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

export default async function TeacherCourseBuilderPage() {
  await markNotificationsByTypesAsRead([
    "COURSE_SUBMITTED",
    "COURSE_APPROVED",
    "COURSE_REJECTED",
    "COURSE_EXPIRED",
    "COURSE_UPDATED",
    "COURSE_DELETED",
  ]);
  const { userId, sessionClaims } = auth();
  if (!userId) return null;
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const cookieStore = cookies();
  const builderLayout = cookieStore.get("react-resizable-panels:builder-layout");
  let defaultBuilderLayout = undefined;
  if (builderLayout) {
    try {
      defaultBuilderLayout = JSON.parse(builderLayout.value);
    } catch (e) { }
  }

  const courses = await prisma.course.findMany({
    where: { teacherId: userId },
    include: {
      sections: {
        include: { lectures: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const allAdminCourses = role === "admin"
    ? await prisma.course.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      include: { sections: true },
      orderBy: { createdAt: "desc" },
    })
    : [];

  const draftCourses = courses.filter((c) => c.status === "PENDING");

  const totalSections = courses.reduce((a, c) => a + c.sections.length, 0);
  const totalLectures = courses.reduce(
    (a, c) => a + c.sections.reduce((b, s) => b + s.lectures.length, 0),
    0
  );

  return (
    <div className="p-6 bg-background">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">

        <div className="flex items-center justify-between bg-card border border-border p-6 rounded-[12px] shadow-sm flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">Course Builder</h1>
            <p className="text-[14px] text-muted-foreground mt-1">Create, edit, and manage your curriculum.</p>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-[13px]">
            <span className="flex items-center gap-1.5"><BookOpen size={15} /> {courses.length} courses</span>
            <span className="flex items-center gap-1.5"><Layers size={15} /> {totalSections} sections</span>
            <span className="flex items-center gap-1.5"><Play size={15} /> {totalLectures} lectures</span>
          </div>
        </div>

        <BuilderResizableLayout
          defaultLayout={defaultBuilderLayout}
          left={
            <div className="flex flex-col gap-5">

              <AddCourseForm />

              {draftCourses.length > 0 && (
                <div className="bg-card border border-border rounded-[12px] p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileEdit size={15} className="text-yellow-500" />
                    <h2 className="text-[14px] font-bold text-foreground">Drafts</h2>
                    <span className="ml-auto text-[11px] text-muted-foreground">{draftCourses.length} pending</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {draftCourses.map((c) => (
                      <a
                        key={c.id}
                        href={`#course-${c.id}`}
                        className="flex items-start gap-2 p-2.5 rounded-[8px] hover:bg-muted/50 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {c.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {c.sections.length} section{c.sections.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {role === "admin" && allAdminCourses.length > 0 && (
                <div className="bg-card border border-destructive/30 rounded-[12px] p-5 shadow-sm">
                  <h2 className="text-[14px] font-bold text-destructive mb-1">Admin Controls</h2>
                  <p className="text-[11px] text-muted-foreground mb-3">Force-delete approved or rejected courses.</p>
                  <div className="flex flex-col gap-2">
                    {allAdminCourses.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 p-2 rounded-[8px] bg-muted/30">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium text-foreground truncate">{c.title}</p>
                          <StatusBadge status={c.status} />
                        </div>
                        <div className="flex items-center gap-2">
                          {c.status !== "EXPIRED" ? (
                            <AdminExpireCourseBtn courseId={c.id} />
                          ) : (
                            <UnexpireCourseBtn courseId={c.id} />
                          )}
                          <AdminDeleteCourseBtn courseId={c.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          }
          right={
            <div className="flex flex-col gap-5">
              {courses.length === 0 && (
                <div className="text-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-[12px]">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-[15px]">No courses yet. Create your first course!</p>
                </div>
              )}

              {courses.map((course) => (
                <div
                  key={course.id}
                  id={`course-${course.id}`}
                  className="bg-card border border-border rounded-[12px] shadow-sm overflow-hidden scroll-mt-6"
                >
                  <div className="flex items-start justify-between p-5 border-b border-border">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[18px] font-bold text-foreground truncate">{course.title}</h3>
                        <StatusBadge status={course.status} />
                      </div>
                      <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {course.sections.length} section{course.sections.length !== 1 ? "s" : ""}{" "}
                         {course.sections.reduce((a, s) => a + s.lectures.length, 0)} lectures
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {course.status === "EXPIRED" && <UnexpireCourseBtn courseId={course.id} />}
                      <EditCourseForm courseId={course.id} currentTitle={course.title} currentDesc={course.description} currentSlug={course.slug} />
                      <DeleteCourseBtn courseId={course.id} />
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-4">
                    <DraggableSectionList
                      courseId={course.id}
                      sections={course.sections}
                    />

                    <AddSectionForm courseId={course.id} nextOrder={course.sections.length + 1} />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}
