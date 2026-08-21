import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BookOpen, Layers, Play } from "lucide-react";
import Link from "next/link";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

export default async function MyCoursesPage() {
  await markNotificationsByTypesAsRead([
    "COURSE_SUBMITTED",
    "COURSE_APPROVED",
    "COURSE_REJECTED",
    "COURSE_EXPIRED",
    "COURSE_UPDATED",
    "COURSE_DELETED",
  ]);
  const { userId } = auth();
  if (!userId) return redirect("/sign-in");

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    include: {
      course: {
        include: {
          teacher: true,
          sections: {
            include: { lectures: true },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <div className="p-6 min-h-full bg-background">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="bg-card border border-border p-6 rounded-[12px] shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-foreground tracking-tight">My Courses</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              Your enrolled courses. Pick up where you left off.
            </p>
          </div>
          <Link href="/student/courses">
            <button className="px-4 py-2 rounded-[8px] border border-border text-foreground text-[13px] font-semibold hover:bg-muted transition-all">
              Browse Catalog
            </button>
          </Link>
        </div>

        {enrollments.length === 0 && (
          <div className="text-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-[12px] flex flex-col items-center gap-4">
            <BookOpen size={40} className="opacity-30" />
            <p className="text-[15px]">You haven&apos;t enrolled in any courses yet.</p>
            <Link href="/student/courses">
              <button className="px-5 py-2.5 rounded-[8px] bg-primary text-primary-foreground text-[13px] font-bold hover:opacity-90 transition-all">
                Browse Course Catalog
              </button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {enrollments.map(({ course, enrolledAt }) => {
            const totalLectures = course.sections.reduce((a, s) => a + s.lectures.length, 0);
            const courseLink = `/student/courses/${course.slug || course.id}`;

            return (
              <Link key={course.id} href={courseLink} className="group">
                <div className="bg-card border border-border rounded-[12px] shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-primary/40 transition-all">
                  <div className="h-2 bg-primary/30 group-hover:bg-primary transition-colors" />
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div>
                      <h3 className="text-[16px] font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        by {course.teacher.name} {course.teacher.surname}
                      </p>
                    </div>
                    <p className="text-[13px] text-muted-foreground line-clamp-2">{course.description}</p>
                    <div className="flex gap-3 text-[12px] text-muted-foreground mt-auto pt-2 border-t border-border/40">
                      <span className="flex items-center gap-1"><Layers size={12} /> {course.sections.length} sections</span>
                      <span className="flex items-center gap-1"><Play size={12} /> {totalLectures} lectures</span>
                    </div>
                  </div>
                  <div className="px-5 pb-4">
                    <div className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-[8px] text-[13px] font-bold text-center group-hover:opacity-90 transition-all">
                      Continue Learning
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
