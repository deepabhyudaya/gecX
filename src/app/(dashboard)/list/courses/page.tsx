import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { Course, Prisma, Teacher } from "@prisma/client";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";
import moment from "moment";
import Link from "next/link";
import { Eye } from "lucide-react";
import { AdminDeleteCourseBtn, AdminExpireCourseBtn, UnexpireCourseBtn } from "@/components/BuilderClient";
import { AiStubCard } from "@/components/AiStubCard";

type CourseList = Course & { teacher: Teacher };

const CourseListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  await markNotificationsByTypesAsRead([
    "COURSE_SUBMITTED",
    "COURSE_APPROVED",
    "COURSE_REJECTED",
    "COURSE_EXPIRED",
    "COURSE_UNEXPIRED",
    "COURSE_UPDATED",
    "COURSE_DELETED",
    "COURSE_ENROLLMENT",
  ]);
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
      className: "hidden md:table-cell",
    },
    {
      header: "Created At",
      accessor: "createdAt",
      className: "hidden lg:table-cell",
    },
    {
      header: "Actions",
      accessor: "action",
    },
  ];

  const renderRow = (item: CourseList) => (
    <tr
      key={item.id}
      className={`border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20 ${item.status === "EXPIRED" ? "opacity-50" : ""}`}
    >
      <td className="p-4 font-medium">{item.title}</td>
      <td className="hidden md:table-cell">{item.teacher.name} {item.teacher.surname}</td>
      <td className="hidden md:table-cell">
        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
          item.status === "APPROVED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
          item.status === "REJECTED" ? "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive" :
          item.status === "EXPIRED"  ? "bg-muted text-muted-foreground border border-border" :
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}>
          {item.status}
        </span>
      </td>
      <td className="hidden lg:table-cell">{moment(item.createdAt).format("MMM D, YYYY")}</td>
      <td>
          <div className="flex items-center gap-2">
            <Link href={`/list/courses/${item.slug || item.id}`}>
              <button title="View course" className="w-7 h-7 flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 transition-colors text-primary-foreground">
                <Eye size={14} strokeWidth={2} />
              </button>
            </Link>
            {item.status === "EXPIRED" && (role === "admin" || (role === "teacher" && item.teacherId === userId)) && (
              <UnexpireCourseBtn courseId={item.id} />
            )}
            {(role === "admin" || (role === "teacher" && item.teacherId === userId)) && (
              <>
                {item.status !== "EXPIRED" && <AdminExpireCourseBtn courseId={item.id} />}
                <AdminDeleteCourseBtn courseId={item.id} />
              </>
            )}
          </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;

  const query: Prisma.CourseWhereInput = {};

  if (queryParams.search) {
    query.title = { contains: queryParams.search, mode: "insensitive" };
  }

  const [data, count] = await prisma.$transaction([
    prisma.course.findMany({
      where: query,
      include: {
        teacher: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where: query }),
  ]);

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex-1 m-4 mt-0 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Courses</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch entityLabel="Courses" />
        </div>
      </div>
      <AiStubCard
        title="AI Course Recommendations"
        description="Get personalized course suggestions based on your academic profile and interests."
        feature="course-recommendations"
      />
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default CourseListPage;
