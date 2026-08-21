"use client";

import {
  deleteAssignment,
  deleteClass,
  deleteExam,
  deleteLesson,
  deleteResult,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
  deleteEvent,
  deleteAttendance,
  deleteAnnouncement,
  deleteParent,
  deleteGrade,
  deleteCollege,
} from "@/lib/actions";
import dynamic from "next/dynamic";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";

const deleteActionMap = {
  subject:      deleteSubject,
  class:        deleteClass,
  teacher:      deleteTeacher,
  student:      deleteStudent,
  exam:         deleteExam,
  parent:       deleteParent,
  grade:        deleteGrade,
  college:      deleteCollege,
  lesson:       deleteLesson,
  assignment:   deleteAssignment,
  result:       deleteResult,
  attendance:   deleteAttendance,
  event:        deleteEvent,
  announcement: deleteAnnouncement,
};

const TeacherForm      = dynamic(() => import("./forms/TeacherForm"),      { loading: () => <Skeleton /> });
const StudentForm      = dynamic(() => import("./forms/StudentForm"),      { loading: () => <Skeleton /> });
const SubjectForm      = dynamic(() => import("./forms/SubjectForm"),      { loading: () => <Skeleton /> });
const ClassForm        = dynamic(() => import("./forms/ClassForm"),        { loading: () => <Skeleton /> });
const ExamForm         = dynamic(() => import("./forms/ExamForm"),         { loading: () => <Skeleton /> });
const EventForm        = dynamic(() => import("./forms/EventForm"),        { loading: () => <Skeleton /> });
const AttendanceForm   = dynamic(() => import("./forms/AttendanceForm"),   { loading: () => <Skeleton /> });
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), { loading: () => <Skeleton /> });
const LessonForm       = dynamic(() => import("./forms/LessonForm"),       { loading: () => <Skeleton /> });
const AssignmentForm   = dynamic(() => import("./forms/AssignmentForm"),   { loading: () => <Skeleton /> });
const ResultForm       = dynamic(() => import("./forms/ResultForm"),       { loading: () => <Skeleton /> });
const ParentForm       = dynamic(() => import("./forms/ParentForm"),       { loading: () => <Skeleton /> });
const GradeForm        = dynamic(() => import("./forms/GradeForm"),        { loading: () => <Skeleton /> });
const CollegeForm      = dynamic(() => import("./forms/CollegeForm"),      { loading: () => <Skeleton /> });

const Skeleton = () => (
  <div className="p-6 space-y-3 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-10 rounded-lg bg-muted" />
    ))}
  </div>
);

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject:      (s, t, d, r) => <SubjectForm      type={t} data={d} setOpen={s} relatedData={r} />,
  class:        (s, t, d, r) => <ClassForm        type={t} data={d} setOpen={s} relatedData={r} />,
  teacher:      (s, t, d, r) => <TeacherForm      type={t} data={d} setOpen={s} relatedData={r} />,
  student:      (s, t, d, r) => <StudentForm      type={t} data={d} setOpen={s} relatedData={r} />,
  exam:         (s, t, d, r) => <ExamForm         type={t} data={d} setOpen={s} relatedData={r} />,
  event:        (s, t, d, r) => <EventForm        type={t} data={d} setOpen={s} relatedData={r} />,
  attendance:   (s, t, d, r) => <AttendanceForm   type={t} data={d} setOpen={s} relatedData={r} />,
  announcement: (s, t, d, r) => <AnnouncementForm type={t} data={d} setOpen={s} relatedData={r} />,
  lesson:       (s, t, d, r) => <LessonForm       type={t} data={d} setOpen={s} relatedData={r} />,
  assignment:   (s, t, d, r) => <AssignmentForm   type={t} data={d} setOpen={s} relatedData={r} />,
  result:       (s, t, d, r) => <ResultForm       type={t} data={d} setOpen={s} relatedData={r} />,
  parent:       (s, t, d, r) => <ParentForm       type={t} data={d} setOpen={s} relatedData={r} />,
  grade:        (s, t, d, r) => <GradeForm        type={t} data={d} setOpen={s} relatedData={r} />,
  college:      (s, t, d, r) => <CollegeForm      type={t} data={d} setOpen={s} relatedData={r} />,
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const iconMap = {
    create: { icon: Plus,   btnClass: "bg-primary hover:bg-primary/90 text-primary-foreground",            size: "w-8 h-8" },
    update: { icon: Pencil, btnClass: "bg-muted hover:bg-muted/80 text-foreground border border-border", size: "w-7 h-7" },
    delete: { icon: Trash2, btnClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",            size: "w-7 h-7" },
  };
  const { icon: Icon, btnClass, size } = iconMap[type];
  const [open, setOpen] = useState(false);

  const label =
    type === "create" ? `New ${table}` :
    type === "update" ? `Edit ${table}` :
    `Delete ${table}`;

  const DeleteForm = () => {
    const [state, formAction] = useFormState(deleteActionMap[table], {
      success: false,
      error:   false,
    });
    const router = useRouter();
    useEffect(() => {
      if (state.success) {
        toast(`${table} deleted`);
        setOpen(false);
        router.refresh();
      }
    }, [state, router]);

    return (
      <>
        <div className="px-6 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            This action is permanent. Are you sure you want to delete this{" "}
            <span className="font-semibold text-foreground">{table}</span>?
          </p>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <button className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 border border-border transition-colors">
              Cancel
            </button>
          </DrawerClose>
          <form action={formAction} className="flex-1">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Yes, delete
            </button>
          </form>
        </DrawerFooter>
      </>
    );
  };

  const ContentForm = () =>
    forms[table]
      ? forms[table](setOpen, type as "create" | "update", data, relatedData)
      : <p className="p-6 text-sm text-muted-foreground">Form not found for &quot;{table}&quot;</p>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${size} flex items-center justify-center rounded-full transition-colors duration-150 ${btnClass}`}
        aria-label={label}
      >
        <Icon size={type === "create" ? 16 : 14} strokeWidth={2} />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[92vh] bg-background text-foreground border-border">
          <DrawerHeader>
            <DrawerTitle className="capitalize">{label}</DrawerTitle>
          </DrawerHeader>

          <div
            data-vaul-no-drag
            className="overflow-y-auto flex-1 p-6 md:p-8 w-full max-w-4xl mx-auto [&_form]:flex [&_form]:flex-col [&_form]:gap-8 [&_input[type=date]]:bg-background [&_input[type=date]]:text-foreground [&_input[type=date]]:shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:[&_input[type=date]]:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] [&_input[type=date]]:rounded-[6px] [&_input[type=date]]:px-3 [&_input[type=date]]:max-h-[40px] [&_select]:bg-background [&_select]:text-foreground [&_select]:shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:[&_select]:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] [&_select]:rounded-[6px] [&_select]:px-3 [&_select]:py-2.5 [&_select]:w-full [&_select]:outline-none [&_select]:focus:ring-1 [&_select]:focus:ring-ring [&_button:not([aria-label])]:mt-4 [&_button:not([aria-label])]:w-full [&_button:not([aria-label])]:bg-primary [&_button:not([aria-label])]:text-primary-foreground [&_button:not([aria-label])]:py-2.5 [&_button:not([aria-label])]:rounded-[6px] [&_button:not([aria-label])]:font-medium [&_button:not([aria-label])]:hover:bg-primary/90 [&_button:not([aria-label])]:transition-colors"
          >
            {type === "delete" ? <DeleteForm /> : <ContentForm />}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default FormModal;
