"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { Dispatch, SetStateAction, useState } from "react";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { Upload } from "lucide-react";

const TeacherForm = ({
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
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
  });

  const [img, setImg] = useState<any>(data?.img ? { secure_url: data.img } : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const router = useRouter();

  const onSubmit = handleSubmit(async (formData) => {
    setLoading(true);
    setError(false);
    try {
      const action = type === "create" ? createTeacher : updateTeacher;
      const result = await action({ success: false, error: false }, { ...formData, img: img?.secure_url });
      if (result.success) {
        toast(`Teacher has been ${type === "create" ? "created" : "updated"}!`);
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

  const { subjects, colleges = [] } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create a new teacher" : "Update the teacher"}
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
          <label className="text-xs font-medium text-muted-foreground">Subjects</label>
          <select
            multiple
            className="p-2 rounded-md text-sm w-full bg-muted text-foreground border border-border outline-none focus:ring-2 focus:ring-foreground/20 transition-all"
            {...register("subjects")}
            defaultValue={data?.subjects}
          >
            {subjects.map((subject: { id: number; name: string }) => (
              <option value={subject.id} key={subject.id} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded">
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjects?.message && (
            <p className="text-xs text-red-400">
              {errors.subjects.message.toString()}
            </p>
          )}
        </div>
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
      </div>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Faculty Identity
      </span>
      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Employee ID"
          name="employeeId"
          defaultValue={data?.employeeId ?? ""}
          register={register}
          error={errors?.employeeId as any}
        />
        <InputField
          label="Designation (e.g. Asst. Professor)"
          name="designation"
          defaultValue={data?.designation ?? ""}
          register={register}
          error={errors?.designation as any}
        />
        <InputField
          label="Department"
          name="department"
          defaultValue={data?.department ?? ""}
          register={register}
          error={errors?.department as any}
        />
        <InputField
          label="Qualification"
          name="qualification"
          defaultValue={data?.qualification ?? ""}
          register={register}
          error={errors?.qualification as any}
        />
        <InputField
          label="Experience (years)"
          name="experienceYears"
          type="number"
          defaultValue={data?.experienceYears ?? ""}
          register={register}
          error={errors?.experienceYears as any}
        />
        <InputField
          label="Joining Date"
          name="joiningDate"
          type="date"
          defaultValue={data?.joiningDate ? new Date(data.joiningDate).toISOString().split("T")[0] : ""}
          register={register}
          error={errors?.joiningDate as any}
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

export default TeacherForm;
