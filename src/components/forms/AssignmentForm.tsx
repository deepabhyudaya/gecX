"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import InputField from "../InputField";
import { assignmentSchema, AssignmentSchema } from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";

const AssignmentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createAssignment : updateAssignment;
      const result = await action({ success: false, error: false }, formData);
      if (result.success) {
        toast(`Assignment has been ${type === "create" ? "created" : "updated"}!`);
        setOpen(false);
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  });

  const lessons: { id: number; name: string }[] = relatedData?.lessons ?? [];

  const sel = "p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all focus:ring-1 focus:ring-blue-500";
  const lbl = "text-xs font-medium text-muted-foreground";
  const err = "text-xs text-red-400 mt-0.5";

  const toDatetimeLocal = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new assignment" : "Update assignment"}
      </h1>

      {data && (
        <InputField label="Id" name="id" defaultValue={data?.id} register={register} error={errors?.id} hidden />
      )}

      <div className="flex flex-wrap gap-4">
        <InputField
          label="Assignment title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1 w-full md:w-[45%]">
          <label className={lbl}>Start date</label>
          <input
            type="datetime-local"
            className={sel}
            {...register("startDate")}
            defaultValue={toDatetimeLocal(data?.startDate)}
            onClick={(e) => (e.target as any).showPicker?.()}
          />
          {errors.startDate?.message && <p className={err}>{errors.startDate.message.toString()}</p>}
        </div>
        <div className="flex flex-col gap-1 w-full md:w-[45%]">
          <label className={lbl}>Due date</label>
          <input
            type="datetime-local"
            className={sel}
            {...register("dueDate")}
            defaultValue={toDatetimeLocal(data?.dueDate)}
            onClick={(e) => (e.target as any).showPicker?.()}
          />
          {errors.dueDate?.message && <p className={err}>{errors.dueDate.message.toString()}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1 w-full md:w-1/2">
        <label className={lbl}>Lesson</label>
        <select className={sel} {...register("lessonId")} defaultValue={data?.lessonId ?? ""}>
          <option value="" disabled>Select lesson…</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        {errors.lessonId?.message && <p className={err}>{errors.lessonId.message.toString()}</p>}
      </div>

      {error && (
        <span className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
          Something went wrong! Please check all fields and try again.
        </span>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-primary hover:bg-primary/90 transition-colors text-primary-foreground font-medium py-2.5 rounded-md text-sm disabled:opacity-60"
      >
        {loading ? "Saving..." : type === "create" ? "Create Assignment" : "Update Assignment"}
      </button>
    </form>
  );
};

export default AssignmentForm;
