"use client";

import { useState } from "react";
import { Share2, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ShareProfileButton({
  userId,
  userType,
}: {
  userId: string;
  userType: "teacher" | "student" | "parent";
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedLink(null);
    setCopied(false);

    try {
      const res = await fetch("/api/access/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userType, durationMinutes: duration }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate link");

      const url = new URL(window.location.href);
      url.searchParams.set("accessCode", data.code);
      setGeneratedLink(url.toString());
      toast.success("Access link generated!");
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.info("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-foreground/90 transition-all shadow-sm">
          <Share2 size={16} />
          Share Profile
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Temporary Access</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Generate a link that grants full access to performance history for a limited time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          <div className="flex gap-2">
            {[15, 60, 180].map((mins) => (
              <button
                key={mins}
                onClick={() => setDuration(mins)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  duration === mins
                    ? "bg-primary text-primary-foreground border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/30"
                }`}
              >
                {mins === 60 ? "1 hr" : mins === 180 ? "3 hrs" : `${mins} min`}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Generate Link"}
          </button>

          {generatedLink && (
            <div className="pt-4 border-t border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Your Link
              </p>
              <div className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg p-2.5">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-transparent text-sm outline-none text-foreground truncate"
                />
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground shrink-0"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
