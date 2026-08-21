"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  classSchema,
  ClassSchema,
  subjectSchema,
  SubjectSchema,
} from "@/lib/formValidationSchemas";
import {
  createClass,
  updateClass,
} from "@/lib/actions";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const ClassForm = ({
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
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createClass : updateClass;
      const result = await action({ success: false, error: false }, formData);
      if (result.success) {
        toast(`Branch has been ${type === "create" ? "created" : "updated"}!`);
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

  const { teachers, grades, colleges = [] } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new branch" : "Update the branch"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Branch name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Capacity"
          name="capacity"
          defaultValue={data?.capacity}
          register={register}
          error={errors?.capacity}
        />
        {data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs font-medium text-muted-foreground">Supervisor</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("supervisorId")}
            defaultValue={data?.teachers}
          >
            {teachers.map(
              (teacher: { id: string; name: string; surname: string }) => (
                <option
                  value={teacher.id}
                  key={teacher.id}
                  selected={data && teacher.id === data.supervisorId}
                >
                  {teacher.name + " " + teacher.surname}
                </option>
              )
            )}
          </select>
          {errors.supervisorId?.message && (
            <p className="text-xs text-red-400">
              {errors.supervisorId.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs font-medium text-muted-foreground">Year</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("gradeId")}
            defaultValue={data?.gradeId}
          >
            {grades.map((grade: { id: number; level: number }) => (
              <option
                value={grade.id}
                key={grade.id}
                selected={data && grade.id === data.gradeId}
              >
                {grade.level}
              </option>
            ))}
          </select>
          {errors.gradeId?.message && (
            <p className="text-xs text-red-400">
              {errors.gradeId.message.toString()}
            </p>
          )}
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Branch Metadata
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Branch Code (e.g. CSE)"
          name="branchCode"
          defaultValue={data?.branchCode}
          register={register}
          error={errors?.branchCode as any}
        />
        <InputField
          label="Department"
          name="department"
          defaultValue={data?.department}
          register={register}
          error={errors?.department as any}
        />
        <InputField
          label="Total Semesters"
          name="totalSemesters"
          type="number"
          defaultValue={data?.totalSemesters ?? 8}
          register={register}
          error={errors?.totalSemesters as any}
        />
        <InputField
          label="Intake Capacity"
          name="intakeCapacity"
          type="number"
          defaultValue={data?.intakeCapacity ?? undefined}
          register={register}
          error={errors?.intakeCapacity as any}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs font-medium text-muted-foreground">College</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("collegeId")}
            defaultValue={data?.collegeId ?? ""}
          >
            <option value="">— None —</option>
            {colleges.map((c: { id: string; name: string; shortName: string | null }) => (
              <option key={c.id} value={c.id}>
                {c.shortName ? `${c.shortName} — ${c.name}` : c.name}
              </option>
            ))}
          </select>
          {errors.collegeId?.message && (
            <p className="text-xs text-red-400">{errors.collegeId.message.toString()}</p>
          )}
        </div>
      </div>
      {error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button disabled={loading} className="bg-primary text-primary-foreground p-2 rounded-md disabled:opacity-60">
        {loading ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ClassForm;
