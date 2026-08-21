"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Trash2, Flag, CheckCircle2, BookOpen } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils";
import { likePost, deletePost } from "@/actions/community.actions";
import { reportPost } from "@/actions/community-report.actions";
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
import { CommentsPreview } from "./CommentsPreview";
import { getKarmaTierColor, getKarmaTierTextGradientStyle } from "@/lib/karma-tiers";
import { extractImageUrls } from "@/lib/image-detection";
import ImageEmbed from "@/components/ImageEmbed";
import EmojiRenderer, { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { UserCardTrigger } from "@/components/user";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";
import { fetchUserEmojis } from "@/lib/user-emojis";

interface PostAuthor {
  userId: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  customAvatar?: string | null;
  karmaPoints?: number;
  currentStreak?: number;
  equippedColor?: string | null;
  equippedNameplate?: string | null;
}

interface OriginalPost {
  id: string;
  content: string;
  authorImage: string | null;
  author: PostAuthor;
  authorId: string;
}

interface PreviewComment {
  id: string;
  authorName: string;
  authorUsername: string;
  content: string;
}

interface SubjectBadge {
  id: string;
  name: string;
  color: string;
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  author: PostAuthor;
  isRepost: boolean;
  originalPost: OriginalPost | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: Date;
  hasLiked?: boolean;
  isOwnPost?: boolean;
  isAdmin?: boolean;
  previewComments?: PreviewComment[];
  subject?: SubjectBadge | null;
  isAnswered?: boolean;
}

interface PostCardProps {
  post: Post;
  onDelete?: () => void;
  onRepost?: () => void;
  bgIsLight?: boolean;
  hasCustomBg?: boolean;
}

export function PostCard({ post, onDelete, onRepost, bgIsLight = false, hasCustomBg = false }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.hasLiked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [userEmojis, setUserEmojis] = useState<Array<{ name: string; imageUrl: string }>>([]);

  useEffect(() => {
    fetchUserEmojis()
      .then((emojis) => {
        if (emojis.length > 0) setUserEmojis(emojis);
      })
      .catch(() => {});
  }, []);

  const emojiMap = useMemo(() => buildEmojiMap(userEmojis, []), [userEmojis]);

  const displayPost = post.isRepost && post.originalPost ? post.originalPost : post;
  const displayAuthor = post.isRepost && post.originalPost ? post.originalPost.author : post.author;

  const handleLike = async () => {
    try {
      const result = await likePost(post.id);
      setIsLiked(result.liked);
      setLikeCount(prev => result.liked ? prev + 1 : prev - 1);
    } catch (error) {
      toast.error("Failed to like post");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePost(post.id);
      toast.success("Post deleted");
      onDelete?.();
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleReport = async (reason: string) => {
    try {
      await reportPost(post.id, reason);
      toast.success("Post reported");
      setShowReportDialog(false);
    } catch (error) {
      toast.error((error as Error).message || "Failed to report post");
    }
  };

  const articleBorderClass = bgIsLight ? "border-black/10" : hasCustomBg ? "border-white/10" : "border-border";
  const articleHoverClass = bgIsLight ? "hover:bg-black/5" : hasCustomBg ? "hover:bg-white/5" : "hover:bg-muted/50";

  return (
    <article className={`border-b ${articleBorderClass} p-4 ${articleHoverClass} transition-colors`}>
      {post.isRepost && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2 ml-12">
          <Repeat2 size={14} />
          <UserCardTrigger userId={post.author?.userId || ''}>
            <span
              className="hover:underline cursor-pointer"
              style={
                post.author?.equippedColor
                  ? { color: post.author.equippedColor }
                  : getKarmaTierTextGradientStyle(post.author?.karmaPoints || 0) || { color: getKarmaTierColor(post.author?.karmaPoints || 0) || undefined }
              }
            >
              {post.authorName}
            </span>
          </UserCardTrigger>
          <span>reposted</span>
        </div>
      )}

      <div className="flex gap-3">
        <UserCardTrigger userId={displayAuthor.userId}>
          <div className="cursor-pointer">
            <StreakBorderAvatar
              src={displayAuthor.customAvatar || displayAuthor.avatar}
              alt={displayAuthor.username}
              streak={displayAuthor.currentStreak || 0}
              karmaPoints={displayAuthor.karmaPoints || 0}
              size="md"
              useRawImg={!!displayAuthor.customAvatar}
            />
          </div>
        </UserCardTrigger>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div
              className={cn("flex items-center gap-1.5 min-w-0 rounded-md px-1.5 py-0.5")}
              style={displayAuthor.equippedNameplate ? { background: displayAuthor.equippedNameplate, textShadow: "0 1px 2px rgba(0,0,0,0.4)" } : undefined}
            >
              {(() => {
                const nameColor = displayAuthor.equippedColor
                  ? { color: displayAuthor.equippedColor }
                  : getKarmaTierTextGradientStyle(displayAuthor.karmaPoints || 0)
                    || { color: getKarmaTierColor(displayAuthor.karmaPoints || 0) || undefined };
                return (
                  <>
                    <UserCardTrigger userId={displayAuthor.userId}>
                      <span
                        className="font-semibold text-sm truncate hover:underline cursor-pointer"
                        style={nameColor}
                      >
                        {displayAuthor.displayName || displayAuthor.username}
                      </span>
                    </UserCardTrigger>
                    <UserCardTrigger userId={displayAuthor.userId}>
                      <span
                        className="text-sm truncate opacity-70 hover:underline cursor-pointer"
                        style={nameColor}
                      >
                        @{displayAuthor.username}
                      </span>
                    </UserCardTrigger>
                    <span className="text-muted-foreground opacity-50">·</span>
                  </>
                );
              })()}
              {post.subject && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium text-white shrink-0"
                  style={{ backgroundColor: post.subject.color }}
                >
                  {post.subject.name}
                </span>
              )}
              <Link
                href={`/community/post/${post.id}`}
                className={cn("text-sm hover:underline shrink-0", displayAuthor.equippedNameplate ? "text-white/80" : "text-muted-foreground")}
              >
                {formatDistanceToNow(new Date(post.createdAt))}
              </Link>
              {post.isAnswered && (
                <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
                  <CheckCircle2 size={12} />
                  Answered
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(post.isOwnPost || post.isAdmin) && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                {!post.isOwnPost && (
                  <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                    <Flag size={14} className="mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Link href={`/community/post/${post.id}`} className="block mt-1">
            <p className="text-sm whitespace-pre-wrap break-words">
              <EmojiRenderer content={displayPost.content} emojiMap={emojiMap} />
            </p>
          </Link>

          {(() => {
            const imageUrls = extractImageUrls(displayPost.content);
            if (imageUrls.length === 0) return null;
            return (
              <div className="mt-2 space-y-2">
                {imageUrls.map((url, idx) => (
                  <ImageEmbed key={`${post.id}-img-${idx}`} src={url} className="rounded-lg" />
                ))}
              </div>
            );
          })()}

          <div className="flex items-center justify-between mt-3 max-w-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={cn(
                "gap-1.5 h-8 px-2",
                isLiked && "text-red-500 hover:text-red-600"
              )}
            >
              <Heart size={16} className={cn(isLiked && "fill-current")} />
              <span className="text-xs">{likeCount > 0 && likeCount}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 h-8 px-2 hover:text-blue-500"
            >
              <Link href={`/community/post/${post.id}`}>
                <BookOpen size={16} />
                <span className="text-xs">{post.commentCount > 0 ? `${post.commentCount} Answers` : "Answer"}</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-8 px-2"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/community/post/${post.id}`);
                toast.success("Link copied!");
              }}
            >
              <Share size={16} />
            </Button>
          </div>

          {post.previewComments && post.previewComments.length > 0 && (
            <CommentsPreview
              postId={post.id}
              commentCount={post.commentCount}
              previewComments={post.previewComments}
            />
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post will be permanently deleted.
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

      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report Post</AlertDialogTitle>
            <AlertDialogDescription>
              Why are you reporting this post?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 py-4">
            {["Spam", "Harassment", "Inappropriate content", "Other"].map((reason) => (
              <Button
                key={reason}
                variant="outline"
                onClick={() => handleReport(reason)}
                className="justify-start"
              >
                {reason}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
