"use client";

import { useState, useEffect } from "react";
import { CommentItem } from "./CommentItem";
import { CommentCreator } from "./CommentCreator";
import { useRouter } from "next/navigation";
import { markHelpfulAnswer, unmarkHelpfulAnswer } from "@/actions/community-comment.actions";
import { toast } from "react-toastify";

interface CommentData {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  authorType: string;
  likeCount: number;
  createdAt: Date;
  hasLiked?: boolean;
  replyCount?: number;
  replies?: CommentData[];
  postId: string;
  parentId: string | null;
  helpfulRank?: number | null;
  karmaAwarded?: number;
}

interface CommentItemWithRepliesProps {
  comment: CommentData;
  postId: string;
  userImage?: string | null;
  clerkUserId?: string | null;
  postAuthorId?: string;
  replyingTo: string | null;
  onReply: (commentId: string | null) => void;
  onCommentCreated: () => void;
  onDelete: (commentId: string) => void;
  onMarkHelpful: (commentId: string, rank: 1 | 2 | 3) => void;
  onUnmarkHelpful: (commentId: string) => void;
  depth?: number;
}

function CommentItemWithReplies({
  comment,
  postId,
  userImage,
  clerkUserId,
  postAuthorId,
  replyingTo,
  onReply,
  onCommentCreated,
  onDelete,
  onMarkHelpful,
  onUnmarkHelpful,
  depth = 0,
}: CommentItemWithRepliesProps) {
  const isReplying = replyingTo === comment.id;
  const maxDepth = 5;

  return (
    <div className={depth > 0 ? "border-l-2 border-border pl-4 ml-4" : ""}>
      <CommentItem
        comment={{
          ...comment,
          isOwnComment: comment.authorId === clerkUserId,
        }}
        onReply={depth < maxDepth ? () => onReply(isReplying ? null : comment.id) : undefined}
        onDelete={() => onDelete(comment.id)}
        isQuestionAuthor={clerkUserId === postAuthorId}
        onMarkHelpful={onMarkHelpful}
        onUnmarkHelpful={onUnmarkHelpful}
      />

      {isReplying && (
        <div className="py-2 pl-11">
          <CommentCreator
            postId={postId}
            parentId={comment.id}
            userImage={userImage}
            placeholder={`Reply to ${comment.authorName}`}
            onCommentCreated={onCommentCreated}
            autoFocus
          />
          <button
            onClick={() => onReply(null)}
            className="text-xs text-muted-foreground hover:text-foreground mt-1"
          >
            Cancel
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItemWithReplies
              key={reply.id}
              comment={reply}
              postId={postId}
              userImage={userImage}
              clerkUserId={clerkUserId}
              postAuthorId={postAuthorId}
              replyingTo={replyingTo}
              onReply={onReply}
              onCommentCreated={onCommentCreated}
              onDelete={onDelete}
              onMarkHelpful={onMarkHelpful}
              onUnmarkHelpful={onUnmarkHelpful}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentListProps {
  comments: CommentData[];
  postId: string;
  userImage?: string | null;
  clerkUserId?: string | null;
  postAuthorId?: string;
}

export function CommentList({ comments, postId, userImage, clerkUserId, postAuthorId }: CommentListProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [commentList, setCommentList] = useState<CommentData[]>(comments);
  const router = useRouter();

  useEffect(() => {
    setCommentList(comments);
  }, [comments]);

  const handleReply = (commentId: string | null) => {
    setReplyingTo(commentId);
  };

  const handleCommentCreated = () => {
    setReplyingTo(null);

    router.refresh();
  };

  const handleDelete = (commentId: string) => {

    const removeComment = (list: CommentData[]): CommentData[] => {
      return list.filter((c) => c.id !== commentId).map((c) => ({
        ...c,
        replies: c.replies ? removeComment(c.replies) : undefined,
      }));
    };

    setCommentList((prev) => removeComment(prev));

    router.refresh();
  };

  const handleMarkHelpful = async (commentId: string, rank: 1 | 2 | 3) => {
    try {
      await markHelpfulAnswer(commentId, rank);
      toast.success("Answer marked as helpful!");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark answer");
    }
  };

  const handleUnmarkHelpful = async (commentId: string) => {
    try {
      await unmarkHelpfulAnswer(commentId);
      toast.success("Answer unmarked");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to unmark answer");
    }
  };

  if (commentList.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No answers yet. Be the first to answer!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {commentList.map((comment) => (
        <CommentItemWithReplies
          key={comment.id}
          comment={comment}
          postId={postId}
          userImage={userImage}
          clerkUserId={clerkUserId}
          postAuthorId={postAuthorId}
          replyingTo={replyingTo}
          onReply={handleReply}
          onCommentCreated={handleCommentCreated}
          onDelete={handleDelete}
          onMarkHelpful={handleMarkHelpful}
          onUnmarkHelpful={handleUnmarkHelpful}
          depth={0}
        />
      ))}
    </div>
  );
}
