import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { BookOpen, Layers, Play, User, Calendar, ExternalLink } from "lucide-react";
import ApprovalButtons from "@/components/ApprovalButtons";
import moment from "moment";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "APPROVED"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : status === "REJECTED"
        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

export default async function CourseDetailPage({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const isNumeric = /^\d+$/.test(slug);
  const course = await prisma.course.findFirst({
    where: isNumeric ? { id: parseInt(slug) } : { slug },
    include: {
      teacher: true,
      sections: {
        include: { lectures: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!course) return notFound();

  const totalLectures = course.sections.reduce((a, s) => a + s.lectures.length, 0);

  return (
    <div className="p-6 min-h-full bg-background">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <Link
          href={role === "admin" ? "/list/approvals" : "/list/courses"}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </Link>

        <div className="bg-card border border-border rounded-[12px] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">{course.title}</h1>
              {course.slug && (
                <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">/{course.slug}</p>
              )}
              <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">{course.description}</p>

              <div className="flex flex-wrap gap-4 mt-4 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User size={14} />
                  {course.teacher.name} {course.teacher.surname}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  {moment(course.createdAt).format("MMM D, YYYY")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers size={14} />
                  {course.sections.length} sections
                </span>
                <span className="flex items-center gap-1.5">
                  <Play size={14} />
                  {totalLectures} lectures
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <StatusBadge status={course.status} />
              {role === "admin" && course.status === "PENDING" && (
                <div className="flex gap-2">
                  <ApprovalButtons id={course.id} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[12px] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="text-[18px] font-bold text-foreground flex items-center gap-2">
              <BookOpen size={18} />
              Course Curriculum
            </h2>
          </div>

          {course.sections.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-[14px]">
              No sections have been added to this course yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {course.sections.map((sec, sIdx) => (
                <div key={sec.id}>
                  <div className="flex items-center gap-3 px-5 py-3 bg-muted/30">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                      {sIdx + 1}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{sec.title}</p>
                      <p className="text-[12px] text-muted-foreground">{sec.lectures.length} lecture{sec.lectures.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-border/40">
                    {sec.lectures.map((lec) => (
                      <div key={lec.id} className="flex items-center gap-3 px-5 py-3 pl-14 hover:bg-muted/20 transition-colors group">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <a
                            href={lec.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Watch on YouTube"
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-colors shrink-0"
                          >
                            <Play size={12} className="fill-current" />
                          </a>
                          <span className="text-[13px] text-foreground truncate">{lec.title}</span>
                        </div>
                        <a
                          href={lec.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground truncate max-w-[200px] hidden sm:flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={10} />
                          YouTube
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {role === "admin" && course.status === "PENDING" && (
          <div className="bg-card border border-border rounded-[12px] p-4 flex items-center justify-between">
            <p className="text-[14px] text-muted-foreground">Ready to make a decision on this course?</p>
            <div className="flex gap-3">
              <ApprovalButtons id={course.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
