import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const EventList = async ({ dateParam }: { dateParam: string | undefined }) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const date = dateParam ? new Date(dateParam) : new Date();
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const roleConditions: Record<string, object> = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };

  const classFilter =
    role && role !== "admin" && roleConditions[role]
      ? { OR: [{ classId: null }, { class: roleConditions[role] }] }
      : {};

  let data = await prisma.event.findMany({
    where: {
      startTime: { lte: dayEnd },
      endTime: { gte: dayStart },
      ...classFilter,
    },
    include: {
      class: { select: { name: true } },
    },
    take: 3,
    orderBy: {
      startTime: "asc",
    },
  });

  return (
    <>
      {data.length === 0 && (
        <p className="text-muted-foreground text-sm  mt-4">No events for this date.</p>
      )}
      {data.map((event) => (
        <div
          className="p-5 rounded-md bg-card border border-border border-t-4 odd:border-t-red-500 even:border-t-green-500"
          key={event.id}
        >
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-foreground">
              {event.title}
            </h1>
            <div className="flex flex-col items-end gap-1">
              <span className="text-muted-foreground text-xs text-right">
                {event.startTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" - "}
                {event.endTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              {(event as any).class && (
                <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Class {(event as any).class.name}
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-muted-foreground text-sm">
            {event.description}
          </p>
        </div>
      ))}
    </>
  );
};

export default EventList;
