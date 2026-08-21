"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Send, Loader2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createComment } from "@/actions/community-comment.actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import MediaPicker, { EmojiItem } from "@/components/messages/MediaPicker";
import { fetchUserEmojis } from "@/lib/user-emojis";

interface CommentCreatorProps {
  postId: string;
  parentId?: string;
  userImage?: string | null;
  placeholder?: string;
  onCommentCreated?: () => void;
  autoFocus?: boolean;
}

export function CommentCreator({
  postId,
  parentId,
  userImage,
  placeholder = "Write a comment...",
  onCommentCreated,
  autoFocus,
}: CommentCreatorProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [userEmojis, setUserEmojis] = useState<EmojiItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserEmojis()
      .then((emojis) => {
        if (emojis.length > 0) setUserEmojis(emojis);
      })
      .catch(() => {});
  }, []);

  const maxChars = 2000;

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment(postId, content.trim(), parentId);
      setContent("");
      toast.success("Comment posted!");
      onCommentCreated?.();
      router.refresh();
    } catch (error) {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-3 py-3 relative">
      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
        <Image
          src={userImage || "/noAvatar.png"}
          alt="Your avatar"
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full min-h-[60px] bg-muted rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMediaPicker(!showMediaPicker)}
              className="gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <Smile size={16} />
            </Button>
            <span className="text-xs text-muted-foreground">
              {content.length}/{maxChars}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            size="sm"
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            Reply
          </Button>
        </div>

        {showMediaPicker && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMediaPicker(false)}
            />
            <div className="absolute z-50 bottom-full left-0 mb-2 max-w-full">
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
                style={{ width: 'min(360px, 100%)', height: 'min(280px, 45vh)' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );

  function insertText(text: string) {
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
  }
}
