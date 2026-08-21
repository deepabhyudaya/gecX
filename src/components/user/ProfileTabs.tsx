"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Film, Eye } from "lucide-react";
import { PostCard } from "@/components/community/PostCard";
import { cn } from "@/lib/utils";

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

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  author: PostAuthor;
  isRepost: boolean;
  originalPost: any;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: any;
  hasLiked?: boolean;
  isOwnPost?: boolean;
  isAdmin?: boolean;
  subject?: any;
  isAnswered?: boolean;
  postType?: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  orientation?: string | null;
  viewCount?: number;
}

interface ProfileTabsProps {
  posts: Post[];
  profile: any;
  clerkUserId?: string | null;
  isAdmin: boolean;
  bgIsLight: boolean;
  hasCustomBg: boolean;
}

export function ProfileTabs({
  posts,
  profile,
  clerkUserId,
  isAdmin,
  bgIsLight,
  hasCustomBg,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts");

  const textPosts = posts.filter((post) => post.postType !== "REEL");
  const videoReels = posts.filter((post) => post.postType === "REEL");

  const tabTextClass = bgIsLight ? "text-gray-900" : hasCustomBg ? "text-gray-100" : "";
  const borderClass = bgIsLight ? "border-black/10" : hasCustomBg ? "border-white/10" : "border-border";

  return (
    <div className="w-full flex flex-col">
      <div className={cn("flex border-b shrink-0", borderClass)}>
        <button
          onClick={() => setActiveTab("posts")}
          className={cn(
            "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all duration-200",
            activeTab === "posts"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="size-4" />
          Academic Q&A ({textPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("reels")}
          className={cn(
            "flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all duration-200",
            activeTab === "reels"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Film className="size-4" />
          Loops ({videoReels.length})
        </button>
      </div>

      <div className="flex-1 mt-1">
        {activeTab === "posts" ? (

          textPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No Q&A posts yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {textPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    ...post,
                    author: {
                      userId: profile.userId,
                      username: profile.username,
                      displayName: profile.displayName,
                      avatar: profile.avatar,
                      customAvatar: profile.customAvatar,
                      karmaPoints: profile.karmaPoints,
                      currentStreak: profile.currentStreak || 0,
                      equippedColor: post.author.equippedColor,
                      equippedNameplate: post.author.equippedNameplate,
                    },
                    isOwnPost: post.authorId === clerkUserId,
                    isAdmin,
                  }}
                  bgIsLight={bgIsLight}
                  hasCustomBg={hasCustomBg}
                />
              ))}
            </div>
          )
        ) : (

          videoReels.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No loops uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {videoReels.map((reel) => (
                <Link
                  key={reel.id}
                  href={`/community/post/${reel.id}`}
                  className="aspect-[9/16] bg-muted border border-border rounded-xl overflow-hidden relative group flex flex-col items-center justify-center hover:brightness-110 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  {reel.thumbnailUrl ? (

                    <img
                      src={reel.thumbnailUrl}
                      alt={reel.content || "Reel"}
                      className="w-full h-full object-cover absolute inset-0 z-0"
                    />
                  ) : (
                    <Film className="size-8 text-muted-foreground/30 z-0" />
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 z-10 transition-opacity flex flex-col justify-end p-2 text-white">
                    <p className="text-[11px] font-medium line-clamp-2 leading-snug mb-1">
                      {reel.content}
                    </p>
                    <div className="flex items-center gap-1">
                      <Eye className="size-3 text-white/80" />
                      <span className="text-[10px] font-semibold text-white/90">{reel.viewCount || 0}</span>
                    </div>
                  </div>

                  <div className="absolute left-1.5 bottom-1.5 z-10 flex items-center gap-1 bg-black/40 rounded-md px-1.5 py-0.5 text-white group-hover:opacity-0 transition-opacity">
                    <Eye className="size-3 text-white/90" />
                    <span className="text-[9px] font-bold text-white">{reel.viewCount || 0}</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
