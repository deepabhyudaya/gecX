import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, BookOpen, ChevronRight } from "lucide-react";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

export default async function TeacherEnrollmentsPage() {
  await markNotificationsByTypesAsRead(["COURSE_ENROLLMENT"]);
  const { userId } = auth();
  if (!userId) return redirect("/sign-in");

  const courses = await prisma.course.findMany({
    where: { teacherId: userId },
    include: {
      sections: {
        include: { lectures: true },
      },
      enrollments: {
        include: {
          student: {
            select: { id: true, name: true, surname: true, email: true, img: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const courseData = await Promise.all(
    courses.map(async (course) => {
      const totalLectures = course.sections.reduce((a, s) => a + s.lectures.length, 0);
      const lectureIds = course.sections.flatMap((s) => s.lectures.map((l) => l.id));

      const studentsWithProgress = await Promise.all(
        course.enrollments.map(async ({ student, enrolledAt }) => {
          const done = await prisma.courseProgress.count({
            where: {
              studentId: student.id,
              lectureId: { in: lectureIds },
              completed: true,
            },
          });
          const pct = totalLectures > 0 ? Math.round((done / totalLectures) * 100) : 0;
          return { student, enrolledAt, done, total: totalLectures, pct };
        })
      );

      return { course, totalLectures, studentsWithProgress };
    })
  );

  return (
    <div className="p-6 min-h-full bg-background">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="bg-card border border-border p-6 rounded-[12px] shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[26px] font-bold text-foreground tracking-tight">Course Enrollments</h1>
            <p className="text-[14px] text-muted-foreground mt-1">
              Student enrollment and progress for your courses.
            </p>
          </div>
          <Link href="/teacher/courses/builder">
            <button className="px-4 py-2 rounded-[8px] border border-border text-[13px] font-semibold hover:bg-muted transition-all">
              Course Builder
            </button>
          </Link>
        </div>

        {courseData.length === 0 && (
          <div className="text-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-[12px]">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p>You haven&apos;t created any courses yet.</p>
          </div>
        )}

        {courseData.map(({ course, totalLectures, studentsWithProgress }) => (
          <div key={course.id} className="bg-card border border-border rounded-[12px] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-[16px] font-bold text-foreground">{course.title}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {totalLectures} lectures  {studentsWithProgress.length} enrolled student{studentsWithProgress.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[12px] text-muted-foreground">Avg. progress</p>
                  <p className="text-[18px] font-bold text-foreground">
                    {studentsWithProgress.length > 0
                      ? Math.round(studentsWithProgress.reduce((a, s) => a + s.pct, 0) / studentsWithProgress.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            {studentsWithProgress.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-muted-foreground">
                No students enrolled yet.
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Student</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide hidden sm:table-cell">Email</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Progress</th>
                    <th className="px-4 py-2.5 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide text-right">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {studentsWithProgress.map(({ student, done, total, pct }) => (
                    <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {student.img ? (
                            <img src={student.img} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                              {student.name[0]}{student.surname[0]}
                            </div>
                          )}
                          <span className="font-medium text-foreground">{student.name} {student.surname}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{student.email ?? " "}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-foreground w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        <span className={`font-semibold ${pct === 100 ? "text-green-500" : "text-foreground"}`}>
                          {done}/{total}
                        </span>
                        {pct === 100 && <span className="ml-1">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
