import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Parent, Prisma, Student } from "@prisma/client";
import Link from "next/link";

import { auth } from "@clerk/nextjs/server";
import PinnedItemsWrapper from "@/components/PinnedItemsWrapper";
import {
  getUnreadEntityBadgesByTypes,
  markNotificationsByTypesAsRead,
} from "@/actions/notification.actions";

type ParentList = Parent & { students: Student[] };

const ParentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

const { sessionClaims } = auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;

const parentTypes = ["PARENT_CREATED", "PARENT_UPDATED", "PARENT_DELETED"];
const unreadParentBadges = await getUnreadEntityBadgesByTypes(parentTypes);

const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Student Names",
    accessor: "students",
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

const renderRow = (item: ParentList) => (
  <tr
    key={item.id}
    className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
  >
    <td className="p-4">
      <Link href={`/list/parents/${item.id}`} className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{item.name}</h3>
            {unreadParentBadges[item.id] && (
              <span
                className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[10px] font-semibold ${
                  unreadParentBadges[item.id].tone === "red"
                    ? "bg-red-500 text-white"
                    : unreadParentBadges[item.id].tone === "yellow"
                      ? "bg-amber-500 text-black"
                      : "bg-primary text-primary-foreground"
                }`}
              >
                {unreadParentBadges[item.id].count > 99 ? "99+" : unreadParentBadges[item.id].count}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{item?.email}</p>
        </div>
      </Link>
    </td>
    <td className="hidden md:table-cell">
      {item.students.map((student) => student.name).join(",")}
    </td>
    <td className="hidden md:table-cell">{item.phone}</td>
    <td className="hidden md:table-cell">{item.address}</td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="parent" type="update" data={item} />
            <FormContainer table="parent" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.ParentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.name = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  const [data, count, allParents] = await prisma.$transaction([
    prisma.parent.findMany({
      where: query,
      include: {
        students: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.parent.count({ where: query }),
    prisma.parent.findMany({
      select: { id: true, name: true, surname: true, email: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  await markNotificationsByTypesAsRead(parentTypes);

  const searchItems = allParents.map((p) => ({
    id: p.id,
    label: `${p.name} ${p.surname}`,
    sublabel: p.email ?? undefined,
    href: `/list/parents/${p.id}`,
  }));

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <PinnedItemsWrapper entityType="parents" baseUrl="/list/parents" role={role} />
      <div className="bg-card text-card-foreground p-4 rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
        <h1 className="hidden md:block text-lg font-semibold">All Parents</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch items={searchItems} entityLabel="Parents" allowPinning={true} role={role} />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="parent" type="create" />}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
      </div>
    </div>
  );
};

export default ParentListPage;
