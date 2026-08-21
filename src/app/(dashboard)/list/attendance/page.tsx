import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Attendance, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import AttendanceKanban from "@/components/AttendanceKanban";
import { getLessons } from "@/actions/attendance.actions";
import { AiStubCard } from "@/components/AiStubCard";

type AttendanceList = Attendance & {
  student: { name: string; surname: string };
  lesson: {
    class: { name: string };
    teacher: { name: string; surname: string };
    subject: { name: string };
  };
};

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  const columns = [
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Branch",
      accessor: "class",
    },
    {
      header: "Subject",
      accessor: "subject",
      className: "hidden md:table-cell",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
      className: "hidden md:table-cell",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: AttendanceList) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="flex items-center gap-4 p-4">
        {item.student.name + " " + item.student.surname}
      </td>
      <td>{item.lesson.class.name}</td>
      <td className="hidden md:table-cell">{item.lesson.subject.name}</td>
      <td className="hidden md:table-cell">
        {item.lesson.teacher.name + " " + item.lesson.teacher.surname}
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.date)}
      </td>
      <td className="hidden md:table-cell">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.present ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500"}`}>
          {item.present ? "Present" : "Absent"}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="attendance" type="update" data={item} />
              <FormContainer table="attendance" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.AttendanceWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "studentId":
            query.studentId = value;
            break;
          case "search":
            query.OR = [
              { student: { name: { contains: value, mode: "insensitive" } } },
              { lesson: { subject: { name: { contains: value, mode: "insensitive" } } } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  switch (role) {
    case "admin":
      break;
    case "teacher":
      query.lesson = { teacherId: currentUserId! };
      break;
    case "student":
      query.studentId = currentUserId!;
      break;
    case "parent":
      query.student = {
        parentId: currentUserId!,
      };
      break;
    default:
      break;
  }

  const [data, count, allStudents] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: query,
      include: {
        student: { select: { name: true, surname: true } },
        lesson: {
          select: {
            class: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            subject: { select: { name: true } },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attendance.count({ where: query }),
    prisma.student.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const searchItems = allStudents.map((s) => ({
    id: s.id,
    label: `${s.name} ${s.surname}`,
    sublabel: "Student",
    href: `/list/students/${s.id}`,
  }));

  const lessons = await getLessons();

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      {(role === "admin" || role === "teacher") && (
        <AttendanceKanban initialLessons={lessons} />
      )}

      <div className="bg-card text-card-foreground p-4 rounded-2xl border border-border space-y-4">
        {(role === "admin" || role === "teacher") && (
          <AiStubCard
            title="AI Attendance Insights"
            description="Get an AI-generated summary of attendance trends and at-risk students for your classes."
            feature="attendance-summary"
          />
        )}
        <div className="flex items-center justify-between mb-4">
          <h1 className="hidden md:block text-lg font-semibold">All Attendance Records</h1>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <TableSearch items={searchItems} entityLabel="Students" />
            <div className="flex items-center gap-4 self-end">
              {(role === "admin" || role === "teacher") && (
                <FormContainer table="attendance" type="create" />
              )}
            </div>
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={data} />
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default AttendanceListPage;
