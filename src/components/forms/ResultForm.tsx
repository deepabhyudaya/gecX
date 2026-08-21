"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Dispatch, SetStateAction, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import InputField from "../InputField";
import { resultSchema, ResultSchema } from "@/lib/formValidationSchemas";
import { createResult, updateResult } from "@/lib/actions";

const ResultForm = ({
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
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createResult : updateResult;
      const result = await action({ success: false, error: false }, formData);
      if (result.success) {
        toast(`Result has been ${type === "create" ? "created" : "updated"}!`);
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

  const students: { id: string; name: string; surname: string }[] = relatedData?.students ?? [];
  const exams: { id: number; title: string }[] = relatedData?.exams ?? [];
  const assignments: { id: number; title: string }[] = relatedData?.assignments ?? [];

  const sel = "p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all focus:ring-1 focus:ring-blue-500";
  const lbl = "text-xs font-medium text-muted-foreground";
  const err = "text-xs text-red-400 mt-0.5";

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new result" : "Update result"}
      </h1>

      {type === "update" && (
        <p className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-md">
          ⚠️ Note: If this result is synced with a Dynamic Form submission, please evaluate it in the{" "}
          <a href="/list/forms" className="underline font-bold">Forms Center</a> to ensure responses match.
        </p>
      )}

      {data && (
        <InputField label="Id" name="id" defaultValue={data?.id} register={register} error={errors?.id} hidden />
      )}

      <div className="flex flex-wrap gap-4">
        <InputField
          label="Score (0–100)"
          name="score"
          defaultValue={data?.score}
          register={register}
          error={errors?.score}
          type="number"
        />
      </div>

      <div className="flex flex-col gap-1 w-full">
        <label className={lbl}>Student</label>
        <select className={sel} {...register("studentId")} defaultValue={data?.studentId ?? ""}>
          <option value="" disabled>Select student…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name} {s.surname}</option>
          ))}
        </select>
        {errors.studentId?.message && <p className={err}>{errors.studentId.message.toString()}</p>}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1 w-full md:w-[45%]">
          <label className={lbl}>Exam (optional)</label>
          <select className={sel} {...register("examId")} defaultValue={data?.examId ?? ""}>
            <option value="">  None  </option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
          {errors.examId?.message && <p className={err}>{errors.examId.message.toString()}</p>}
        </div>
        <div className="flex flex-col gap-1 w-full md:w-[45%]">
          <label className={lbl}>Assignment (optional)</label>
          <select className={sel} {...register("assignmentId")} defaultValue={data?.assignmentId ?? ""}>
            <option value="">  None  </option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
          {errors.assignmentId?.message && <p className={err}>{errors.assignmentId.message.toString()}</p>}
        </div>
      </div>

      <p className="text-xs text-white/40">
        Note: A result must be linked to either an exam or an assignment (or both).
      </p>

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
        {loading ? "Saving..." : type === "create" ? "Create Result" : "Update Result"}
      </button>
    </form>
  );
};

export default ResultForm;
