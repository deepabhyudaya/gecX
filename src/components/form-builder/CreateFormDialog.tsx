"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-toastify";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createForm } from "@/actions/form.actions";

const createFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["GENERAL", "EXAM", "ASSIGNMENT"]),
  examId: z.string().optional(),
  assignmentId: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

interface CreateFormDialogProps {
  exams: Array<{ id: number; title: string }>;
  assignments: Array<{ id: number; title: string }>;
}

export function CreateFormDialog({ exams, assignments }: CreateFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      type: "GENERAL",
    },
  });

  const formType = watch("type");

  const onSubmit = async (values: CreateFormValues) => {
    setLoading(true);
    try {
      const res = await createForm({
        title: values.title,
        description: values.description || null,
        type: values.type,
        examId: values.type === "EXAM" && values.examId ? parseInt(values.examId) : null,
        assignmentId: values.type === "ASSIGNMENT" && values.assignmentId ? parseInt(values.assignmentId) : null,
      });

      if (res.success) {
        toast.success("Form created successfully!");
        setOpen(false);
        reset();
        router.push(`/list/forms/builder/${res.formId}`);
      } else {
        toast.error("Failed to create form");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 rounded-full h-9 bg-primary text-primary-foreground font-semibold px-4">
          <Plus size={16} />
          Create Form
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>New Dynamic Form</DialogTitle>
          <DialogDescription>
            Configure your form metadata. You will build and arrange questions on the next screen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Form Title</Label>
            <Input id="title" {...register("title")} placeholder="Enter title" />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input id="description" {...register("description")} placeholder="Enter description" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Form Type</Label>
            <Select
              defaultValue="GENERAL"
              onValueChange={(val) => setValue("type", val as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GENERAL">General Survey / RSVP</SelectItem>
                <SelectItem value="EXAM">Exam Form</SelectItem>
                <SelectItem value="ASSIGNMENT">Assignment Form</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formType === "EXAM" && (
            <div className="space-y-1.5">
              <Label htmlFor="examId">Link to Scheduled Exam</Label>
              <Select onValueChange={(val) => setValue("examId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formType === "ASSIGNMENT" && (
            <div className="space-y-1.5">
              <Label htmlFor="assignmentId">Link to Scheduled Assignment</Label>
              <Select onValueChange={(val) => setValue("assignmentId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create & Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
