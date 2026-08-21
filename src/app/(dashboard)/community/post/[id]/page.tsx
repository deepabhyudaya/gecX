import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getPost } from "@/actions/community.actions";
import { getComments } from "@/actions/community-comment.actions";
import { getMyCommunityProfile } from "@/actions/community-profile.actions";
import { PostCard } from "@/components/community/PostCard";
import { CommentList } from "@/components/community/CommentList";
import { CommentCreator } from "@/components/community/CommentCreator";
import { AiAnswerButton } from "@/components/community/AiAnswerButton";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PostPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const post = await getPost(params.id);
  return {
    title: post ? `Question by ${post.authorName} | gecX` : "Question | gecX",
    description: post?.content?.slice(0, 160) || "View question on gecX Academic Q&A",
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const clerkUser = await currentUser();
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();
  const isAdmin = role === "admin";

  const post = await getPost(params.id);
  if (!post) {
    notFound();
  }

  const { comments } = await getComments(params.id);
  const hasAiAnswer = comments.some((c: any) => c.authorType === "ai");
  const profile = await getMyCommunityProfile();
  const userAvatar = profile?.customAvatar || profile?.avatar || clerkUser?.imageUrl;

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-4">
          <Link
            href="/community"
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold">Question</h1>
        </div>
      </div>

      <PostCard
        post={{
          ...post,
          subject: (post as any).subject || null,
          isAnswered: (post as any).isAnswered || false,
          author: {
            userId: (post as any).author?.userId || post.authorId || "",
            username: (post as any).author?.username || "unknown",
            displayName: (post as any).author?.displayName || null,
            avatar: (post as any).author?.avatar || null,
            customAvatar: (post as any).author?.customAvatar || null,
            karmaPoints: (post as any).author?.karmaPoints || 0,
            currentStreak: (post as any).author?.currentStreak || 0,
            equippedColor: (post as any).author?.equippedColor || null,
            equippedNameplate: (post as any).author?.equippedNameplate || null,
          },
          originalPost: post.originalPost ? {
            ...post.originalPost,
            authorImage: post.originalPost.author?.avatar || null,
            author: {
              userId: (post.originalPost.author as any)?.userId || post.originalPost.authorId || "",
              username: post.originalPost.author?.username || "unknown",
              displayName: post.originalPost.author?.displayName || null,
              avatar: post.originalPost.author?.avatar || null,
              customAvatar: (post.originalPost.author as any)?.customAvatar || null,
              karmaPoints: (post.originalPost.author as any)?.karmaPoints || 0,
              currentStreak: (post.originalPost.author as any)?.currentStreak || 0,
              equippedColor: (post.originalPost.author as any)?.equippedColor || null,
              equippedNameplate: (post.originalPost.author as any)?.equippedNameplate || null,
            },
          } : null,
          isOwnPost: post.authorId === clerkUser?.id,
          isAdmin,
        }}
      />

      <div className="px-4 border-b border-border">
        <div className="flex items-center justify-between py-3">
          <h2 className="text-sm font-semibold text-foreground">Your answer</h2>
          <AiAnswerButton postId={params.id} hasAiAnswer={hasAiAnswer} />
        </div>
        <CommentCreator
          postId={params.id}
          userImage={userAvatar}
          placeholder="Write your answer..."
        />
      </div>

      <div className="px-4">
        <CommentList
          comments={comments}
          postId={params.id}
          userImage={userAvatar}
          clerkUserId={clerkUser?.id}
          postAuthorId={post.authorId}
        />
      </div>
    </div>
  );
}
