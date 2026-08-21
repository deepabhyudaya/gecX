"use client";

import { useFormState } from "react-dom";
import { createTicket } from "@/lib/actions";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

const SupportForm = () => {
  const [state, formAction] = useFormState(createTicket, {
    success: false,
    error: false,
  });

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success("Ticket submitted successfully!");
      formRef.current?.reset();
    }
    if (state.error) {
      toast.error("Something went wrong. Please try again.");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-foreground font-semibold text-[14px]">Subject</label>
        <input
          name="subject"
          required
          className="p-3 text-[14px] rounded-[8px] text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-transparent"
          placeholder="e.g., Forgot Password"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-foreground font-semibold text-[14px]">Description</label>
        <textarea
          name="description"
          required
          rows={4}
          className="p-3 text-[14px] rounded-[8px] text-foreground border border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none bg-transparent"
          placeholder="Provide details about your issue..."
        />
      </div>

      <button
        type="submit"
        className="mt-2 bg-primary text-primary-foreground py-3 px-4 rounded-[8px] text-[14px] font-semibold hover:opacity-90 transition-all shadow-md active:scale-[0.98]"
      >
        Submit Ticket
      </button>
    </form>
  );
};

export default SupportForm;
