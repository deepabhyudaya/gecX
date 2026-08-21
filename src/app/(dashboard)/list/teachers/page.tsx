import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { Class, Prisma, Subject, Teacher } from "@prisma/client";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import PinnedItemsWrapper from "@/components/PinnedItemsWrapper";
import {
  getUnreadEntityBadgesByTypes,
  markNotificationsByTypesAsRead,
} from "@/actions/notification.actions";

type TeacherList = Teacher & { subjects: Subject[] } & { classes: Class[] };

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const teacherTypes = ["TEACHER_CREATED", "TEACHER_UPDATED", "TEACHER_DELETED"];
  const unreadTeacherBadges = await getUnreadEntityBadgesByTypes(teacherTypes);
  await markNotificationsByTypesAsRead(teacherTypes);
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Teacher ID",
      accessor: "teacherId",
      className: "hidden md:table-cell",
    },
    {
      header: "Designation",
      accessor: "designation",
      className: "hidden md:table-cell",
    },
    {
      header: "Subjects",
      accessor: "subjects",
      className: "hidden md:table-cell",
    },
    {
      header: "Branches",
      accessor: "classes",
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

  const renderRow = (item: TeacherList) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="p-4">
        <Link href={`/list/teachers/${item.id}`} className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
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
              {unreadTeacherBadges[item.id] && (
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold ${
                    unreadTeacherBadges[item.id].tone === "red"
                      ? "bg-red-500 text-white"
                      : unreadTeacherBadges[item.id].tone === "yellow"
                        ? "bg-amber-500 text-black"
                        : "bg-primary text-primary-foreground"
                  }`}
                >
                  {unreadTeacherBadges[item.id].count > 99 ? "99+" : unreadTeacherBadges[item.id].count}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{item?.email}</p>
          </div>
        </Link>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell">
        <div className="flex flex-col">
          <span>{(item as any).designation || "-"}</span>
          {(item as any).department && (
            <span className="text-[11px] text-muted-foreground">{(item as any).department}</span>
          )}
        </div>
      </td>
      <td className="hidden md:table-cell">
        {item.subjects.map((subject) => subject.name).join(",")}
      </td>
      <td className="hidden md:table-cell">
        {item.classes.map((classItem) => classItem.name).join(",")}
      </td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="teacher" type="update" data={item} />
              <FormContainer table="teacher" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.TeacherWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lessons = {
              some: {
                classId: parseInt(value),
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

  const [data, count, allTeachers] = await prisma.$transaction([
    prisma.teacher.findMany({
      where: query,
      include: {
        subjects: true,
        classes: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.teacher.count({ where: query }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true, email: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const searchItems = allTeachers.map((t) => ({
    id: t.id,
    label: `${t.name} ${t.surname}`,
    sublabel: t.email ?? undefined,
    href: `/list/teachers/${t.id}`,
  }));

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <PinnedItemsWrapper entityType="teachers" baseUrl="/list/teachers" role={role} />
      <div className="bg-card text-card-foreground p-4 rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
        <h1 className="hidden md:block text-lg font-semibold">All Teachers</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch items={searchItems} entityLabel="Teachers" allowPinning={true} role={role} />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && (
              <FormContainer table="teacher" type="create" />
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

export default TeacherListPage;
