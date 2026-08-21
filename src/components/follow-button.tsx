"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { followUser } from "@/actions/community-profile.actions";
import { getPendingFollowRequest } from "@/actions/follow-request.actions";
import { useRouter } from "next/navigation";

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
  username: string;
  onFollowChange?: (isFollowing: boolean) => void;
  bgIsLight?: boolean;
  hasCustomBg?: boolean;
  isPrivate?: boolean;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing,
  username,
  onFollowChange,
  bgIsLight = false,
  hasCustomBg = false,
  isPrivate = false,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkPending = async () => {
      const result = await getPendingFollowRequest(targetUserId);
      if (result?.type === "outgoing") {
        setIsPending(true);
      }
    };
    checkPending();
  }, [targetUserId]);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;

    if (isPending) {
      setIsLoading(true);
      try {
        const result = await followUser(targetUserId);
        if (!result.pending) {
          setIsPending(false);
        }
        router.refresh();
      } catch (error) {
        console.error("Cancel follow request failed:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);
    onFollowChange?.(newFollowingState);

    setIsLoading(true);
    try {
      const result = await followUser(targetUserId);
      if (result.pending) {

        setIsPending(true);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else if (result.following !== newFollowingState) {
        setIsFollowing(result.following);
        onFollowChange?.(result.following);
      }
      router.refresh();
    } catch (error) {
      console.error("Follow action failed:", error);
      setIsFollowing(!newFollowingState);
      onFollowChange?.(!newFollowingState);
    } finally {
      setIsLoading(false);
    }
  }, [isFollowing, isPending, isLoading, targetUserId, onFollowChange, router]);

  const getLabel = () => {
    if (isFollowing) return "Following";
    if (isPending) return "Request Sent";
    if (isPrivate) return "Request Follow";
    return "Follow";
  };

  if (hasCustomBg) {
    const btnStyle: React.CSSProperties = isFollowing || isPending
      ? bgIsLight
        ? { backgroundColor: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.18)", color: "#1a1a1a" }
        : { backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#f1f1f1" }
      : { backgroundColor: "#3b82f6", border: "1px solid #3b82f6", color: "#ffffff" };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        style={btnStyle}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        {getLabel()}
      </button>
    );
  }

  return (
    <Button
      variant={isFollowing || isPending ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className="transition-all duration-150"
    >
      {getLabel()}
    </Button>
  );
}
