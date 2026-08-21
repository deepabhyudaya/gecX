import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import type { NotificationItem } from "@/components/animate-ui/components/community/notification-list";
import { EventsNotificationListClient } from "@/components/EventsNotificationListClient";

function formatTime(startDate: Date, endDate: Date): string {
  const start = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const end = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${start} - ${end}`;
}

const EventsNotificationList = async ({
  dateParam,
}: {
  dateParam?: string;
}) => {
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

  const classFilter = role && roleConditions[role]
    ? { OR: [{ classId: null }, { class: roleConditions[role] }] }
    : {};

  const data = await prisma.event.findMany({
    where: {
      startTime: { lte: dayEnd },
      endTime: { gte: dayStart },
      ...(role && role !== "admin" && roleConditions[role]
        ? { OR: [{ classId: null }, { class: roleConditions[role] }] }
        : {}),
    },
    include: { class: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });

  const all: NotificationItem[] = data.map((event) => ({
    id: event.id,
    title: event.title,
    subtitle: (event as any).class
      ? `📌 Class: ${(event as any).class.name} · ${event.description || ""}`
      : event.description || "",
    time: formatTime(event.startTime, event.endTime),
  }));

  const preview: NotificationItem[] =
    all.length > 0
      ? all.slice(0, 5)
      : [{ id: 0, title: "No events", subtitle: dateParam ? "No events for this date" : "No upcoming events", time: "" }];

  const allForDialog: NotificationItem[] =
    all.length > 0
      ? all
      : [{ id: 0, title: "No events", subtitle: dateParam ? "No events for this date" : "No upcoming events", time: "" }];

  return (
    <EventsNotificationListClient preview={preview} all={allForDialog} />
  );
};

export default EventsNotificationList;
