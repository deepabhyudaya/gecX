"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import EmojiRenderer, { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { fetchUserEmojis } from "@/lib/user-emojis";

interface PreviewComment {
  id: string;
  authorName: string;
  authorUsername: string;
  content: string;
}

interface CommentsPreviewProps {
  postId: string;
  commentCount: number;
  previewComments: PreviewComment[];
}

export function CommentsPreview({ postId, commentCount, previewComments }: CommentsPreviewProps) {
  const [userEmojis, setUserEmojis] = useState<Array<{ name: string; imageUrl: string }>>([]);

  useEffect(() => {
    fetchUserEmojis()
      .then((emojis) => {
        if (emojis.length > 0) setUserEmojis(emojis);
      })
      .catch(() => {});
  }, []);

  const emojiMap = useMemo(() => buildEmojiMap(userEmojis, []), [userEmojis]);

  if (commentCount === 0) return null;

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength).trim() + "...";
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        <MessageCircle size={14} />
        <span className="text-xs font-medium">{commentCount} comments</span>
      </div>

      <div className="space-y-2">
        {previewComments.map((comment) => (
          <Link
            key={comment.id}
            href={`/community/post/${postId}`}
            className="block text-sm hover:bg-background rounded-md px-2 py-1.5 -mx-2 transition-colors"
          >
            <span className="font-semibold text-foreground">{comment.authorName}</span>
            <span className="text-muted-foreground mx-1">·</span>
            <span className="text-muted-foreground">
              <EmojiRenderer content={truncateContent(comment.content)} emojiMap={emojiMap} />
            </span>
          </Link>
        ))}
      </div>

      {commentCount > previewComments.length && (
        <Link
          href={`/community/post/${postId}`}
          className="block mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all {commentCount} comments
        </Link>
      )}
    </div>
  );
}
