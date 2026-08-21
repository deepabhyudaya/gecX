"use client";

import { useState } from "react";
import KanbanBoard, { KanbanColumnDef, KanbanItem } from "./KanbanBoard";
import { List, LayoutDashboard } from "lucide-react";

type Props = {
  data: any[];
  tableComponent: React.ReactNode;
};

const columns: KanbanColumnDef[] = [
  { id: "needs_improvement", title: "Needs Improvement (<50)" },
  { id: "average", title: "Average (50-80)" },
  { id: "excellent", title: "Excellent (80+)" },
];

export default function ResultsKanbanWrapper({ data, tableComponent }: Props) {
  const [view, setView] = useState<"table" | "kanban">("kanban");

  const kanbanItems: KanbanItem[] = data.filter(Boolean).map((result) => {
    let defaultStatus = "average";
    if (result.score < 50) defaultStatus = "needs_improvement";
    else if (result.score >= 80) defaultStatus = "excellent";

    return {
      id: result.id,
      title: `${result.studentName} ${result.studentSurname}`,
      subtitle: result.title,
      meta: `Score: ${result.score}`,
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
          storageKey="results"
        />
      )}
    </div>
  );
}
