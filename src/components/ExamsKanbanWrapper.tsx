"use client";

import { useState } from "react";
import KanbanBoard, { KanbanColumnDef, KanbanItem } from "./KanbanBoard";
import { List, LayoutDashboard } from "lucide-react";

type Props = {
  data: any[];
  tableComponent: React.ReactNode;
};

const columns: KanbanColumnDef[] = [
  { id: "upcoming", title: "Upcoming" },
  { id: "in_progress", title: "In Progress" },
  { id: "completed", title: "Completed" },
];

export default function ExamsKanbanWrapper({ data, tableComponent }: Props) {
  const [view, setView] = useState<"table" | "kanban">("kanban");

  const kanbanItems: KanbanItem[] = data.map((exam) => {

    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);
    let defaultStatus = "upcoming";
    if (now > end) defaultStatus = "completed";
    else if (now >= start && now <= end) defaultStatus = "in_progress";

    return {
      id: exam.id,
      title: exam.title,
      subtitle: `${exam.lesson.subject.name} - ${exam.lesson.class.name}`,
      meta: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start),
      status: defaultStatus,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2 mb-2">
        <div className="flex bg-muted rounded-lg p-1 border border-border">
          <button
            onClick={() => setView("table")}
            className={`p-1.5 rounded-md transition-all ${
              view === "table"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="List View"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`p-1.5 rounded-md transition-all ${
              view === "kanban"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Board View"
          >
            <LayoutDashboard size={16} />
          </button>
        </div>
      </div>

      {view === "table" ? (
        tableComponent
      ) : (
        <KanbanBoard
          items={kanbanItems}
          columns={columns}
          storageKey="exams"
        />
      )}
    </div>
  );
}
