"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useState } from "react";
import {
  studentSchema,
  StudentSchema,
} from "@/lib/formValidationSchemas";
import {
  createStudent,
  updateStudent,
} from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { Upload } from "lucide-react";

const StudentForm = ({
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
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
  });

  const [img, setImg] = useState<any>(data?.img ? { secure_url: data.img } : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createStudent : updateStudent;
      const result = await action({ success: false, error: false }, { ...formData, img: img?.secure_url });
      if (result.success) {
        toast(`Student has been ${type === "create" ? "created" : "updated"}!`);
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

  const { grades, classes, colleges = [] } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new student" : "Update the student"}
      </h1>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Authentication Information
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          defaultValue={data?.password}
          register={register}
          error={errors?.password}
        />
      </div>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Personal Information
      </span>
      <CldUploadWidget
        uploadPreset="college"
        onSuccess={(result, { widget }) => {
          setImg(result.info);
          widget.close();
        }}
      >
        {({ open }) => (
          <div
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => open()}
          >
            <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
              {img?.secure_url ? (
                <Image src={img.secure_url} alt="" width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {img?.secure_url ? "Change photo" : "Upload a photo"}
            </span>
          </div>
        )}
      </CldUploadWidget>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="First Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Last Name"
          name="surname"
          defaultValue={data?.surname}
          register={register}
          error={errors.surname}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        <InputField
          label="Blood Type"
          name="bloodType"
          defaultValue={data?.bloodType}
          register={register}
          error={errors.bloodType}
        />
        <InputField
          label="Birthday"
          name="birthday"
          defaultValue={data?.birthday ? new Date(data.birthday).toISOString().split("T")[0] : ""}
          register={register}
          error={errors.birthday}
          type="date"
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs font-medium text-muted-foreground">Parent</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("parentId")}
            defaultValue={data?.parentId}
          >
            <option value="">Select a parent</option>
            {relatedData?.parents?.map((parent: { id: string; name: string; surname: string }) => (
              <option value={parent.id} key={parent.id}>
                {parent.name} {parent.surname}
              </option>
            ))}
          </select>
          {errors.parentId?.message && (
            <p className="text-xs text-red-400">
              {errors.parentId.message.toString()}
            </p>
          )}
        </div>
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
          <label className="text-xs font-medium text-muted-foreground">Sex</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("sex")}
            defaultValue={data?.sex}
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          {errors.sex?.message && (
            <p className="text-xs text-red-400">
              {errors.sex.message.toString()}
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
              <option value={grade.id} key={grade.id}>
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs font-medium text-muted-foreground">Branch</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("classId")}
            defaultValue={data?.classId}
          >
            {classes.map(
              (classItem: {
                id: number;
                name: string;
                capacity: number;
                _count: { students: number };
              }) => (
                <option value={classItem.id} key={classItem.id}>
                  ({classItem.name} -{" "}
                  {classItem._count.students + "/" + classItem.capacity}{" "}
                  Capacity)
                </option>
              )
            )}
          </select>
          {errors.classId?.message && (
            <p className="text-xs text-red-400">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Academic Identity
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Roll Number"
          name="rollNumber"
          defaultValue={data?.rollNumber ?? ""}
          register={register}
          error={errors?.rollNumber as any}
        />
        <InputField
          label="Registration Number"
          name="registrationNumber"
          defaultValue={data?.registrationNumber ?? ""}
          register={register}
          error={errors?.registrationNumber as any}
        />
        <InputField
          label="Admission Year"
          name="admissionYear"
          type="number"
          defaultValue={data?.admissionYear ?? ""}
          register={register}
          error={errors?.admissionYear as any}
        />
        <InputField
          label="Current Semester"
          name="currentSemester"
          type="number"
          defaultValue={data?.currentSemester ?? ""}
          register={register}
          error={errors?.currentSemester as any}
        />
        <InputField
          label="Program (e.g. B.Tech)"
          name="program"
          defaultValue={data?.program ?? ""}
          register={register}
          error={errors?.program as any}
        />
        <InputField
          label="Batch (e.g. 2023-27)"
          name="batch"
          defaultValue={data?.batch ?? ""}
          register={register}
          error={errors?.batch as any}
        />
        <InputField
          label="Section (e.g. A, B)"
          name="section"
          defaultValue={data?.section ?? ""}
          register={register}
          error={errors?.section as any}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs font-medium text-muted-foreground">Hosteller</label>
          <select
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("hosteller")}
            defaultValue={data?.hosteller === true ? "true" : data?.hosteller === false ? "false" : ""}
          >
            <option value="">— Select —</option>
            <option value="true">Hosteller</option>
            <option value="false">Day Scholar</option>
          </select>
        </div>
        <InputField
          label="Guardian Name"
          name="guardianName"
          defaultValue={data?.guardianName ?? ""}
          register={register}
          error={errors?.guardianName as any}
        />
        <InputField
          label="Guardian Phone"
          name="guardianPhone"
          defaultValue={data?.guardianPhone ?? ""}
          register={register}
          error={errors?.guardianPhone as any}
        />
        <InputField
          label="Guardian Relation"
          name="guardianRelation"
          defaultValue={data?.guardianRelation ?? ""}
          register={register}
          error={errors?.guardianRelation as any}
        />
        <InputField
          label="Government ID (Aadhar / PAN)"
          name="governmentId"
          defaultValue={data?.governmentId ?? ""}
          register={register}
          error={errors?.governmentId as any}
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
        </div>
      </div>

      {error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button type="submit" disabled={loading} className="bg-primary text-primary-foreground p-2 rounded-md disabled:opacity-60">
        {loading ? "Saving..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default StudentForm;
