"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";

export type KanbanItem = {
  id: string | number;
  title: string;
  subtitle: string;
  meta: string;
  status?: string;
};

export type KanbanColumnDef = {
  id: string;
  title: string;
};

function KanbanCard({
  item,
  isDragging = false,
}: {
  item: KanbanItem;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: String(item.id),
    data: { item },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex flex-col gap-2 p-3 rounded-xl bg-background border transition-all select-none cursor-grab active:cursor-grabbing hover:border-foreground/30 shadow-sm ${
        isDragging ? "opacity-40" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-foreground leading-tight">
          {item.title}
        </h4>
        <GripVertical size={14} className="text-muted-foreground/40 shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
          {item.subtitle}
        </span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {item.meta}
        </span>
      </div>
    </div>
  );
}

function KanbanCol({
  column,
  items,
  draggingId,
}: {
  column: KanbanColumnDef;
  items: KanbanItem[];
  draggingId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 flex-1 min-w-[280px] rounded-2xl p-4 border transition-all duration-150 ${
        isOver
          ? "border-foreground/40 bg-foreground/5"
          : "border-border bg-muted/10"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">
          {column.title}
        </h3>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-background border border-border text-foreground">
          {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-3 min-h-[150px]">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[12px] text-muted-foreground/50 border-2 border-dashed border-border rounded-xl p-4">
            No items in {column.title.toLowerCase()}
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              isDragging={draggingId === String(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  items: initialItems,
  columns,
  storageKey,
}: {
  items: KanbanItem[];
  columns: KanbanColumnDef[];
  storageKey: string;
}) {
  const [items, setItems] = useState<KanbanItem[]>(initialItems);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<KanbanItem | null>(null);

  useEffect(() => {
    setItems((prevItems) => {
      const prevIds = new Set(prevItems.map((i) => String(i.id)));
      const newItems = initialItems.filter((i) => !prevIds.has(String(i.id)));

      if (newItems.length === 0 && prevItems.length === initialItems.length) {

        return prevItems;
      }

      const merged = initialItems.map((item) => {
        const existing = prevItems.find((p) => String(p.id) === String(item.id));
        return existing || { ...item, status: item.status || columns[0].id };
      });
      return merged;
    });
  }, [initialItems, columns]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`kanban_state_${storageKey}`);
      if (stored) {
        const stateMap: Record<string, string> = JSON.parse(stored);
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            status: stateMap[item.id] || item.status || columns[0].id,
          }))
        );
      } else {
        setItems((prev) =>
          prev.map((item) => ({
            ...item,
            status: item.status || columns[0].id,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load kanban state", e);
    }
  }, [storageKey, columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const activeId = active.id as string;
    setDraggingId(activeId);
    setDraggingItem(items.find((i) => String(i.id) === activeId) ?? null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingId(null);
    setDraggingItem(null);

    if (!over) return;

    const activeId = active.id as string;
    const targetColId = over.id as string;

    setItems((prev) => {
      const newItems = prev.map((item) => {
        if (String(item.id) === activeId) {
          return { ...item, status: targetColId };
        }
        return item;
      });

      try {
        const stateMap = newItems.reduce((acc, item) => {
          acc[item.id] = item.status!;
          return acc;
        }, {} as Record<string, string>);
        localStorage.setItem(
          `kanban_state_${storageKey}`,
          JSON.stringify(stateMap)
        );
      } catch (e) {

      }

      return newItems;
    });
  };

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-6 w-max min-w-full">
          {columns.map((col) => (
            <KanbanCol
              key={col.id}
              column={col}
              items={items.filter((i) => i.status === col.id)}
              draggingId={draggingId}
            />
          ))}
        </div>

        <DragOverlay>
          {draggingItem ? (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-card border border-foreground/30 shadow-xl opacity-95 cursor-grabbing w-[280px]">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[13px] font-semibold text-foreground leading-tight">
                  {draggingItem.title}
                </h4>
                <GripVertical size={14} className="text-muted-foreground/40 shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 rounded-full bg-muted">
                  {draggingItem.subtitle}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {draggingItem.meta}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
