"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServer } from "@/actions/server.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Check, Users, BookOpen, Lightbulb, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type ServerTemplate = "CUSTOM" | "CLASS_SERVER" | "STUDY_GROUP";

interface TemplateOption {
  id: ServerTemplate;
  name: string;
  description: string;
  icon: React.ReactNode;
  channels: string[];
}

const templates: TemplateOption[] = [
  {
    id: "CUSTOM",
    name: "Create My Own",
    description: "Start from scratch with just a #general channel",
    icon: <Hash className="w-5 h-5 text-primary" />,
    channels: ["general"],
  },
  {
    id: "CLASS_SERVER",
    name: "Class Server",
    description: "Organize your class with announcements, homework help, and Q&A",
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    channels: ["general", "announcements", "homework-help", "questions"],
  },
  {
    id: "STUDY_GROUP",
    name: "Study Group",
    description: "Collaborate with shared resources and scheduling",
    icon: <Lightbulb className="w-5 h-5 text-primary" />,
    channels: ["general", "resources", "questions", "schedule"],
  },
];

interface CreateServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateServerModal({ open, onOpenChange }: CreateServerModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"template" | "details" | "success">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<ServerTemplate>("CUSTOM");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; inviteCode: string } | null>(null);

  const handleTemplateSelect = (template: ServerTemplate) => {
    setSelectedTemplate(template);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await createServer(name.trim(), description.trim(), selectedTemplate);
      setResult(res);
      setStep("success");
    } catch (error) {
      console.error("Failed to create server:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);

    setTimeout(() => {
      setStep("template");
      setSelectedTemplate("CUSTOM");
      setName("");
      setDescription("");
      setResult(null);
    }, 200);
  };

  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        {step === "template" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Create a Server</DialogTitle>
              <DialogDescription className="text-center">
                Your server is where you and your friends hang out. Choose a template to get started.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 mt-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left cursor-pointer",
                    "hover:border-primary hover:bg-primary/5",
                    "border-border bg-background"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Channels: {template.channels.join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Customize Your Server</DialogTitle>
              <DialogDescription>
                Give your new server a personality with a name and description.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Server Name</label>
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., AP Biology 2025"
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Description <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this server about?"
                  rows={3}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">This server will include:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplateData?.channels.map((channel) => (
                    <span
                      key={channel}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-background rounded-md border border-border"
                    >
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      {channel}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("template")}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Creating..." : "Create Server"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "success" && result && (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">Server Created!</DialogTitle>
              <DialogDescription className="text-center">
                Your server <strong>{name}</strong> is ready to go!
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="bg-muted rounded-xl p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                  Invite Code
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-lg font-mono font-bold text-foreground bg-background px-3 py-2 rounded-lg border border-border">
                    {result.inviteCode}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.inviteCode)}
                    className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with friends to invite them to your server.
                </p>
              </div>

              <button
                onClick={() => {
                  handleClose();
                  router.push(`/servers?serverId=${result.id}`);
                }}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
              >
                Go to Server
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
