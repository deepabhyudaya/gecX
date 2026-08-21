"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Plus,
  Save,
  Eye,
  Settings,
  HelpCircle,
  Clock,
  Calendar,
  CheckCircle,
  FileText,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveFormQuestions, publishForm, updateForm } from "@/actions/form.actions";

interface OptionState {
  id?: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface QuestionState {
  id?: string;
  type: "SHORT_TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTI_CHOICE" | "DROPDOWN" | "RATING" | "DATE";
  title: string;
  description: string;
  isRequired: boolean;
  order: number;
  points: number;
  options?: OptionState[];
}

interface FormBuilderWorkspaceProps {
  form: {
    id: string;
    title: string;
    description: string | null;
    type: "GENERAL" | "EXAM" | "ASSIGNMENT";
    status: "DRAFT" | "PUBLISHED";
    timeLimit: number | null;
    dueDate: Date | null;
    allowMultiple: boolean;
    examId: number | null;
    assignmentId: number | null;
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
        isCorrect: boolean;
        order: number;
      }>;
    }>;
  };
}

function SortableQuestion({
  q,
  isExamOrAssignment,
  onUpdate,
  onRemove,
}: {
  q: QuestionState;
  isExamOrAssignment: boolean;
  onUpdate: (updated: QuestionState) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: q.order });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const handleTypeChange = (type: any) => {
    const hasOptions = ["SINGLE_CHOICE", "MULTI_CHOICE", "DROPDOWN"].includes(type);
    onUpdate({
      ...q,
      type,
      options: hasOptions ? q.options || [{ text: "Option 1", isCorrect: false, order: 1 }] : undefined,
    });
  };

  const handleAddOption = () => {
    const currentOptions = q.options || [];
    onUpdate({
      ...q,
      options: [
        ...currentOptions,
        { text: `Option ${currentOptions.length + 1}`, isCorrect: false, order: currentOptions.length + 1 },
      ],
    });
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = q.options || [];
    const reordered = currentOptions
      .filter((_, i) => i !== index)
      .map((o, i) => ({ ...o, order: i + 1 }));
    onUpdate({ ...q, options: reordered });
  };

  const handleOptionChange = (index: number, fields: Partial<OptionState>) => {
    const currentOptions = q.options || [];
    const updated = currentOptions.map((o, i) => {
      if (i !== index) return o;
      return { ...o, ...fields };
    });

    if (fields.isCorrect && ["SINGLE_CHOICE", "DROPDOWN"].includes(q.type)) {
      onUpdate({
        ...q,
        options: updated.map((o, i) => ({ ...o, isCorrect: i === index })),
      });
    } else {
      onUpdate({ ...q, options: updated });
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className="bg-card border-border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 py-3 border-b border-border/40">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground shrink-0 touch-none p-1 hover:bg-muted/50 rounded transition-colors"
        >
          <GripVertical size={16} />
        </button>
        <span className="text-sm font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
          Q{q.order}
        </span>
        <div className="flex-1 min-w-0">
          <Input
            value={q.title}
            onChange={(e) => onUpdate({ ...q, title: e.target.value })}
            placeholder="Type question here..."
            className="h-8 font-semibold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-muted-foreground/50 text-foreground"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={q.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-8 w-40 text-xs bg-muted/30 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SHORT_TEXT">Short Answer</SelectItem>
              <SelectItem value="LONG_TEXT">Paragraph Text</SelectItem>
              <SelectItem value="SINGLE_CHOICE">Multiple Choice</SelectItem>
              <SelectItem value="MULTI_CHOICE">Checkboxes</SelectItem>
              <SelectItem value="DROPDOWN">Dropdown List</SelectItem>
              <SelectItem value="RATING">Rating Scale</SelectItem>
              <SelectItem value="DATE">Date Selector</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive hover:bg-destructive/10">
            <Trash2 size={15} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Help Text / Description</Label>
          <Input
            value={q.description}
            onChange={(e) => onUpdate({ ...q, description: e.target.value })}
            placeholder="Add explanation helper text..."
            className="h-8 text-xs bg-muted/20 border-border placeholder:text-muted-foreground/45"
          />
        </div>

        {["SINGLE_CHOICE", "MULTI_CHOICE", "DROPDOWN"].includes(q.type) && (
          <div className="space-y-2 border-t border-border/40 pt-3">
            <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Answer Choices</Label>
            <div className="space-y-1.5">
              {q.options?.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  {isExamOrAssignment && (
                    <button
                      type="button"
                      onClick={() => handleOptionChange(optIndex, { isCorrect: !opt.isCorrect })}
                      className={`h-5 w-5 shrink-0 flex items-center justify-center rounded-md border transition-colors ${
                        opt.isCorrect
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-border hover:bg-muted/40 text-transparent"
                      }`}
                    >
                      <CheckCircle size={12} className="stroke-[3]" />
                    </button>
                  )}
                  <Input
                    value={opt.text}
                    onChange={(e) => handleOptionChange(optIndex, { text: e.target.value })}
                    className="h-8 text-xs flex-1 bg-muted/20 border-border"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={q.options && q.options.length <= 1}
                    onClick={() => handleRemoveOption(optIndex)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="mt-1 h-7 text-xs border-dashed border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <Plus size={12} />
              Add Option
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-1 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id={`req-${q.order}`}
                checked={q.isRequired}
                onCheckedChange={(val) => onUpdate({ ...q, isRequired: val })}
              />
              <Label htmlFor={`req-${q.order}`} className="text-xs cursor-pointer">
                Required question
              </Label>
            </div>
          </div>

          {isExamOrAssignment && (
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-muted-foreground">Points / Marks:</Label>
              <Input
                type="number"
                value={q.points === 0 ? "" : q.points}
                onChange={(e) => onUpdate({ ...q, points: parseInt(e.target.value) || 0 })}
                className="h-8 w-16 text-center text-xs bg-muted/30 border-border"
                placeholder="0"
                min="0"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FormBuilderWorkspace({ form }: FormBuilderWorkspaceProps) {
  const router = useRouter();
  const [saving, startSaveTransition] = useTransition();
  const [publishing, startPublishTransition] = useTransition();

  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description || "");
  const [timeLimit, setTimeLimit] = useState<number | "">(form.timeLimit || "");
  const [dueDate, setDueDate] = useState<string>(
    form.dueDate ? new Date(form.dueDate).toISOString().slice(0, 16) : ""
  );
  const [allowMultiple, setAllowMultiple] = useState(form.allowMultiple);

  const [questions, setQuestions] = useState<QuestionState[]>(
    form.questions.map((q) => ({
      id: q.id,
      type: q.type as any,
      title: q.title,
      description: q.description || "",
      isRequired: q.isRequired,
      order: q.order,
      points: q.points || 0,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
        order: o.order,
      })),
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const isExamOrAssignment = form.type === "EXAM" || form.type === "ASSIGNMENT";

  const handleAddQuestion = () => {
    const nextOrder = questions.length + 1;
    const newQ: QuestionState = {
      type: "SHORT_TEXT",
      title: `Untitled Question ${nextOrder}`,
      description: "",
      isRequired: true,
      order: nextOrder,
      points: isExamOrAssignment ? 5 : 0,
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updated: QuestionState) => {
    const updatedQs = questions.map((q, i) => (i === index ? updated : q));
    setQuestions(updatedQs);
  };

  const handleRemoveQuestion = (index: number) => {
    const filtered = questions.filter((_, i) => i !== index);
    const reordered = filtered.map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(reordered);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.order === active.id);
    const newIndex = questions.findIndex((q) => q.order === over.id);

    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({
      ...q,
      order: i + 1,
    }));

    setQuestions(reordered);
  };

  const handleSaveWorkspace = () => {
    startSaveTransition(async () => {
      try {

        await updateForm(form.id, {
          title,
          description: description || null,
          timeLimit: timeLimit === "" ? null : Number(timeLimit),
          dueDate: dueDate ? new Date(dueDate) : null,
          allowMultiple,
        });

        await saveFormQuestions(form.id, questions);
        toast.success("Workspace saved successfully!");
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to save workspace");
      }
    });
  };

  const handlePublishToggle = () => {
    const nextStatus = form.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    startPublishTransition(async () => {
      try {
        await publishForm(form.id, nextStatus);
        toast.success(`Form is now in ${nextStatus.toLowerCase()} status!`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to toggle status");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start pb-24">
      <div className="lg:col-span-1 space-y-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="py-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Settings size={15} />
              Form Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="p-3 bg-muted/40 border border-border/60 rounded-lg space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Builder Mode</span>
              <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase">
                <FileText size={13} className="text-primary" />
                {form.type} Form
              </span>
            </div>

            {isExamOrAssignment && (
              <div className="space-y-1.5">
                <Label htmlFor="timeLimit" className="text-xs flex items-center gap-1">
                  <Clock size={12} className="text-muted-foreground" />
                  Time Limit (Minutes)
                </Label>
                <Input
                  id="timeLimit"
                  type="number"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Unlimited"
                  className="h-8 text-xs bg-muted/20 border-border"
                />
              </div>
            )}

            {isExamOrAssignment && (
              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs flex items-center gap-1">
                  <Calendar size={12} className="text-muted-foreground" />
                  Submission Deadline
                </Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs bg-muted/20 border-border [color-scheme:dark]"
                />
              </div>
            )}

            {form.type === "GENERAL" && (
              <div className="flex items-center justify-between border-t border-border/30 pt-3">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="multi" className="text-xs font-semibold cursor-pointer">Multiple Attempts</Label>
                  <span className="text-[10px] text-muted-foreground">Allow respondents to fill multiple times</span>
                </div>
                <Switch
                  id="multi"
                  checked={allowMultiple}
                  onCheckedChange={setAllowMultiple}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSaveWorkspace}
            disabled={saving || publishing}
            className="w-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 h-9"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Saving Changes..." : "Save Workspace"}
          </Button>

          <Button
            variant="outline"
            onClick={handlePublishToggle}
            disabled={saving || publishing}
            className="w-full border-border bg-card text-foreground hover:bg-muted font-semibold flex items-center justify-center gap-2 h-9"
          >
            {publishing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
            {form.status === "PUBLISHED" ? "Revert to Draft" : "Publish Form"}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <Card className="bg-card border-border shadow-sm p-6 space-y-4">
          <div className="space-y-1.5 border-b border-border/40 pb-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Form Title..."
              className="text-2xl font-black border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10 placeholder:text-muted-foreground/40 text-foreground bg-transparent"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this form..."
              className="text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-8 placeholder:text-muted-foreground/40 text-muted-foreground bg-transparent"
            />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map((q) => q.order)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {questions.map((question, qIndex) => (
                  <SortableQuestion
                    key={question.order}
                    q={question}
                    isExamOrAssignment={isExamOrAssignment}
                    onUpdate={(updated) => handleUpdateQuestion(qIndex, updated)}
                    onRemove={() => handleRemoveQuestion(qIndex)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {questions.length === 0 && (
            <div className="text-center py-16 border border-dashed border-border rounded-xl space-y-2 bg-muted/10">
              <HelpCircle size={32} className="mx-auto text-muted-foreground/35" />
              <p className="text-xs text-muted-foreground">Add questions to get started building your dynamic form layout.</p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddQuestion}
            className="w-full h-10 border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center justify-center gap-1.5"
          >
            <Plus size={14} />
            Add Question
          </Button>
        </Card>
      </div>
    </div>
  );
}
