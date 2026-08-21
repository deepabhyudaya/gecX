"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Loader2, Smile, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPost } from "@/actions/community.actions";
import { getAcademicSubjects } from "@/actions/academic-subject.actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import MediaPicker, { EmojiItem } from "@/components/messages/MediaPicker";
import { fetchUserEmojis } from "@/lib/user-emojis";

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface PostCreatorProps {
  userImage?: string | null;
  onPostCreated?: () => void;
}

export function PostCreator({ userImage, onPostCreated }: PostCreatorProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [userEmojis, setUserEmojis] = useState<EmojiItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      getAcademicSubjects()
        .then((data) => setSubjects(data))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchUserEmojis()
        .then((emojis) => {
          if (emojis.length > 0) setUserEmojis(emojis);
        })
        .catch(() => {});
    }
  }, [open]);

  const charCount = content.length;
  const maxChars = 2000;

  const resetForm = () => {
    setContent("");
    setSelectedSubjectId("");
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createPost(content.trim(), selectedSubjectId || undefined);
      toast.success("Question posted!");
      onPostCreated?.();
      router.refresh();
      resetForm();
    } catch (error) {
      toast.error("Failed to post question");
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + text + " " + content.slice(end);
    setContent(newContent.slice(0, maxChars));

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + text.length + 1;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="border-b border-border p-4 relative bg-background w-full">
          <div className="flex gap-3 max-w-2xl mx-auto w-full items-center">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
              <Image
                src={userImage || "/noAvatar.png"}
                alt="Your avatar"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 flex items-center gap-3">
              <button className="flex-1 text-left py-2.5 px-4 bg-muted hover:bg-muted/80 rounded-full text-sm text-muted-foreground transition-all border border-border/40 hover:border-border">
                Ask an academic question...
              </button>
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] bg-background border border-border p-0 flex flex-col max-h-[90vh] overflow-visible">
        <DialogHeader className="flex flex-row items-center gap-3 border-b border-border p-4 shrink-0">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
            <Image
              src={userImage || "/noAvatar.png"}
              alt="User avatar"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col text-left">
            <DialogTitle className="text-sm font-semibold tracking-wide text-foreground">Ask Academic Question</DialogTitle>
            <span className="text-[10px] text-muted-foreground">Get answers and earn karma points</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-5 overflow-visible flex-1">
          {subjects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                disabled={isSubmitting}
              >
                <option value="">Select a subject...</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question</label>
            <div className="border border-border rounded-lg bg-muted p-2 flex flex-col">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
                placeholder="Type your academic query here..."
                className="w-full min-h-[120px] bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground"
                disabled={isSubmitting}
              />

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">
                  {charCount} / {maxChars}
                </span>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMediaPicker(!showMediaPicker)}
                  className="gap-1.5 text-muted-foreground hover:text-foreground h-7 px-2"
                  disabled={isSubmitting}
                >
                  <Smile size={16} />
                </Button>
              </div>
            </div>

            {showMediaPicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMediaPicker(false)}
                />
                <div className="absolute z-50 bottom-12 right-0">
                  <MediaPicker
                    onGifSelect={(gifUrl) => {
                      insertText(gifUrl);
                      setShowMediaPicker(false);
                    }}
                    onEmojiSelect={(emojiSyntax) => {
                      insertText(emojiSyntax);
                      setShowMediaPicker(false);
                    }}
                    serverEmojis={userEmojis.filter((e) => !e.packId)}
                    onClose={() => setShowMediaPicker(false)}
                    hideStickers={true}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4 bg-muted/20 shrink-0">
          <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="text-xs h-9 px-3">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || charCount > maxChars}
            className="text-xs h-9 px-4 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <HelpCircle size={14} />
                Ask Question
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
