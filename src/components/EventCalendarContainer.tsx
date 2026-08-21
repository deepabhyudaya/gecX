import prisma from "@/lib/prisma";
import EventCalendar from "./EventCalendar";
import EventsNotificationList from "./EventsNotificationList";

const EventCalendarContainer = async ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  const { date } = searchParams;

  const events = await prisma.event.findMany({
    select: {
      startTime: true,
      endTime: true,
    },
  });

  return (
    <div className="bg-card text-card-foreground p-4 rounded-md">
      <EventCalendar events={events} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">Events</h1>
      </div>
      <div className="flex flex-col gap-4">
        <EventsNotificationList dateParam={date} />
      </div>
    </div>
  );
};

export default EventCalendarContainer;
