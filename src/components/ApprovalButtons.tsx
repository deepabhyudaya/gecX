"use client";

import { useFormState } from "react-dom";
import { approveCourse, rejectCourse } from "@/lib/courseActions";
import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "react-toastify";

const ApprovalButtons = ({ id }: { id: number }) => {
  const [approveState, approveAction] = useFormState(approveCourse, {
    success: false,
    error: false,
  });

  const [rejectState, rejectAction] = useFormState(rejectCourse, {
    success: false,
    error: false,
  });

  useEffect(() => {
    if (approveState.success) {
      toast.success("Course approved!");
    }
    if (approveState.error) {
      toast.error("Something went wrong!");
    }
  }, [approveState]);

  useEffect(() => {
    if (rejectState.success) {
      toast.success("Course rejected!");
    }
    if (rejectState.error) {
      toast.error("Something went wrong!");
    }
  }, [rejectState]);

  return (
    <div className="flex items-center gap-2">
      <form action={approveAction}>
        <input type="hidden" name="id" value={id} />
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full bg-green-600 hover:bg-green-500 transition-colors text-white"
          title="Approve"
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
      </form>
      <form action={rejectAction}>
        <input type="hidden" name="id" value={id} />
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 transition-colors text-white"
          title="Reject"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
};

export default ApprovalButtons;
