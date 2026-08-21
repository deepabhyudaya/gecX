"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Loader2, Timer, CheckCircle2, Clock, Award } from "lucide-react";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AiHintButton } from "@/components/form-builder/AiHintButton";
import { submitFormResponse } from "@/actions/form.actions";

interface FormAttemptWorkspaceProps {
  form: {
    id: string;
    title: string;
    description: string | null;
    type: "GENERAL" | "EXAM" | "ASSIGNMENT";
    status: "DRAFT" | "PUBLISHED";
    timeLimit: number | null;
    dueDate: Date | null;
    allowMultiple: boolean;
    questions: Array<{
      id: string;
      type: string;
      title: string;
      description: string | null;
      isRequired: boolean;
      order: number;
      points: number | null;
      options: Array<{
        id: string;
        text: string;
        order: number;
      }>;
    }>;
  };
}

export default function FormAttemptWorkspace({ form }: FormAttemptWorkspaceProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ score: number | null; autoGraded: boolean } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (form.timeLimit && !submitted) {
      const storedStartTimeKey = `form_start_${form.id}`;
      let startTime = localStorage.getItem(storedStartTimeKey);
      if (!startTime) {
        startTime = String(Date.now());
        localStorage.setItem(storedStartTimeKey, startTime);
      }

      const elapsedSeconds = Math.floor((Date.now() - Number(startTime)) / 1000);
      const totalSeconds = form.timeLimit * 60;
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);

      setTimeLeft(remaining);
    }
  }, [form.timeLimit, form.id, submitted]);

  useEffect(() => {
    if (timeLeft === null || submitted) return;

    if (timeLeft <= 0) {
      toast.warning("Time is up! Auto-submitting your answers...");
      handleSubmit(onSubmit)();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const schemaShape: Record<string, any> = {};
  form.questions.forEach((q) => {
    if (["SINGLE_CHOICE", "DROPDOWN"].includes(q.type)) {
      let validator = z.string();
      if (q.isRequired) {
        validator = validator.min(1, "Selection is required");
      } else {
        validator = validator.optional() as any;
      }
      schemaShape[q.id] = validator;
    } else if (q.type === "MULTI_CHOICE") {
      let validator = z.array(z.string());
      if (q.isRequired) {
        validator = validator.min(1, "At least one selection is required");
      }
      schemaShape[q.id] = validator;
    } else {
      let validator = z.string();
      if (q.isRequired) {
        validator = validator.min(1, "This field is required");
      } else {
        validator = validator.optional() as any;
      }
      schemaShape[q.id] = validator;
    }
  });

  const formSchema = z.object(schemaShape);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: form.questions.reduce((acc: any, q) => {
      acc[q.id] = q.type === "MULTI_CHOICE" ? [] : "";
      return acc;
    }, {}),
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      const answers = Object.entries(values).map(([questionId, val]) => {
        const question = form.questions.find((q) => q.id === questionId);
        const isArray = Array.isArray(val);
        return {
          questionId,
          textResponse: isArray ? null : (val as string),
          selectedOptionIds: isArray ? (val as string[]) : val ? [val as string] : [],
        };
      });

      const res = await submitFormResponse({
        formId: form.id,
        answers,
      });

      if (res.success) {
        toast.success("Response submitted successfully!");
        localStorage.removeItem(`form_start_${form.id}`);
        setScoreResult({ score: res.score ?? null, autoGraded: res.autoGraded ?? false });
        setSubmitted(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit response");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (questionId: string, optionId: string, checked: boolean) => {
    const currentValues: string[] = watch(questionId) || [];
    if (checked) {
      setValue(questionId, [...currentValues, optionId]);
    } else {
      setValue(
        questionId,
        currentValues.filter((id) => id !== optionId)
      );
    }
  };

  if (submitted) {
    return (
      <Card className="max-w-xl mx-auto bg-card border-border shadow-md mt-10">
        <CardHeader className="text-center py-8 space-y-2 border-b border-border/40">
          <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-500">
            <CheckCircle2 size={36} />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">Submitted Successfully!</CardTitle>
          <CardDescription>
            Your answers have been stored and processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center space-y-6">
          {form.type !== "GENERAL" && scoreResult && (
            <div className="p-5 bg-muted/30 border border-border/60 rounded-xl max-w-sm mx-auto space-y-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Assessment Result</span>
              {scoreResult.autoGraded ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2 text-foreground font-black text-3xl">
                    <Award className="text-primary h-7 w-7" />
                    <span>{scoreResult.score}%</span>
                  </div>
                  <span className="text-xs text-muted-foreground block">Auto-graded result score recorded</span>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <Clock className="mx-auto text-yellow-500 h-6 w-6 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground block">Pending Manual Evaluation</span>
                  <span className="text-[11px] text-muted-foreground block">Your auto-graded portion score is {scoreResult.score}%</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {form.type === "GENERAL"
              ? "Thank you for taking the time to complete this survey/feedback form."
              : "Your score has been updated in the results center."}
          </p>

          <Button onClick={() => window.location.reload()} className="w-full bg-primary text-primary-foreground font-semibold">
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 relative">
      {timeLeft !== null && (
        <div className="sticky top-4 z-30 flex items-center justify-between p-3 rounded-lg bg-card border border-primary/20 shadow-md text-foreground max-w-xs mx-auto">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">Time Remaining:</span>
          </div>
          <span className={`text-sm font-black tracking-wider ${timeLeft < 60 ? "text-red-500 animate-bounce" : "text-primary"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      )}

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="space-y-1.5 border-b border-border/40 pb-4">
          <CardTitle className="text-2xl font-black text-foreground">{form.title}</CardTitle>
          {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
        </CardHeader>
        <CardContent className="p-4 bg-muted/10 flex items-center justify-between flex-wrap gap-2 text-[11px] text-muted-foreground">
          <span>Type: <span className="font-bold text-foreground uppercase">{form.type}</span></span>
          {form.dueDate && (
            <span>Deadline: <span className="font-bold text-foreground">{new Date(form.dueDate).toLocaleString()}</span></span>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {form.questions.map((q) => {
          const errorMsg = errors[q.id]?.message as string;
          return (
            <Card key={q.id} className="bg-card border-border shadow-sm">
              <CardHeader className="py-3.5 border-b border-border/40 flex flex-row items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground">
                    {q.title}
                    {q.isRequired && <span className="text-red-500 ml-1 font-bold">*</span>}
                  </h3>
                  {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}
                </div>
                {q.points !== null && q.points > 0 && (
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full shrink-0">
                    {q.points} pts
                  </span>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {q.type === "SHORT_TEXT" && (
                  <Input
                    {...register(q.id)}
                    placeholder="Your short answer here..."
                    className="h-9 text-xs bg-muted/20 border-border text-foreground"
                  />
                )}

                {q.type === "LONG_TEXT" && (
                  <Textarea
                    {...register(q.id)}
                    placeholder="Your paragraph answer here..."
                    className="text-xs bg-muted/20 border-border text-foreground min-h-[100px] resize-y"
                  />
                )}

                {q.type === "DATE" && (
                  <Input
                    type="date"
                    {...register(q.id)}
                    className="h-9 text-xs bg-muted/20 border-border text-foreground [color-scheme:dark]"
                  />
                )}

                {q.type === "RATING" && (
                  <div className="flex items-center gap-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setValue(q.id, String(val))}
                        className={`h-9 w-9 rounded-md border text-xs font-black transition-colors ${
                          watch(q.id) === String(val)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "DROPDOWN" && (
                  <Select onValueChange={(val) => setValue(q.id, val)}>
                    <SelectTrigger className="h-9 text-xs bg-muted/20 border-border text-foreground">
                      <SelectValue placeholder="Choose option..." />
                    </SelectTrigger>
                    <SelectContent>
                      {q.options.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {q.type === "SINGLE_CHOICE" && (
                  <div className="space-y-2">
                    {q.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setValue(q.id, opt.id)}
                          className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            watch(q.id) === opt.id
                              ? "border-primary bg-primary"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          {watch(q.id) === opt.id && (
                            <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                          )}
                        </button>
                        <span className="text-xs text-foreground cursor-pointer" onClick={() => setValue(q.id, opt.id)}>
                          {opt.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "MULTI_CHOICE" && (
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const vals: string[] = watch(q.id) || [];
                      const checked = vals.includes(opt.id);
                      return (
                        <div key={opt.id} className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleCheckboxChange(q.id, opt.id, !checked)}
                            className={`h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              checked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border hover:bg-muted/40 text-transparent"
                            }`}
                          >
                            <CheckCircle2 size={11} className="stroke-[3]" />
                          </button>
                          <span className="text-xs text-foreground cursor-pointer" onClick={() => handleCheckboxChange(q.id, opt.id, !checked)}>
                            {opt.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {errorMsg && <p className="text-xs text-red-500 mt-1 font-medium">{errorMsg}</p>}

                {(form.type === "ASSIGNMENT" || form.type === "EXAM") && (
                  <div className="mt-3 pt-3 border-t border-border/40">
                    <AiHintButton questionTitle={q.title} questionDescription={q.description} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 h-10 shadow-sm"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit Answers
        </Button>
      </form>
    </div>
  );
}
