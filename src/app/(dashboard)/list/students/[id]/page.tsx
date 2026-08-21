import AnnouncementsNotificationList from "@/components/AnnouncementsNotificationList";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import Performance from "@/components/Performance";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import ShareProfileButton from "@/components/ShareProfileButton";
import { CometCard } from "@/components/ui/comet-card";
import { DashboardPageLayout } from "@/components/dashboard-page-layout";
import prisma from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Class, Grade, Student } from "@prisma/client";
import {
  Droplet,
  Calendar,
  Mail,
  Phone,
  BookOpen,
  LayoutGrid,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const SingleStudentPage = async ({
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

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { include: { _count: { select: { lessons: true } } } },
      grade: true,
      results: true,
    },
  });

  if (!student) {
    return notFound();
  }

  const totalScore = student.results.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = student.results.length > 0 ? totalScore / student.results.length : 0;

  let hasAccess = false;
  if (role === "admin" || userId === student.id) {
    hasAccess = true;
  } else if (accessCode) {
    const validAccess = await prisma.profileAccess.findFirst({
      where: {
        userId: student.id,
        userType: "student",
        code: accessCode,
        expiresAt: { gt: new Date() },
      },
    });
    if (validAccess) hasAccess = true;
  }

  let recentAttendances: any[] = [];
  let recentAssignments: any[] = [];
  if (hasAccess) {
    recentAttendances = await prisma.attendance.findMany({
      where: { studentId: id },
      include: { lesson: { include: { subject: true } } },
      orderBy: { date: "desc" },
      take: 5,
    });

    recentAssignments = await prisma.assignment.findMany({
      where: { lesson: { classId: student.classId } },
      include: { lesson: { include: { subject: true } } },
      orderBy: { dueDate: "desc" },
      take: 5,
    });
  }

  return (
    <DashboardPageLayout
      layoutKey="student-profile-layout"
      leftContent={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <CometCard className="flex-1" rotateDepth={8} translateDepth={10}>
              <div className="bg-card border border-border rounded-2xl flex gap-5 p-6 h-full">
                <div className="shrink-0">
                  <Image
                    src={student.img || "/noAvatar.png"}
                    alt={student.name}
                    width={144}
                    height={144}
                    className="w-24 h-24 rounded-full object-cover ring-2 ring-border"
                  />
                </div>
                <div className="flex flex-col justify-between gap-3 min-w-0 w-full">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <h1 className="text-xl font-semibold truncate">
                        {student.name} {student.surname}
                      </h1>
                      {role === "admin" && (
                        <div className="shrink-0">
                          <FormContainer table="student" type="update" data={student} />
                        </div>
                      )}
                    </div>
                    {(role === "admin" || userId === student.id) && (
                      <div className="shrink-0">
                        <ShareProfileButton userId={student.id} userType="student" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{student.username}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Droplet size={13} className="text-muted-foreground" />
                      {student.bloodType}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-muted-foreground" />
                      {new Intl.DateTimeFormat("en-GB").format(student.birthday)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail size={13} className="text-muted-foreground" />
                      {student.email || " "}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-muted-foreground" />
                      {student.phone || " "}
                    </span>
                  </div>
                </div>
              </div>
            </CometCard>

            <div className="flex-1 grid grid-cols-2 gap-3">
              <CometCard rotateDepth={10} translateDepth={8}>
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 h-full">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <UserCheck size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <Suspense fallback={<p className="text-lg font-bold leading-none">…</p>}>
                      <StudentAttendanceCard id={student.id} />
                    </Suspense>
                    <p className="text-xs text-muted-foreground mt-0.5">Attendance</p>
                  </div>
                </div>
              </CometCard>

              <CometCard rotateDepth={10} translateDepth={8}>
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 h-full">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{student.grade.level}th</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Year</p>
                  </div>
                </div>
              </CometCard>

              <CometCard rotateDepth={10} translateDepth={8}>
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 h-full">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <LayoutGrid size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{student.class._count.lessons}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Lessons</p>
                  </div>
                </div>
              </CometCard>

              <CometCard rotateDepth={10} translateDepth={8}>
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 h-full">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold leading-none">{student.class.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Branch</p>
                  </div>
                </div>
              </CometCard>
            </div>
          </div>

          {(student.rollNumber || student.registrationNumber || student.admissionYear || student.currentSemester || student.program || (student as any).batch || (student as any).section || (student as any).hosteller != null || (student as any).guardianName || (student as any).governmentId) && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold mb-3 text-sm">Academic Identity</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {student.rollNumber && (
                  <div>
                    <p className="text-muted-foreground">Roll Number</p>
                    <p className="font-semibold text-sm">{student.rollNumber}</p>
                  </div>
                )}
                {student.registrationNumber && (
                  <div>
                    <p className="text-muted-foreground">Registration No.</p>
                    <p className="font-semibold text-sm">{student.registrationNumber}</p>
                  </div>
                )}
                {student.program && (
                  <div>
                    <p className="text-muted-foreground">Program</p>
                    <p className="font-semibold text-sm">{student.program}</p>
                  </div>
                )}
                {student.admissionYear && (
                  <div>
                    <p className="text-muted-foreground">Admission Year</p>
                    <p className="font-semibold text-sm">{student.admissionYear}</p>
                  </div>
                )}
                {student.currentSemester && (
                  <div>
                    <p className="text-muted-foreground">Current Semester</p>
                    <p className="font-semibold text-sm">{student.currentSemester}</p>
                  </div>
                )}
                {(student as any).batch && (
                  <div>
                    <p className="text-muted-foreground">Batch</p>
                    <p className="font-semibold text-sm">{(student as any).batch}</p>
                  </div>
                )}
                {(student as any).section && (
                  <div>
                    <p className="text-muted-foreground">Section</p>
                    <p className="font-semibold text-sm">{(student as any).section}</p>
                  </div>
                )}
                {(student as any).hosteller != null && (
                  <div>
                    <p className="text-muted-foreground">Residence</p>
                    <p className="font-semibold text-sm">{(student as any).hosteller ? "Hosteller" : "Day Scholar"}</p>
                  </div>
                )}
                {(student as any).governmentId && (
                  <div>
                    <p className="text-muted-foreground">Government ID</p>
                    <p className="font-semibold text-sm">{(student as any).governmentId}</p>
                  </div>
                )}
                {(student as any).guardianName && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-muted-foreground">Guardian</p>
                    <p className="font-semibold text-sm">
                      {(student as any).guardianName}
                      {(student as any).guardianRelation ? ` (${(student as any).guardianRelation})` : ""}
                      {(student as any).guardianPhone ? ` · ${(student as any).guardianPhone}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4 h-[800px]">
            <h2 className="font-semibold mb-3">Student&apos;s Schedule</h2>
            <BigCalendarContainer type="classId" id={student.class.id} />
          </div>
        </div>
      }
      rightContent={
        <div className="flex flex-col gap-4">
          {hasAccess ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-bold">Performance History</h2>
              <Performance score={averageScore} label="Overall Score" subtitle="Average Result" />

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-sm">Recent Results</h3>
                {student.results.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent results.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {student.results.slice(-5).map(res => (
                      <li key={res.id} className="flex justify-between items-center text-sm border-b border-border pb-1">
                        <span className="text-muted-foreground">Result #{res.id}</span>
                        <span className="font-medium text-foreground">{res.score}/100</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-sm">Recent Attendance</h3>
                {recentAttendances.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recent attendance records.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {recentAttendances.map(att => (
                      <li key={att.id} className="flex justify-between items-center text-sm border-b border-border pb-1">
                        <span className="text-muted-foreground text-[11px]">
                          {att.lesson.subject.name} - {new Intl.DateTimeFormat("en-GB").format(att.date)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${att.present ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                          {att.present ? "Present" : "Absent"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-sm">Upcoming Assignments</h3>
                {recentAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No upcoming assignments.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {recentAssignments.map(ass => (
                      <li key={ass.id} className="flex justify-between items-center text-sm border-b border-border pb-1">
                        <span className="font-medium text-foreground text-xs truncate max-w-[150px]">{ass.title}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Intl.DateTimeFormat("en-GB").format(ass.dueDate)}
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
                You need a valid access code to view the detailed performance history of this student.
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

export default SingleStudentPage;
