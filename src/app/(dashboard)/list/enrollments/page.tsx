import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import moment from "moment";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

export default async function AdminEnrollmentsPage() {
  await markNotificationsByTypesAsRead(["COURSE_ENROLLMENT"]);
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin") return redirect("/");

  const courses = await prisma.course.findMany({
    include: {
      teacher: { select: { name: true, surname: true } },
      sections: { include: { lectures: { select: { id: true } } } },
      enrollments: {
        include: {
          student: { select: { id: true, name: true, surname: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const courseRows = await Promise.all(
    courses.map(async (course) => {
      const lectureIds = course.sections.flatMap((s) => s.lectures.map((l) => l.id));
      const totalLectures = lectureIds.length;
      const enrolled = course.enrollments.length;

      let totalCompleted = 0;
      if (enrolled > 0 && totalLectures > 0) {
        totalCompleted = await prisma.courseProgress.count({
          where: {
            lectureId: { in: lectureIds },
            completed: true,
            studentId: { in: course.enrollments.map((e) => e.student.id) },
          },
        });
      }
      const maxPossible = enrolled * totalLectures;
      const avgPct = maxPossible > 0 ? Math.round((totalCompleted / maxPossible) * 100) : 0;

      return { course, totalLectures, enrolled, avgPct };
    })
  );

  const totalEnrollments = courseRows.reduce((a, r) => a + r.enrolled, 0);
  const totalCourses = courseRows.length;

  return (
    <div className="p-6 min-h-full bg-background">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="bg-card border border-border p-6 rounded-[12px] shadow-sm">
          <h1 className="text-[26px] font-bold text-foreground tracking-tight">Enrollments Overview</h1>
          <p className="text-[14px] text-muted-foreground mt-1">All course enrollments and student progress across the platform.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
            {[
              { label: "Total Courses", value: totalCourses },
              { label: "Total Enrollments", value: totalEnrollments },
              { label: "Approved Courses", value: courseRows.filter(r => r.course.status === "APPROVED").length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/30 border border-border rounded-[10px] p-4">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[28px] font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[12px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-[16px] font-bold text-foreground">By Course</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Course</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide hidden md:table-cell">Teacher</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide text-center">Enrolled</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide">Avg Progress</th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wide hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courseRows.map(({ course, totalLectures, enrolled, avgPct }) => {
                  const statusCls =
                    course.status === "APPROVED" ? "text-green-500" :
                      course.status === "REJECTED" ? "text-red-500" : "text-yellow-500";
                  return (
                    <tr key={course.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/list/courses/${course.slug || course.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                          {course.title}
                        </Link>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{totalLectures} lectures</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {course.teacher.name} {course.teacher.surname}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-[11px] uppercase tracking-wide ${statusCls}`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1.5 text-foreground font-semibold">
                          <Users size={13} />
                          {enrolled}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {enrolled > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className={`h-full rounded-full ${avgPct === 100 ? "bg-green-500" : "bg-primary"}`}
                                style={{ width: `${avgPct}%` }}
                              />
                            </div>
                            <span className="text-[12px] font-semibold text-foreground">{avgPct}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[12px]"> </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {moment(course.createdAt).format("MMM D, YYYY")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
