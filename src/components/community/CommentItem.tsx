"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Trash2, MoreHorizontal, Star, Award, Zap, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { likeComment, deleteComment, markHelpfulAnswer, unmarkHelpfulAnswer } from "@/actions/community-comment.actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { extractImageUrls } from "@/lib/image-detection";
import ImageEmbed from "@/components/ImageEmbed";
import EmojiRenderer, { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { UserCardTrigger } from "@/components/user";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";
import { fetchUserEmojis } from "@/lib/user-emojis";
import { AiBadge } from "@/components/AiBadge";

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    authorId: string;
    authorType?: string;
    authorName: string;
    authorUsername?: string;
    authorImage: string | null;
    authorAvatar?: string | null;
    authorCustomAvatar?: string | null;
    authorStreak?: number;
    authorKarma?: number;
    likeCount: number;
    createdAt: Date;
    hasLiked?: boolean;
    isOwnComment?: boolean;
    isAdmin?: boolean;
    helpfulRank?: number | null;
    karmaAwarded?: number;
  };
  onReply?: () => void;
  onDelete?: () => void;
  isQuestionAuthor?: boolean;
  onMarkHelpful?: (commentId: string, rank: 1 | 2 | 3) => void;
  onUnmarkHelpful?: (commentId: string) => void;
}

const rankConfig: Record<number, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  1: { label: "Best Answer", icon: <Star size={12} />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  2: { label: "Helpful Answer", icon: <Award size={12} />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  3: { label: "Promising Answer", icon: <Zap size={12} />, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
};

export function CommentItem({ comment, onReply, onDelete, isQuestionAuthor, onMarkHelpful, onUnmarkHelpful }: CommentItemProps) {
  const isAi = comment.authorType === "ai";
  const [isLiked, setIsLiked] = useState(comment.hasLiked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userEmojis, setUserEmojis] = useState<Array<{ name: string; imageUrl: string }>>([]);

  useEffect(() => {
    fetchUserEmojis()
      .then((emojis) => {
        if (emojis.length > 0) setUserEmojis(emojis);
      })
      .catch(() => {});
  }, []);

  const emojiMap = useMemo(() => buildEmojiMap(userEmojis, []), [userEmojis]);

  const handleLike = async () => {
    try {
      const result = await likeComment(comment.id);
      setIsLiked(result.liked);
      setLikeCount(prev => result.liked ? prev + 1 : prev - 1);
    } catch (error) {
      toast.error("Failed to like comment");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteComment(comment.id);
      toast.success("Comment deleted");
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className="flex gap-3 py-3">
      {isAi ? (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-white" />
        </div>
      ) : (
        <UserCardTrigger userId={comment.authorId}>
          <div className="cursor-pointer">
            <StreakBorderAvatar
              src={comment.authorCustomAvatar || comment.authorAvatar || comment.authorImage}
              alt={comment.authorName}
              streak={comment.authorStreak || 0}
              karmaPoints={comment.authorKarma || 0}
              size="sm"
              useRawImg={!!comment.authorCustomAvatar}
            />
          </div>
        </UserCardTrigger>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isAi ? (
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  {comment.authorName}
                  <AiBadge />
                </span>
              ) : (
                <UserCardTrigger userId={comment.authorId}>
                  <span className="font-semibold text-sm cursor-pointer hover:underline">{comment.authorName}</span>
                </UserCardTrigger>
              )}
              <span className="text-muted-foreground text-sm">
                · {formatDistanceToNow(new Date(comment.createdAt))}
              </span>
              {comment.helpfulRank && rankConfig[comment.helpfulRank] && (
                <span className={cn("flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium", rankConfig[comment.helpfulRank].bg, rankConfig[comment.helpfulRank].color)}>
                  {rankConfig[comment.helpfulRank].icon}
                  {rankConfig[comment.helpfulRank].label}
                  {comment.karmaAwarded ? ` (+${comment.karmaAwarded})` : ""}
                </span>
              )}
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap break-words">
              <EmojiRenderer content={comment.content} emojiMap={emojiMap} />
            </p>

            {(() => {
              const imageUrls = extractImageUrls(comment.content);
              if (imageUrls.length === 0) return null;
              return (
                <div className="mt-2 space-y-2">
                  {imageUrls.map((url, idx) => (
                    <ImageEmbed key={`${comment.id}-img-${idx}`} src={url} className="rounded-lg" size="small" />
                  ))}
                </div>
              );
            })()}

            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors",
                  isLiked && "text-red-500"
                )}
              >
                <Heart size={14} className={cn(isLiked && "fill-current")} />
                <span className="text-xs">{likeCount > 0 && likeCount}</span>
              </button>

              <button
                onClick={onReply}
                className="flex items-center gap-1 text-muted-foreground hover:text-blue-500 transition-colors"
              >
                <MessageCircle size={14} />
                <span className="text-xs">Reply</span>
              </button>

              {isQuestionAuthor && !comment.isOwnComment && !isAi && (
                <div className="flex items-center gap-1">
                  {comment.helpfulRank ? (
                    <button
                      onClick={() => onUnmarkHelpful?.(comment.id)}
                      className="text-xs text-muted-foreground hover:text-destructive underline"
                    >
                      Unmark
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onMarkHelpful?.(comment.id, 1)}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                        title="Best Answer (+100 karma)"
                      >
                        <Star size={12} /> Best
                      </button>
                      <button
                        onClick={() => onMarkHelpful?.(comment.id, 2)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                        title="Helpful Answer (+50 karma)"
                      >
                        <Award size={12} /> Helpful
                      </button>
                      <button
                        onClick={() => onMarkHelpful?.(comment.id, 3)}
                        className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                        title="Promising Answer (+25 karma)"
                      >
                        <Zap size={12} /> Promising
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {(comment.isOwnComment || comment.isAdmin) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-2">
                  <MoreHorizontal size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
