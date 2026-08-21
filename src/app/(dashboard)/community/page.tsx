import { auth, currentUser } from "@clerk/nextjs/server";
import { getFeed } from "@/actions/community.actions";
import { getMyCommunityProfile } from "@/actions/community-profile.actions";
import { PostCreator } from "@/components/community/PostCreator";
import { PostCard } from "@/components/community/PostCard";
import { Metadata } from "next";
import Link from "next/link";
import { Film, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Academic Q&A | gecX",
  description: "Ask and answer academic questions",
};

export default async function CommunityPage() {
  const clerkUser = await currentUser();
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();
  const isAdmin = role === "admin";

  const profile = await getMyCommunityProfile();
  const { posts, nextCursor, hasMore } = await getFeed();

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 pt-3 pb-0 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-lg font-semibold">Academic Q&A</h1>
              <p className="text-xs text-muted-foreground">Ask questions, get answers, earn karma</p>
            </div>
          </div>

          <div className="flex border-b border-transparent gap-4">
            <Link
              href="/community"
              className="px-4 py-2 border-b-2 border-foreground text-sm font-semibold text-foreground flex items-center gap-1.5"
            >
              <BookOpen className="size-4" />
              Q&A Feed
            </Link>
            <Link
              href="/community/reels"
              className="px-4 py-2 border-b-2 border-transparent text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Film className="size-4" />
              Loops
            </Link>
          </div>
        </div>
      </div>

      <PostCreator
        userImage={profile?.customAvatar || profile?.avatar || clerkUser?.imageUrl}
      />

      <div className="flex-1">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No questions yet. Be the first to ask!</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
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
            ))}

            {hasMore && (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">Loading more...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
