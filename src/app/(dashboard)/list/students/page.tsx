import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";

import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Grade, Prisma, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";

import { auth } from "@clerk/nextjs/server";
import PinnedItemsWrapper from "@/components/PinnedItemsWrapper";
import {
  getUnreadEntityBadgesByTypes,
  markNotificationsByTypesAsRead,
} from "@/actions/notification.actions";

type StudentList = Student & { class: Class; grade: Grade };

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const studentTypes = ["STUDENT_CREATED", "STUDENT_UPDATED", "STUDENT_DELETED"];
  const unreadStudentBadges = await getUnreadEntityBadgesByTypes(studentTypes);
  await markNotificationsByTypesAsRead(studentTypes);
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Student ID",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    {
      header: "Roll No.",
      accessor: "rollNumber",
      className: "hidden md:table-cell",
    },
    {
      header: "Batch / Section",
      accessor: "batchSection",
      className: "hidden md:table-cell",
    },
    {
      header: "Year",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden lg:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: StudentList) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="p-4">
        <Link href={`/list/students/${item.id}`} className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
          <Image
            src={item.img || "/noAvatar.png"}
            alt=""
            width={40}
            height={40}
            className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{item.name}</h3>
              {unreadStudentBadges[item.id] && (
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold ${
                    unreadStudentBadges[item.id].tone === "red"
                      ? "bg-red-500 text-white"
                      : unreadStudentBadges[item.id].tone === "yellow"
                        ? "bg-amber-500 text-black"
                        : "bg-primary text-primary-foreground"
                  }`}
                >
                  {unreadStudentBadges[item.id].count > 99 ? "99+" : unreadStudentBadges[item.id].count}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item.class.name}</p>
          </div>
        </Link>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell">{item.rollNumber || "-"}</td>
      <td className="hidden md:table-cell">
        {(item as any).batch || (item as any).section ? (
          <div className="flex flex-col">
            {(item as any).batch && <span className="text-xs">{(item as any).batch}</span>}
            {(item as any).section && <span className="text-[11px] text-muted-foreground">Section {(item as any).section}</span>}
          </div>
        ) : (
          "-"
        )}
      </td>
      <td className="hidden md:table-cell">{item.grade.level}</td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="student" type="update" data={item} />
              <FormContainer table="student" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.StudentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "teacherId":
            query.class = {
              lessons: {
                some: {
                  teacherId: value,
                },
              },
            };
            break;
          case "search":
            query.name = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count, allStudents] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
        grade: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.student.count({ where: query }),
    prisma.student.findMany({
      select: { id: true, name: true, surname: true, email: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const searchItems = allStudents.map((s) => ({
    id: s.id,
    label: `${s.name} ${s.surname}`,
    sublabel: s.email ?? undefined,
    href: `/list/students/${s.id}`,
  }));

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <PinnedItemsWrapper entityType="students" baseUrl="/list/students" role={role} />
      <div className="bg-card text-card-foreground p-4 rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
        <h1 className="hidden md:block text-lg font-semibold">All Students</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch items={searchItems} entityLabel="Students" allowPinning={true} role={role} />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && (

              <FormContainer table="student" type="create" />
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

export default StudentListPage;
