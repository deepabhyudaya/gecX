import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import type { NotificationItem } from "@/components/animate-ui/components/community/notification-list";
import { AnnouncementsNotificationListClient } from "@/components/AnnouncementsNotificationListClient";

function formatDate(date: Date): string {
  const now = new Date();
  const d = new Date(date);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays === 0) return `Today`;
  if (diffDays === -1) return `Yesterday`;
  if (diffDays === 1) return `Tomorrow`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const AnnouncementsNotificationList = async () => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };

  const where =
    role !== "admin"
      ? {
          OR: [
            { classId: null },
            {
              class:
                roleConditions[role as keyof typeof roleConditions] || {},
            },
          ],
        }
      : {};

  const data = await prisma.announcement.findMany({
    orderBy: { date: "desc" },
    where,
    include: {
      class: {
        select: {
          name: true,
        },
      },
    },
  });

  const toItem = (a: (typeof data)[number], i: number): NotificationItem => ({
    id: a.id,
    title: a.title,
    subtitle: a.class ? (a.description ? `${a.description}  ${a.class.name}` : a.class.name) : a.description,
    time: formatDate(a.date),
  });

  const all: NotificationItem[] = data.map(toItem);
  const preview: NotificationItem[] = all.slice(0, 5);

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
      </div>
      <AnnouncementsNotificationListClient preview={preview} all={all} />
    </div>
  );
};

export default AnnouncementsNotificationList;
