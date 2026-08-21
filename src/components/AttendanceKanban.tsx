"use client";

import { useState, useTransition, useCallback } from "react";
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
  Users,
  CheckCheck,
  RotateCcw,
  Loader2,
  BookOpen,
  Calendar,
} from "lucide-react";
import {
  bulkMarkAttendance,
  getLessons,
  getStudentsByClass,
  getAttendanceForLesson,
  type BulkAttendanceEntry,
} from "@/actions/attendance.actions";

type Student = { id: string; name: string; surname: string; img?: string | null };
type Lesson = {
  id: number;
  name: string;
  class: { id: number; name: string };
  subject: { name: string };
};

type Column = "present" | "absent";

function StudentCard({
  student,
  column,
  isDragging = false,
}: {
  student: Student;
  column: Column;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: student.id,
    data: { student, column },
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
      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground shrink-0">
        {student.name[0]}{student.surname[0]}
      </div>
      <span className="text-[13px] font-medium text-foreground truncate flex-1">
        {student.name} {student.surname}
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
  students,
  icon,
  accent,
  draggingId,
}: {
  id: Column;
  title: string;
  students: Student[];
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
          {students.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 min-h-[120px]">
        {students.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[12px] text-muted-foreground/50 border-2 border-dashed border-border rounded-xl py-8">
            Drop students here
          </div>
        ) : (
          students.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              column={id}
              isDragging={draggingId === s.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function AttendanceKanban({
  initialLessons,
}: {
  initialLessons: Lesson[];
}) {
  const [lessons] = useState<Lesson[]>(initialLessons);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [present, setPresent] = useState<Student[]>([]);
  const [absent, setAbsent] = useState<Student[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingStudent, setDraggingStudent] = useState<Student | null>(null);
  const [draggingFromCol, setDraggingFromCol] = useState<Column | null>(null);

  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleLessonChange = useCallback(async (lessonId: number) => {
    const lesson = lessons.find((l) => l.id === lessonId) ?? null;
    setSelectedLesson(lesson);
    if (!lesson) { setPresent([]); setAbsent([]); return; }

    setLoading(true);
    try {
      const [students, existing] = await Promise.all([
        getStudentsByClass(lesson.class.id),
        getAttendanceForLesson(lessonId, selectedDate),
      ]);

      const existingMap = new Map(existing.map((e) => [e.studentId, e.present]));

      if (existingMap.size > 0) {

        const p: Student[] = [];
        const a: Student[] = [];
        students.forEach((s) => {
          const isPresent = existingMap.get(s.id);
          if (isPresent === true) p.push(s);
          else if (isPresent === false) a.push(s);
          else p.push(s);
        });
        setPresent(p);
        setAbsent(a);
      } else {

        setPresent(students);
        setAbsent([]);

        const entries = students.map((s) => ({ studentId: s.id, present: true }));
        await bulkMarkAttendance(lessonId, selectedDate, entries);
      }
    } catch (e) {
      toast.error("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [lessons, selectedDate]);

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    if (!selectedLesson) return;
    setLoading(true);
    try {
      const [students, existing] = await Promise.all([
        getStudentsByClass(selectedLesson.class.id),
        getAttendanceForLesson(selectedLesson.id, date),
      ]);
      const existingMap = new Map(existing.map((e) => [e.studentId, e.present]));
      if (existingMap.size > 0) {
        const p: Student[] = [], a: Student[] = [];
        students.forEach((s) => {
          existingMap.get(s.id) === false ? a.push(s) : p.push(s);
        });
        setPresent(p); setAbsent(a);
      } else {
        setPresent(students); setAbsent([]);

        const entries = students.map((s) => ({ studentId: s.id, present: true }));
        await bulkMarkAttendance(selectedLesson.id, date, entries);
      }
    } catch { toast.error("Failed to load."); }
    finally { setLoading(false); }
  };

  const markAllPresent = () => {
    setPresent([...present, ...absent]);
    setAbsent([]);
    handleSave();
  };
  const markAllAbsent = () => {
    setAbsent([...absent, ...present]);
    setPresent([]);
    handleSave();
  };
  const reset = () => {
    const all = [...present, ...absent];
    setPresent(all);
    setAbsent([]);
    handleSave();
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    const col = present.find((s) => s.id === active.id)
      ? "present"
      : "absent";
    const student =
      present.find((s) => s.id === active.id) ??
      absent.find((s) => s.id === active.id);
    setDraggingId(active.id as string);
    setDraggingStudent(student ?? null);
    setDraggingFromCol(col);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingId(null);
    setDraggingStudent(null);
    setDraggingFromCol(null);
    if (!over) return;

    const targetCol = over.id as Column;
    const sid = active.id as string;

    let newPresent = [...present];
    let newAbsent = [...absent];

    if (targetCol === "present" && absent.some((s) => s.id === sid)) {
      const student = absent.find((s) => s.id === sid)!;
      newAbsent = absent.filter((s) => s.id !== sid);
      newPresent = [...present, student];
      setAbsent(newAbsent);
      setPresent(newPresent);
    } else if (targetCol === "absent" && present.some((s) => s.id === sid)) {
      const student = present.find((s) => s.id === sid)!;
      newPresent = present.filter((s) => s.id !== sid);
      newAbsent = [...absent, student];
      setPresent(newPresent);
      setAbsent(newAbsent);
    }

    handleSave(newPresent, newAbsent);
  };

  const handleSave = (presentOverride?: Student[], absentOverride?: Student[]) => {
    if (!selectedLesson) return;
    const currentPresent = presentOverride ?? present;
    const currentAbsent = absentOverride ?? absent;
    const entries: BulkAttendanceEntry[] = [
      ...currentPresent.map((s) => ({ studentId: s.id, present: true })),
      ...currentAbsent.map((s) => ({ studentId: s.id, present: false })),
    ];
    startTransition(async () => {
      const res = await bulkMarkAttendance(
        selectedLesson.id,
        selectedDate,
        entries
      );
      if (res.success) {
        toast.success(`Attendance saved  ${currentPresent.length} present, ${currentAbsent.length} absent.`);
      } else {
        toast.error(res.error ?? "Failed to save.");
      }
    });
  };

  const allStudents = [...present, ...absent];
  const total = allStudents.length;

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
        <h2 className="text-[16px] font-bold text-foreground">Attendance Records</h2>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <BookOpen size={11} /> Lesson
            </label>
            <select
              className="h-10 px-3 rounded-lg bg-background border border-border text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              onChange={(e) => handleLessonChange(parseInt(e.target.value))}
              defaultValue=""
            >
              <option value="" disabled>Select a lesson…</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}  {l.class.name} ({l.subject.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Calendar size={11} /> Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="h-10 px-3 rounded-lg bg-background border border-border text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {selectedLesson && total > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={markAllPresent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-[12px] font-semibold hover:bg-green-500/20 transition-all border border-green-500/20"
            >
              <CheckCheck size={13} /> Mark All Present
            </button>
            <button
              onClick={markAllAbsent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[12px] font-semibold hover:bg-red-500/20 transition-all border border-red-500/20"
            >
              <XCircle size={13} /> Mark All Absent
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[12px] font-semibold hover:bg-muted/80 transition-all"
            >
              <RotateCcw size={12} /> Reset
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">
                <span className="font-bold text-green-500">{present.length}</span> / {total} present
              </span>
              {isPending && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            </div>
          </div>
        )}
      </div>

      {!selectedLesson ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border border-dashed border-border rounded-2xl gap-3">
          <Users size={40} className="opacity-20" />
          <p className="text-[14px]">Select a lesson to start taking attendance</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 size={24} className="animate-spin mr-2" /> Loading students…
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 flex-col lg:flex-row">
            <KanbanColumn
              id="present"
              title="Present"
              students={present}
              icon={<CheckCircle2 size={15} className="text-green-500" />}
              accent="text-green-600 dark:text-green-400"
              draggingId={draggingId}
            />
            <KanbanColumn
              id="absent"
              title="Absent"
              students={absent}
              icon={<XCircle size={15} className="text-red-400" />}
              accent="text-red-500 dark:text-red-400"
              draggingId={draggingId}
            />
          </div>

          <DragOverlay>
            {draggingStudent ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-primary shadow-xl opacity-95 cursor-grabbing">
                <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground shrink-0">
                  {draggingStudent.name[0]}{draggingStudent.surname[0]}
                </div>
                <span className="text-[13px] font-medium text-foreground truncate">
                  {draggingStudent.name} {draggingStudent.surname}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
