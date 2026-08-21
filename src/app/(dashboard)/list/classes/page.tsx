import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Grade, Prisma, Teacher } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

import PinnedItemsWrapper from "@/components/PinnedItemsWrapper";

type ClassList = Class & { teacher: Teacher | null; grade: Grade };

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  await markNotificationsByTypesAsRead(["CLASS_CREATED", "CLASS_UPDATED", "CLASS_DELETED"]);

  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    {
      header: "Branch Name",
      accessor: "name",
    },
    {
      header: "Capacity",
      accessor: "capacity",
      className: "hidden md:table-cell",
    },
    {
      header: "Year",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Supervisor",
      accessor: "teacher",
      className: "hidden md:table-cell",
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

  const renderRow = (item: ClassList) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.capacity}</td>
      <td className="hidden md:table-cell">{item.grade.level}</td>
      <td className="hidden md:table-cell">
        {item.teacher ? item.teacher.name + " " + item.teacher.surname : "—"}
      </td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="class" type="update" data={item} />
              <FormContainer table="class" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "supervisorId":
            query.supervisorId = value;
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

  const [data, count, allClasses] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      include: {
        teacher: true,
        grade: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.class.count({ where: query }),
    prisma.class.findMany({
      select: { id: true, name: true, teacher: { select: { name: true, surname: true } } },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const searchItems = allClasses.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.teacher ? `Supervisor: ${c.teacher.name} ${c.teacher.surname}` : undefined,
  }));

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <PinnedItemsWrapper entityType="classes" baseUrl="/list/classes" role={role} />
      <div className="bg-card text-card-foreground p-4 rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="hidden md:block text-lg font-semibold">All Branches</h1>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <TableSearch items={searchItems} entityLabel="Branches" allowPinning={true} role={role} />
            <div className="flex items-center gap-4 self-end">
              {role === "admin" && <FormContainer table="class" type="create" />}
            </div>
          </div>
        </div>
        <Table columns={columns} renderRow={renderRow} data={data} />
        <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default ClassListPage;
