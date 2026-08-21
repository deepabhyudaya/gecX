"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Repeat2, Share, Play, Pause, Eye, Volume2, VolumeX } from "lucide-react";
import { likePost } from "@/actions/community.actions";
import { incrementReelViews } from "@/actions/reels.actions";
import { cn } from "@/lib/utils";
import { getKarmaTierColor, getKarmaTierTextGradientStyle } from "@/lib/karma-tiers";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";
import { UserCardTrigger } from "@/components/user";
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

interface ReelPlayerProps {
  reel: Reel;
  active: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  onCommentsClick: () => void;
  onRepostClick: () => void;
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

function formatCount(count: number): string {
  try {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(count);
  } catch {
    return count.toString();
  }
}

export function ReelPlayer({ reel, active, isMuted, onMuteToggle, onCommentsClick, onRepostClick }: ReelPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(reel.hasLiked);
  const [likeCount, setLikeCount] = useState(reel.likeCount);
  const [viewCount, setViewCount] = useState(reel.viewCount);
  const [repostCount, setRepostCount] = useState(reel.repostCount);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewLoggedRef = useRef(false);

  const youtubeId = useMemo(() => getYouTubeId(reel.videoUrl), [reel.videoUrl]);
  const isYouTube = !!youtubeId;

  useEffect(() => {
    if (active) {
      setIsPlaying(true);
      if (videoRef.current && !isYouTube) {
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      } else if (isYouTube && iframeRef.current) {

        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo" }),
          "*"
        );
      }
    } else {
      setIsPlaying(false);
      if (videoRef.current && !isYouTube) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } else if (isYouTube && iframeRef.current) {

        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo" }),
          "*"
        );
      }
    }
  }, [active, isYouTube]);

  useEffect(() => {
    if (!active) return;

    if (isYouTube && iframeRef.current) {
      const func = isMuted ? "mute" : "unMute";
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func }),
        "*"
      );
    } else if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, isYouTube, active]);

  useEffect(() => {
    if (!active || viewLoggedRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const result = await incrementReelViews(reel.id);
        if (result.success) {
          setViewCount(result.viewCount);
          viewLoggedRef.current = true;
        }
      } catch (error) {
        console.error("Failed to increment views:", error);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [active, reel.id]);

  const togglePlay = () => {
    if (isYouTube && iframeRef.current) {
      if (isPlaying) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo" }),
          "*"
        );
        setIsPlaying(false);
      } else {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "playVideo" }),
          "*"
        );
        setIsPlaying(true);
      }
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMuteToggle();
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await likePost(reel.id);
      setIsLiked(result.liked);
      setLikeCount((prev) => (result.liked ? prev + 1 : prev - 1));
    } catch {
      toast.error("Failed to like reel");
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/community/post/${reel.id}`);
    toast.success("Link copied!");
  };

  const nameColorStyle = useMemo(() => {
    if (reel.author.equippedColor) return { color: reel.author.equippedColor };
    return getKarmaTierTextGradientStyle(reel.author.karmaPoints || 0) || {
      color: getKarmaTierColor(reel.author.karmaPoints || 0) || undefined,
    };
  }, [reel.author.equippedColor, reel.author.karmaPoints]);

  const isPortrait = reel.orientation === "PORTRAIT";

  return (
    <div
      onClick={togglePlay}
      className="relative w-full h-full flex items-center justify-center bg-black snap-start overflow-hidden select-none cursor-pointer"
    >
      {isYouTube ? (
        <div className={cn("w-full relative", isPortrait ? "h-full" : "aspect-video max-h-full")}>
          <iframe
            ref={iframeRef}
            key={reel.id}
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${active ? 1 : 0}&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&enablejsapi=1&playsinline=1`}
            className="absolute inset-0 w-full h-full border-none"
            allow="autoplay; encrypted-media"
            title={reel.content}
          />
          <div className="absolute inset-0 bg-transparent z-10 pointer-events-none" />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          loop
          playsInline
          muted={isMuted}
          className={cn("max-h-full transition-all duration-300", isPortrait ? "w-full h-full object-cover" : "w-full aspect-video object-contain")}
        />
      )}

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10 transition-opacity duration-300">
          <div className="p-4 rounded-full bg-black/60 text-white scale-110 transition-transform">
            <Play className="size-10 fill-current ml-1" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-10 pointer-events-none flex flex-col justify-end min-h-[100px]">
        <div className="flex items-center gap-3 pointer-events-auto max-w-[75%]">
          <UserCardTrigger userId={reel.author.userId}>
            <div className="cursor-pointer">
              <StreakBorderAvatar
                src={reel.author.customAvatar || reel.author.avatar}
                alt={reel.author.username}
                streak={reel.author.currentStreak || 0}
                karmaPoints={reel.author.karmaPoints || 0}
                size="md"
                useRawImg={!!reel.author.customAvatar}
              />
            </div>
          </UserCardTrigger>
          <div
            className="flex flex-col min-w-0"
            style={reel.author.equippedNameplate ? { background: reel.author.equippedNameplate, padding: "2px 6px", borderRadius: "6px" } : undefined}
          >
            <UserCardTrigger userId={reel.author.userId}>
              <span className="font-semibold text-sm hover:underline cursor-pointer truncate" style={nameColorStyle}>
                {reel.author.displayName || reel.author.username}
              </span>
            </UserCardTrigger>
            <UserCardTrigger userId={reel.author.userId}>
              <span className="text-xs hover:underline cursor-pointer opacity-70 truncate" style={nameColorStyle}>
                @{reel.author.username}
              </span>
            </UserCardTrigger>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-200 line-clamp-3 leading-relaxed pointer-events-auto max-w-[75%]">
          {reel.content}
        </p>
      </div>

      <div className="absolute right-3 bottom-20 landscape:bottom-4 z-20 flex flex-col items-center gap-2 sm:gap-3 landscape:flex-row landscape:left-1/2 landscape:-translate-x-1/2 landscape:right-auto landscape:gap-4">
        <button
          onClick={toggleMute}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all group-active:scale-90 border border-white/5 backdrop-blur-md">
            {isMuted ? <VolumeX className="size-4 sm:size-5 text-white" /> : <Volume2 className="size-4 sm:size-5 text-white" />}
          </div>
        </button>

        <button
          onClick={handleLike}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all group-active:scale-90 border border-white/5 backdrop-blur-md">
            <Heart className={cn("size-4 sm:size-5 transition-colors", isLiked ? "fill-red-500 text-red-500" : "text-white")} />
          </div>
          <span className="text-[10px] font-medium text-white/90 text-shadow whitespace-nowrap">{formatCount(likeCount)}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onCommentsClick();
          }}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all group-active:scale-90 border border-white/5 backdrop-blur-md">
            <MessageCircle className="size-4 sm:size-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-white/90 text-shadow whitespace-nowrap">{formatCount(reel.commentCount)}</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRepostClick();
          }}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all group-active:scale-90 border border-white/5 backdrop-blur-md">
            <Repeat2 className="size-4 sm:size-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-white/90 text-shadow whitespace-nowrap">{formatCount(repostCount)}</span>
        </button>

        <button
          onClick={handleShare}
          className="group flex flex-col items-center gap-1 focus:outline-none"
        >
          <div className="p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all border border-white/5 backdrop-blur-md">
            <Share className="size-4 sm:size-5 text-white" />
          </div>
          <span className="text-[10px] font-medium text-white/90 text-shadow whitespace-nowrap">Share</span>
        </button>

        <div className="flex flex-col items-center gap-1">
          <div className="p-2 sm:p-2.5 rounded-full bg-black/20 text-white/70 border border-white/5 backdrop-blur-sm cursor-default">
            <Eye className="size-4 sm:size-5" />
          </div>
          <span className="text-[9px] font-medium text-white/80 text-shadow whitespace-nowrap">{formatCount(viewCount)}</span>
        </div>
      </div>
    </div>
  );
}
