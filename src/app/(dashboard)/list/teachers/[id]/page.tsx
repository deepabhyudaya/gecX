import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import Performance from "@/components/Performance";
import ShareProfileButton from "@/components/ShareProfileButton";
import { CometCard } from "@/components/ui/comet-card";
import { DashboardPageLayout } from "@/components/dashboard-page-layout";
import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Teacher } from "@prisma/client";
import {
  Droplet,
  Calendar,
  Mail,
  Phone,
  BookOpen,
  LayoutGrid,
  GraduationCap,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const SingleTeacherPage = async ({
  params: { id },
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId } = auth();
  const user = await currentUser();
  const role = (user?.publicMetadata?.role as string) ?? "";
  const accessCode = searchParams.accessCode;

  const teacher:
    | (Teacher & {
      _count: { subjects: number; lessons: number; classes: number };
    })
    | null = await prisma.teacher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subjects: true,
            lessons: true,
            classes: true,
          },
        },
      },
    });

  if (!teacher) {
    return notFound();
  }

  const [totalAttendance, presentAttendance] = await prisma.$transaction([
    prisma.attendance.count({
      where: { lesson: { teacherId: id } },
    }),
    prisma.attendance.count({
      where: { lesson: { teacherId: id }, present: true },
    }),
  ]);

  const attendancePct =
    totalAttendance > 0
      ? Math.round((presentAttendance / totalAttendance) * 100)
      : null;

  const teacherResults = await prisma.result.aggregate({
    _avg: { score: true },
    where: {
      OR: [
        { exam: { lesson: { teacherId: id } } },
        { assignment: { lesson: { teacherId: id } } }
      ]
    }
  });
  const averageScore = teacherResults._avg.score || 0;

  let hasAccess = false;
  if (role === "admin" || userId === teacher.id) {
    hasAccess = true;
  } else if (accessCode) {
    const validAccess = await prisma.profileAccess.findFirst({
      where: {
        userId: teacher.id,
        userType: "teacher",
        code: accessCode,
        expiresAt: { gt: new Date() },
      },
    });
    if (validAccess) hasAccess = true;
  }

  let recentAttendance: any[] = [];
  let recentAssignments: any[] = [];
  let recentExams: any[] = [];

  if (hasAccess) {
    recentAttendance = await prisma.attendance.findMany({
      where: { lesson: { teacherId: id } },
      include: {
        student: { select: { name: true, surname: true } },
        lesson: { select: { name: true, subject: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
      take: 5,
    });

    recentAssignments = await prisma.assignment.findMany({
      where: { lesson: { teacherId: id } },
      include: { lesson: { include: { subject: true, class: true } } },
      orderBy: { dueDate: "desc" },
      take: 5,
    });

    recentExams = await prisma.exam.findMany({
      where: { lesson: { teacherId: id } },
      include: { lesson: { include: { subject: true, class: true } } },
      orderBy: { startTime: "desc" },
      take: 5,
    });
  }

  const statCards = [
    {
      icon: UserCheck,
      label: "Lesson Attendance",
      value: attendancePct !== null ? `${attendancePct}%` : "–",
    },
    { icon: BookOpen, label: "Subjects", value: teacher._count.subjects },
    { icon: GraduationCap, label: "Lessons", value: teacher._count.lessons },
    { icon: LayoutGrid, label: "Branches", value: teacher._count.classes },
  ];

  return (
    <DashboardPageLayout
      layoutKey="teacher-profile-layout"
      leftContent={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <CometCard className="flex-1" rotateDepth={8} translateDepth={10}>
              <div className="bg-card border border-border rounded-2xl flex gap-5 p-6 h-full">
                <div className="shrink-0">
                  <Image
                    src={teacher.img || "/noAvatar.png"}
                    alt={teacher.name}
                    width={144}
                    height={144}
                    className="w-24 h-24 rounded-full object-cover ring-2 ring-border"
                  />
                </div>
                <div className="flex flex-col justify-between gap-3 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <h1 className="text-xl font-semibold truncate">
                        {teacher.name} {teacher.surname}
                      </h1>
                      {role === "admin" && (
                        <div className="shrink-0">
                          <FormContainer table="teacher" type="update" data={teacher} />
                        </div>
                      )}
                    </div>
                    {(role === "admin" || userId === teacher.id) && (
                      <div className="shrink-0">
                        <ShareProfileButton userId={teacher.id} userType="teacher" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{teacher.username}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Droplet size={13} className="text-muted-foreground" />
                      {teacher.bloodType}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted-foreground" />
                      {new Intl.DateTimeFormat("en-GB").format(teacher.birthday)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-muted-foreground" />
                      {teacher.email || " "}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-muted-foreground" />
                      {teacher.phone || " "}
                    </span>
                  </div>
                </div>
              </div>
            </CometCard>

            <div className="flex-1 grid grid-cols-2 gap-3">
              {statCards.map(({ icon: Icon, label, value }) => (
                <CometCard key={label} rotateDepth={10} translateDepth={8}>
                  <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 h-full">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-bold leading-none">{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  </div>
                </CometCard>
              ))}
            </div>
          </div>

          {((teacher as any).employeeId || (teacher as any).designation || (teacher as any).department || (teacher as any).qualification || (teacher as any).experienceYears != null || (teacher as any).joiningDate) && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold mb-3 text-sm">Faculty Identity</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {(teacher as any).employeeId && (
                  <div>
                    <p className="text-muted-foreground">Employee ID</p>
                    <p className="font-semibold text-sm">{(teacher as any).employeeId}</p>
                  </div>
                )}
                {(teacher as any).designation && (
                  <div>
                    <p className="text-muted-foreground">Designation</p>
                    <p className="font-semibold text-sm">{(teacher as any).designation}</p>
                  </div>
                )}
                {(teacher as any).department && (
                  <div>
                    <p className="text-muted-foreground">Department</p>
                    <p className="font-semibold text-sm">{(teacher as any).department}</p>
                  </div>
                )}
                {(teacher as any).qualification && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-muted-foreground">Qualification</p>
                    <p className="font-semibold text-sm">{(teacher as any).qualification}</p>
                  </div>
                )}
                {(teacher as any).experienceYears != null && (
                  <div>
                    <p className="text-muted-foreground">Experience</p>
                    <p className="font-semibold text-sm">{(teacher as any).experienceYears} years</p>
                  </div>
                )}
                {(teacher as any).joiningDate && (
                  <div>
                    <p className="text-muted-foreground">Joining Date</p>
                    <p className="font-semibold text-sm">
                      {new Intl.DateTimeFormat("en-GB").format(new Date((teacher as any).joiningDate))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4 h-[800px]">
            <h2 className="font-semibold mb-3">Teacher&apos;s Schedule</h2>
            <BigCalendarContainer type="teacherId" id={teacher.id} />
          </div>
        </div>
      }
      rightContent={
        <div className="flex flex-col gap-4">
          {hasAccess ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">Performance History</h2>
              <Performance score={averageScore} label="Overall Score" subtitle="Student Average" />

              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm">Student Attendance</h2>
                  <span className="text-xs text-muted-foreground">
                    {attendancePct !== null ? `${attendancePct}% present` : "No data"}
                  </span>
                </div>
                {recentAttendance.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No attendance records yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentAttendance.map((rec) => (
                      <div key={rec.id} className="flex items-center justify-between text-sm border-b border-border pb-1">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {rec.student.name} {rec.student.surname}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {rec.lesson.subject.name}  {new Intl.DateTimeFormat("en-GB").format(rec.date)}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rec.present
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                        >
                          {rec.present ? "Present" : "Absent"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <a
                  href={`/list/attendance?search=`}
                  className="mt-3 block text-[11px] font-medium text-foreground hover:underline transition-all text-center"
                >
                  View all attendance records
                </a>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-sm">Recent Assignments Set</h3>
                {recentAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent assignments.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {recentAssignments.map(ass => (
                      <li key={ass.id} className="flex justify-between items-center text-sm border-b border-border pb-1">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-xs truncate max-w-[150px]">{ass.title}</span>
                          <span className="text-[10px] text-muted-foreground">{ass.lesson.class.name}  {ass.lesson.subject.name}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          Due: {new Intl.DateTimeFormat("en-GB").format(ass.dueDate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-sm">Recent Exams Set</h3>
                {recentExams.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent exams.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {recentExams.map(exam => (
                      <li key={exam.id} className="flex justify-between items-center text-sm border-b border-border pb-1">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-xs truncate max-w-[150px]">{exam.title}</span>
                          <span className="text-[10px] text-muted-foreground">{exam.lesson.class.name}  {exam.lesson.subject.name}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Intl.DateTimeFormat("en-GB").format(exam.startTime)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 text-center shadow-sm">
              <h3 className="font-bold text-foreground mb-2">Performance History Hidden</h3>
              <p className="text-sm text-muted-foreground">
                You need a valid access code to view the detailed performance history of this teacher.
              </p>
            </div>
          )}
          <EventCalendarContainer searchParams={searchParams} />
          <AnnouncementsNotificationList />
        </div>
      }
    />
  );
};

export default SingleTeacherPage;
