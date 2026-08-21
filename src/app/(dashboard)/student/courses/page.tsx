import prisma from "@/lib/prisma";
import { BookOpen, Layers, Play, User, Users } from "lucide-react";
import Link from "next/link";
import { EnrollButton } from "@/components/EnrollButton";
import { auth } from "@clerk/nextjs/server";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

export default async function StudentCoursesPage() {
  await markNotificationsByTypesAsRead([
    "COURSE_SUBMITTED",
    "COURSE_APPROVED",
    "COURSE_REJECTED",
    "COURSE_EXPIRED",
    "COURSE_UPDATED",
    "COURSE_DELETED",
  ]);
  const { userId } = auth();
  if (!userId) return null;

  const [courses, myEnrollments] = await Promise.all([
    prisma.course.findMany({
      where: { status: { in: ["APPROVED", "EXPIRED"] } },
      include: {
        teacher: true,
        sections: {
          include: { lectures: true },
        },
        _count: {
          select: { enrollments: true }
        }
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      select: { courseId: true },
    }),
  ]);

  const enrolledIds = new Set(myEnrollments.map((e) => e.courseId));

  return (
    <div className="p-6 min-h-full bg-background">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="bg-card border border-border p-6 rounded-[12px] shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">Course Catalog</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              Browse and enroll in available courses.
            </p>
          </div>
          <Link href="/student/courses/my">
            <button className="px-4 py-2 rounded-[8px] border border-border text-foreground text-[13px] font-semibold hover:bg-muted transition-all">
              My Courses
            </button>
          </Link>
        </div>

        {courses.length === 0 && (
          <div className="text-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-[12px]">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[15px]">No approved courses available yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            const totalLectures = course.sections.reduce((a, s) => a + s.lectures.length, 0);

            return (
              <div
                key={course.id}
                className={`bg-card border border-border rounded-[12px] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all ${course.status === "EXPIRED" ? "opacity-60 grayscale-[0.1]" : ""
                  }`}
              >
                <div className="h-2 bg-primary/20" />

                <div className="p-5 flex flex-col flex-1 gap-4">
                  <Link href={`/student/courses/${course.slug || course.id}`} className="group/title">
                    <h3 className="text-[16px] font-bold text-foreground leading-snug group-hover/title:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2">{course.description}</p>
                  </Link>

                  <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1"><User size={12} /> {course.teacher.name} {course.teacher.surname}</span>
                    <span className="flex items-center gap-1"><Layers size={12} /> {course.sections.length} sections</span>
                    <span className="flex items-center gap-1"><Play size={12} /> {totalLectures} lectures</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {course._count.enrollments} students</span>
                  </div>

                  <div className="mt-auto">
                    {isEnrolled ? (
                      <Link href={`/student/courses/${course.slug || course.id}`}>
                        <button className="w-full bg-muted text-foreground border border-border py-2.5 px-4 rounded-[8px] text-[13px] font-bold hover:bg-muted/80 transition-all">
                          Continue Learning
                        </button>
                      </Link>
                    ) : course.status === "EXPIRED" ? (
                      <button
                        disabled
                        className="w-full bg-muted/50 text-muted-foreground border border-border py-2.5 px-4 rounded-[8px] text-[13px] font-bold cursor-not-allowed"
                      >
                        Expired
                      </button>
                    ) : (
                      <EnrollButton courseId={course.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
