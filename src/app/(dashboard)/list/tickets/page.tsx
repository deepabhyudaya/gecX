import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import prisma from "@/lib/prisma";
import { Ticket, Student, Parent, Teacher } from "@prisma/client";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import moment from "moment";
import { LifeBuoy } from "lucide-react";

type TicketList = Ticket & {
  student?: Student | null;
  parent?: Parent | null;
  teacher?: Teacher | null;
};

const TicketsPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin") return <div>Access Denied</div>;

  const columns = [
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "User",
      accessor: "user",
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
  ];

  const renderRow = (item: TicketList) => {
    let userName = "Unknown";
    let userRole = "N/A";

    if (item.student) {
      userName = `${item.student.name} ${item.student.surname}`;
      userRole = "Student";
    } else if (item.parent) {
      userName = `${item.parent.name} ${item.parent.surname}`;
      userRole = "Parent";
    } else if (item.teacher) {
      userName = `${item.teacher.name} ${item.teacher.surname}`;
      userRole = "Teacher";
    }

    return (
      <tr
        key={item.id}
        className="border-b border-border/40 text-sm hover:bg-muted/40 transition-colors even:bg-muted/20"
      >
        <td className="p-4">
          <div className="flex flex-col">
            <h3 className="font-semibold">{item.subject}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
          </div>
        </td>
        <td className="hidden md:table-cell">
          <div className="flex flex-col">
            <span className="font-medium">{userName}</span>
            <span className="text-[10px] uppercase text-muted-foreground">{userRole}</span>
          </div>
        </td>
        <td className="hidden md:table-cell">
          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            item.status === "OPEN" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
            item.status === "RESOLVED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
          }`}>
            {item.status}
          </span>
        </td>
        <td className="hidden lg:table-cell">{moment(item.createdAt).format("MMM D, YYYY")}</td>
      </tr>
    );
  };

  const { page } = searchParams;
  const p = page ? parseInt(page) : 1;

  const [data, count] = await prisma.$transaction([
    prisma.ticket.findMany({
      include: {
        student: true,
        parent: true,
        teacher: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: { createdAt: "desc" },
    }),
    prisma.ticket.count(),
  ]);

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <LifeBuoy size={20} />
          Support Tickets
        </h1>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default TicketsPage;
