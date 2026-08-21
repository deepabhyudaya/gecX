"use client";

import { useState } from "react";
import KanbanBoard, { KanbanColumnDef, KanbanItem } from "./KanbanBoard";
import { List, LayoutDashboard } from "lucide-react";

type Props = {
  data: any[];
  tableComponent: React.ReactNode;
};

const columns: KanbanColumnDef[] = [
  { id: "to_do", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export default function AssignmentsKanbanWrapper({ data, tableComponent }: Props) {
  const [view, setView] = useState<"table" | "kanban">("kanban");

  const kanbanItems: KanbanItem[] = data.map((assignment) => {

    const now = new Date();
    const due = new Date(assignment.dueDate);
    let defaultStatus = "to_do";
    if (now > due) defaultStatus = "done";

    return {
      id: assignment.id,
      title: assignment.title,
      subtitle: `${assignment.lesson.subject.name} - ${assignment.lesson.class.name}`,
      meta: `Due: ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(due)}`,
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
          storageKey="assignments"
        />
      )}
    </div>
  );
}
