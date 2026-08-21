"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition, useEffect } from "react";
import { GripVertical, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { reorderSections, createLecture } from "@/lib/courseActions";
import { useFormState } from "react-dom";
import { useRef } from "react";
import {
  EditSectionForm,
  DeleteSectionBtn,
} from "@/components/BuilderClient";
import { DraggableLectureList } from "@/components/DraggableLectureList";

type Lecture = {
  id: number;
  title: string;
  videoUrl: string;
  order: number;
};

type Section = {
  id: number;
  title: string;
  order: number;
  lectures: Lecture[];
};

function AddLectureForm({
  sectionId,
  nextOrder,
}: {
  sectionId: number;
  nextOrder: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createLecture, { success: false, error: false });

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col sm:flex-row gap-2 mt-2 p-3 bg-card border border-dashed border-border rounded-[8px]"
    >
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="order" value={nextOrder} />
      <input
        name="title"
        required
        className="flex-1 p-2 text-[12px] rounded-[6px] bg-transparent text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Lecture Title"
      />
      <input
        name="videoUrl"
        required
        className="flex-1 p-2 text-[12px] rounded-[6px] bg-transparent text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="YouTube URL"
      />
      <button
        type="submit"
        className="sm:w-auto bg-primary text-primary-foreground py-2 px-4 rounded-[6px] text-[12px] font-bold hover:opacity-90 transition-all whitespace-nowrap"
      >
        Add Lecture
      </button>
    </form>
  );
}

function LectureToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground mb-1"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? "Collapse" : "Expand"} lectures
      </button>
      {open && children}
    </div>
  );
}

function SortableSection({ section }: { section: Section }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-muted/20 border border-border rounded-[10px] overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-border/60">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 touch-none"
            title="Drag to reorder"
          >
            <GripVertical size={15} />
          </button>
          <Layers size={14} className="text-muted-foreground shrink-0" />
          <span className="text-[13px] font-bold text-foreground truncate">
            {section.title}
          </span>
          <span className="text-[11px] text-muted-foreground">
            ({section.lectures.length} lectures)
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <EditSectionForm sectionId={section.id} currentTitle={section.title} />
          <DeleteSectionBtn sectionId={section.id} />
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2">
        <LectureToggle>
          <DraggableLectureList
            sectionId={section.id}
            lectures={section.lectures}
          />
        </LectureToggle>
        <AddLectureForm sectionId={section.id} nextOrder={section.lectures.length + 1} />
      </div>
    </div>
  );
}

export function DraggableSectionList({
  courseId,
  sections,
}: {
  courseId: number;
  sections: Section[];
}) {
  const [items, setItems] = useState<Section[]>(sections);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(sections);
  }, [sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((s) => s.id === active.id);
    const newIndex = items.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("orderedIds", JSON.stringify(reordered.map((s) => s.id)));
      await reorderSections({ success: false, error: false }, fd);
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {items.map((section) => (
            <SortableSection key={section.id} section={section} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
