"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getReelsFeed, incrementReelViews } from "@/actions/reels.actions";
import { getComments } from "@/actions/community-comment.actions";
import { getMyCommunityProfile } from "@/actions/community-profile.actions";
import { repostPost } from "@/actions/community.actions";
import { ReelPlayer } from "./ReelPlayer";
import { CommentList } from "./CommentList";
import { CommentCreator } from "./CommentCreator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { toast } from "react-toastify";

interface ReelAuthor {
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

interface Reel {
  id: string;
  content: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  orientation: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  hasLiked: boolean;
  author: ReelAuthor;
}

export function ReelsFeed() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const [activeReelComments, setActiveReelComments] = useState<any[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsTargetReelId, setCommentsTargetReelId] = useState<string | null>(null);

  const [isMuted, setIsMuted] = useState(true);

  const [userProfile, setUserProfile] = useState<any>(null);
  const { user } = useClerk();

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getReelsFeed();
      setReels(result.reels as any[]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      toast.error("Failed to load reels feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    getMyCommunityProfile().then((profile) => {
      setUserProfile(profile);
    }).catch(() => {});
  }, [loadFeed]);

  const loadMoreReels = async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await getReelsFeed(cursor);
      setReels((prev) => [...prev, ...(result.reels as any[])]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      toast.error("Failed to load more reels");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollPos = container.scrollTop;
    const clientHeight = container.clientHeight;

    const nextIndex = Math.round(scrollPos / clientHeight);
    if (nextIndex !== activeIndex && nextIndex >= 0 && nextIndex < reels.length) {
      setActiveIndex(nextIndex);
    }

    const scrollRemaining = container.scrollHeight - (scrollPos + clientHeight);
    if (scrollRemaining < clientHeight * 2 && hasMore && !loadingMore) {
      loadMoreReels();
    }
  };

  const handleOpenComments = async (reelId: string) => {
    setCommentsTargetReelId(reelId);
    setCommentsOpen(true);
    setLoadingComments(true);
    try {
      const result = await getComments(reelId);
      setActiveReelComments(result.comments);
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentCreated = async () => {
    if (!commentsTargetReelId) return;

    setReels((prev) =>
      prev.map((r) =>
        r.id === commentsTargetReelId ? { ...r, commentCount: r.commentCount + 1 } : r
      )
    );

    try {
      const result = await getComments(commentsTargetReelId);
      setActiveReelComments(result.comments);
    } catch {}
  };

  const handleRepost = async (reelId: string) => {
    try {
      await repostPost(reelId);
      setReels((prev) =>
        prev.map((r) =>
          r.id === reelId ? { ...r, repostCount: r.repostCount + 1 } : r
        )
      );
      toast.success("Replaced to your feed: Reel reposted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to repost reel");
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white/50 gap-2">
        <span className="text-sm">No loops uploaded yet.</span>
      </div>
    );
  }

  const userAvatar = userProfile?.customAvatar || userProfile?.avatar || user?.imageUrl;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <div
        ref={feedContainerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth"
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="w-full h-full snap-start">
            <ReelPlayer
              reel={reel}
              active={index === activeIndex}
              isMuted={isMuted}
              onMuteToggle={() => setIsMuted((prev) => !prev)}
              onCommentsClick={() => handleOpenComments(reel.id)}
              onRepostClick={() => handleRepost(reel.id)}
            />
          </div>
        ))}

        {loadingMore && (
          <div className="w-full py-6 flex justify-center bg-black text-white">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
      </div>

      <Sheet open={commentsOpen} onOpenChange={setCommentsOpen}>
        <SheetContent side="bottom" className="max-h-[60vh] h-[60vh] max-w-2xl mx-auto p-0 flex flex-col bg-background/95 backdrop-blur-md rounded-t-2xl border-t border-border">
          <SheetHeader className="px-4 py-3 border-b border-border shrink-0 flex flex-row items-center justify-between">
            <SheetTitle className="text-sm font-semibold tracking-wide text-foreground">Answers & Comments</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            {loadingComments ? (
              <div className="w-full py-12 flex justify-center text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
              </div>
            ) : (
              <CommentList
                comments={activeReelComments}
                postId={commentsTargetReelId || ""}
                userImage={userAvatar}
                clerkUserId={user?.id}
              />
            )}
          </div>

          <div className="p-4 border-t border-border bg-background shrink-0">
            <CommentCreator
              postId={commentsTargetReelId || ""}
              userImage={userAvatar}
              onCommentCreated={handleCommentCreated}
              placeholder="Write a comment..."
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
