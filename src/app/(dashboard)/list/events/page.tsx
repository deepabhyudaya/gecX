import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Event, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { markNotificationsByTypesAsRead } from "@/actions/notification.actions";

type EventList = Event & { class: Class };

const EventListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  await markNotificationsByTypesAsRead(["EVENT_CREATED", "EVENT_UPDATED", "EVENT_DELETED"]);

  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Branch",
      accessor: "class",
    },
    {
      header: "Start Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "End Date",
      accessor: "endDate",
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

  const renderRow = (item: EventList) => (
    <tr
      key={item.id}
      className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.class?.name || "-"}</td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.startTime)}
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.endTime)}
      </td>

      <td>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <>
              <FormContainer table="event" type="update" data={item} />
              <FormContainer table="event" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  const { page, ...queryParams } = searchParams;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.EventWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.title = { contains: value, mode: "insensitive" };
            break;
          default:
            break;
        }
      }
    }
  }

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: currentUserId! } } },
    student: { students: { some: { id: currentUserId! } } },
    parent: { students: { some: { parentId: currentUserId! } } },
  };

  if (role !== "admin") {
    const classCondition = roleConditions[role as keyof typeof roleConditions];
    if (classCondition) {
      query.OR = [
        { classId: null },
        { class: classCondition },
      ];
    } else {

      query.classId = null;
    }
  }

  const [data, count, allEvents] = await prisma.$transaction([
    prisma.event.findMany({
      where: query,
      include: {
        class: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.event.count({ where: query }),
    prisma.event.findMany({
      where: role !== "admin" ? query : {},
      select: { id: true, title: true, class: { select: { name: true } } },
      orderBy: { title: "asc" },
      take: 200,
    }),
  ]);

  const searchItems = allEvents.map((e) => ({
    id: e.id,
    label: e.title,
    sublabel: e.class ? `Branch: ${e.class.name}` : "All branches",
  }));

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Events</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch items={searchItems} entityLabel="Events" />
          <div className="flex items-center gap-4 self-end">
            {role === "admin" && <FormContainer table="event" type="create" />}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default EventListPage;
