import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Grade, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

type GradeList = Grade;

const GradeListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  await markNotificationsByTypesAsRead(["GRADE_CREATED", "GRADE_UPDATED", "GRADE_DELETED"]);
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    {
      header: "Year Level",
      accessor: "level",
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

  const renderRow = (item: GradeList) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="flex items-center gap-4 p-4">Year {item.level}</td>
      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="grade" type="update" data={item} />
              <FormContainer table="grade" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.GradeWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.level = { equals: parseInt(value) || 0 };
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count, allGrades] = await prisma.$transaction([
    prisma.grade.findMany({
      where: query,
      orderBy: { level: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.grade.count({ where: query }),
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
      take: 200,
    }),
  ]);

  const searchItems = allGrades.map((g) => ({
    id: g.id,
    label: `Year ${g.level}`,
  }));

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Years</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch items={searchItems} entityLabel="Years" />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="grade" type="create" />}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default GradeListPage;
