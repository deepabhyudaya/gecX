"use client";

import { useFormState } from "react-dom";
import { useEffect, useOptimistic, useTransition } from "react";
import { markLectureComplete } from "@/lib/courseActions";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  lectureId: number;
  courseSlug: string;
  initialCompleted: boolean;
}

export default function MarkCompleteButton({ lectureId, courseSlug, initialCompleted }: Props) {
  const [state, action] = useFormState(markLectureComplete, { success: false, error: false });

  const [optimisticDone, setOptimistic] = useOptimistic<boolean>(initialCompleted);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.error) toast.error("Could not save progress.");
  }, [state]);

  function handleAction(formData: FormData) {
    startTransition(() => {
      setOptimistic((v) => !v);
      action(formData);
    });
  }

  return (
    <form action={handleAction}>
      <input type="hidden" name="lectureId" value={lectureId} />
      <input type="hidden" name="courseSlug" value={courseSlug} />
      <input type="hidden" name="completed" value={String(initialCompleted)} />
      <button
        type="submit"
        title={optimisticDone ? "Mark incomplete" : "Mark as complete"}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-semibold border transition-all ${optimisticDone
            ? "bg-green-600/10 text-green-500 border-green-600/30 hover:bg-green-600/20"
            : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
          }`}
      >
        {optimisticDone ? (
          <CheckCircle2 size={16} className="shrink-0" />
        ) : (
          <Circle size={16} className="shrink-0" />
        )}
        {optimisticDone ? "Completed" : "Mark Complete"}
      </button>
    </form>
  );
}
