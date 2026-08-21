"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  events?: { startTime: Date; endTime: Date }[];
};

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfWeekISO(date: Date) {

  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

function buildGrid(year: number, month: number) {

  const firstDay = new Date(year, month, 1);

  const gridStart = startOfWeekISO(firstDay);

  const cells: Date[] = [];
  const cur = new Date(gridStart);

  for (let i = 0; i < 42; i++) {
    cells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

const EventCalendar = ({ events = [] }: Props) => {
  const router = useRouter();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date>(today);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleSelect(date: Date) {
    setSelected(date);
    router.push(`?date=${date.toLocaleDateString("en-CA")}`, { scroll: false });
  }

  useEffect(() => {
    router.push(`?date=${today.toLocaleDateString("en-CA")}`, { scroll: false });

  }, []);

  const cells = buildGrid(viewYear, viewMonth);

  const eventDays = new Set<string>();
  for (const e of events) {
    const start = new Date(e.startTime);
    start.setHours(0, 0, 0, 0);
    const end = new Date(e.endTime);
    end.setHours(23, 59, 59, 999);
    const cur = new Date(start);
    while (cur <= end) {
      eventDays.add(cur.toLocaleDateString("en-CA"));
      cur.setDate(cur.getDate() + 1);
    }
  }

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={prevMonth}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-sm font-semibold tracking-tight text-foreground">
          {monthLabel}
        </span>

        <button
          onClick={nextMonth}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="flex items-center justify-center text-[11px] font-medium text-muted-foreground/60 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          const isCurrentMonth = date.getMonth() === viewMonth;
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selected);
          const hasEvent = eventDays.has(date.toLocaleDateString("en-CA"));

          return (
            <button
              key={i}
              onClick={() => handleSelect(date)}
              className={[
                "relative mx-auto flex flex-col items-center justify-center",
                "h-9 w-9 rounded-full text-sm font-medium transition-all duration-150",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isToday
                    ? "ring-1 ring-foreground/25 text-foreground font-semibold"
                    : isCurrentMonth
                      ? "text-foreground/80 hover:bg-muted"
                      : "text-muted-foreground/40 hover:bg-muted/50",
              ].join(" ")}
            >
              {date.getDate()}
              {hasEvent && isCurrentMonth && !isSelected && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: "#888" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EventCalendar;
