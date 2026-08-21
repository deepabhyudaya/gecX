"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createReel } from "@/actions/reels.actions";
import { toast } from "react-toastify";
import { Plus, Video, Loader2, Smile } from "lucide-react";
import MediaPicker, { EmojiItem } from "@/components/messages/MediaPicker";
import { fetchUserEmojis } from "@/lib/user-emojis";

interface ReelCreatorProps {
  userImage?: string | null;
  onReelCreated?: () => void;
  variant?: "floating" | "inline";
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const shorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts) return shorts[1];
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (short) return short[1];
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watch) return watch[1];
  const embed = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embed) return embed[1];
  return null;
}

function resolveVideoUrl(url: string): string {
  if (!url) return "";

  if (url.includes("dropbox.com")) {
    return url.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
  }

  const gDriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gDriveMatch) {
    return `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}`;
  }
  return url;
}

export function ReelCreator({ userImage, onReelCreated, variant = "floating" }: ReelCreatorProps) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("PORTRAIT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [userEmojis, setUserEmojis] = useState<EmojiItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      fetchUserEmojis()
        .then((emojis) => {
          if (emojis.length > 0) setUserEmojis(emojis);
        })
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!videoUrl) return;

    if (videoUrl.includes("/shorts/")) {
      setOrientation("PORTRAIT");
    }

    const ytId = getYouTubeId(videoUrl);
    if (ytId) {
      setThumbnailUrl(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
    } else {
      setThumbnailUrl("");
    }
  }, [videoUrl]);

  const resetForm = () => {
    setCaption("");
    setVideoUrl("");
    setThumbnailUrl("");
    setOrientation("PORTRAIT");
    setOpen(false);
  };

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newCaption = caption.slice(0, start) + text + " " + caption.slice(end);
    setCaption(newCaption.slice(0, 2000));

    setTimeout(() => {
      textarea.focus();
      const newPosition = start + text.length + 1;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    const resolved = resolveVideoUrl(videoUrl.trim());
    const ytId = getYouTubeId(resolved);
    let finalThumbnail = thumbnailUrl.trim();

    if (ytId && !finalThumbnail) {
      finalThumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }

    setIsSubmitting(true);
    try {
      await createReel(caption, resolved, finalThumbnail || undefined, orientation);
      toast.success("Loop created successfully!");
      if (onReelCreated) {
        onReelCreated();
      } else {
        window.location.reload();
      }
      resetForm();
    } catch {
      toast.error("Failed to post loop");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "inline" ? (
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
                  Share a campus loop...
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button className="flex items-center justify-center p-3 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg transition-transform active:scale-95">
            <Plus className="size-6" />
          </button>
        )}
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
            <DialogTitle className="text-sm font-semibold tracking-wide text-foreground">Post a campus loop</DialogTitle>
            <span className="text-[10px] text-muted-foreground">Share short video loops under BlackLines</span>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-5 overflow-visible flex-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video URL</label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="YouTube URL, Dropbox / Google Drive link, or raw MP4..."
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              disabled={isSubmitting}
            />
            <span className="text-[10px] text-muted-foreground">
              Supports YouTube (including Shorts), Google Drive, Dropbox, and direct video file links.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orientation Layout</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={orientation === "PORTRAIT" ? "default" : "outline"}
                onClick={() => setOrientation("PORTRAIT")}
                className="flex-1 text-xs"
                disabled={isSubmitting}
              >
                Portrait (9:16)
              </Button>
              <Button
                type="button"
                variant={orientation === "LANDSCAPE" ? "default" : "outline"}
                onClick={() => setOrientation("LANDSCAPE")}
                className="flex-1 text-xs"
                disabled={isSubmitting}
              >
                Landscape (16:9)
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caption</label>
            <div className="border border-border rounded-lg bg-muted p-2 flex flex-col">
              <textarea
                ref={textareaRef}
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 2000))}
                placeholder="What's happening on campus..."
                className="w-full min-h-[90px] bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground"
                disabled={isSubmitting}
              />

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">
                  {caption.length} / 2000
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thumbnail URL (Optional)</label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Link to preview image..."
              className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4 bg-muted/20 shrink-0">
          <Button variant="outline" onClick={resetForm} disabled={isSubmitting} className="text-xs h-9 px-3">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="text-xs h-9 px-4 flex items-center gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Posting...
              </>
            ) : (
              "Post Loop"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
