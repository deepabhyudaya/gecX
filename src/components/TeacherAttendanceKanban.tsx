"use client";

import { useState, useTransition, useEffect } from "react";
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
import { toast } from "react-toastify";
import {
  CheckCircle2,
  XCircle,
  GripVertical,
  CheckCheck,
  RotateCcw,
  Loader2,
  Users,
} from "lucide-react";
import {
  bulkMarkTeacherAttendance,
  getTeachersForAttendance,
  getTeacherAttendanceForDate,
} from "@/actions/attendance.actions";

type Teacher = { id: string; name: string; surname: string; img?: string | null };
type Column = "present" | "absent";

function TeacherCard({
  teacher,
  column,
  isDragging = false,
}: {
  teacher: Teacher;
  column: Column;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: teacher.id,
    data: { teacher, column },
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background border transition-all select-none cursor-grab active:cursor-grabbing ${isDragging
        ? "opacity-40"
        : column === "present"
          ? "border-green-500/30 hover:border-green-500/60 hover:shadow-[0_0_0_2px_rgba(34,197,94,0.12)]"
          : "border-red-500/20 hover:border-red-500/40"
        }`}
    >
      <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground shrink-0 overflow-hidden">
        {teacher.img ? (
          <img src={teacher.img} alt={teacher.name} className="w-full h-full object-cover" />
        ) : (
          `${teacher.name[0]}${teacher.surname[0]}`
        )}
      </div>
      <span className="text-[13px] font-medium text-foreground truncate flex-1">
        {teacher.name} {teacher.surname}
      </span>
      {column === "present" ? (
        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
      ) : (
        <XCircle size={14} className="text-red-400 shrink-0" />
      )}
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  teachers,
  icon,
  accent,
  draggingId,
}: {
  id: Column;
  title: string;
  teachers: Teacher[];
  icon: React.ReactNode;
  accent: string;
  draggingId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 flex-1 min-w-0 rounded-2xl p-4 border-2 transition-all duration-150 ${isOver
        ? id === "present"
          ? "border-green-500/60 bg-green-500/5"
          : "border-red-400/60 bg-red-500/5"
        : "border-border bg-muted/30"
        }`}
    >
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-2">
          {icon}
          <span className={`text-[13px] font-bold uppercase tracking-wider ${accent}`}>
            {title}
          </span>
        </div>
        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${id === "present"
          ? "bg-green-500/15 text-green-600 dark:text-green-400"
          : "bg-red-500/15 text-red-600 dark:text-red-400"
          }`}>
          {teachers.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 min-h-[120px]">
        {teachers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[12px] text-muted-foreground/50 border-2 border-dashed border-border rounded-xl py-8">
            Drop teachers here
          </div>
        ) : (
          teachers.map((t) => (
            <TeacherCard
              key={t.id}
              teacher={t}
              column={id}
              isDragging={draggingId === t.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function TeacherAttendanceKanban() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [present, setPresent] = useState<Teacher[]>([]);
  const [absent, setAbsent] = useState<Teacher[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingTeacher, setDraggingTeacher] = useState<Teacher | null>(null);
  const [draggingFromCol, setDraggingFromCol] = useState<Column | null>(null);

  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    handleDateChange(selectedDate);
  }, []);

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    try {
      const [teachers, existing] = await Promise.all([
        getTeachersForAttendance(),
        getTeacherAttendanceForDate(date),
      ]);
      const existingMap = new Map(existing.map((e) => [e.teacherId, e.present]));
      if (existingMap.size > 0) {
        const p: Teacher[] = [], a: Teacher[] = [];
        teachers.forEach((t) => {
          existingMap.get(t.id) === false ? a.push(t) : p.push(t);
        });
        setPresent(p); setAbsent(a);
      } else {
        setPresent(teachers); setAbsent([]);
      }
    } catch {
      toast.error("Failed to load teachers.");
    } finally {
      setLoading(false);
    }
  };

  const markAllPresent = () => {
    setPresent([...present, ...absent]);
    setAbsent([]);
    saveAttendance();
  };

  const resetAttendance = () => {
    handleDateChange(selectedDate);
  };

  const saveAttendance = () => {
    startTransition(async () => {
      const entries = [
        ...present.map((t) => ({ teacherId: t.id, present: true })),
        ...absent.map((t) => ({ teacherId: t.id, present: false })),
      ];

      const res = await bulkMarkTeacherAttendance(selectedDate, entries);
      if (res.success) {
        toast.success("Teacher attendance saved successfully!");
      } else {
        toast.error(res.error || "Failed to save.");
      }
    });
  };

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { teacher: Teacher; column: Column } | undefined;
    if (data) {
      setDraggingId(data.teacher.id);
      setDraggingTeacher(data.teacher);
      setDraggingFromCol(data.column);
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    setDraggingTeacher(null);
    setDraggingFromCol(null);

    const { active, over } = e;
    if (!over) return;

    const data = active.data.current as { teacher: Teacher; column: Column } | undefined;
    if (!data) return;

    const targetCol = over.id as Column;
    const { teacher, column: sourceCol } = data;

    if (sourceCol === targetCol) return;

    if (sourceCol === "present") {
      setPresent((prev) => prev.filter((t) => t.id !== teacher.id));
    } else {
      setAbsent((prev) => prev.filter((t) => t.id !== teacher.id));
    }

    if (targetCol === "present") {
      setPresent((prev) => [...prev, teacher]);
    } else {
      setAbsent((prev) => [...prev, teacher]);
    }

    saveAttendance();
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="text-muted-foreground" size={20} />
            Teacher Attendance
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag to mark present or absent
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-[13px] bg-background border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/20 text-foreground"
          />

          {isPending && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="animate-spin text-border" size={32} />
            <span className="text-sm font-medium">Loading teachers...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-semibold text-foreground">
                  {present.length + absent.length}
                </span>
                <span className="text-muted-foreground">Total Teachers</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAttendance}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-transparent hover:border-border"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
                <button
                  onClick={markAllPresent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-green-600 bg-green-500/10 hover:bg-green-500/20 transition-colors border border-transparent hover:border-green-500/20 dark:text-green-400"
                >
                  <CheckCheck size={14} />
                  Mark All Present
                </button>
              </div>
            </div>

            <DndContext
              sensors={sensors}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <div className="flex gap-6 flex-1 min-h-0 overflow-y-auto pb-4 custom-scrollbar">
                <KanbanColumn
                  id="present"
                  title="Present"
                  teachers={present}
                  icon={<CheckCircle2 size={16} className="text-green-500" />}
                  accent="text-green-600 dark:text-green-400"
                  draggingId={draggingId}
                />
                <KanbanColumn
                  id="absent"
                  title="Absent"
                  teachers={absent}
                  icon={<XCircle size={16} className="text-red-400" />}
                  accent="text-red-600 dark:text-red-400"
                  draggingId={draggingId}
                />
              </div>

              <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
                {draggingTeacher ? (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-foreground/30 shadow-xl opacity-95 cursor-grabbing w-[280px]">
                    <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground shrink-0 overflow-hidden">
                      {draggingTeacher.img ? (
                        <img src={draggingTeacher.img} alt={draggingTeacher.name} className="w-full h-full object-cover" />
                      ) : (
                        `${draggingTeacher.name[0]}${draggingTeacher.surname[0]}`
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-foreground truncate flex-1">
                      {draggingTeacher.name} {draggingTeacher.surname}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
