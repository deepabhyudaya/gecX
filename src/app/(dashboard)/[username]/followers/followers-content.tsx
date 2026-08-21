"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock } from "lucide-react";
import { FollowButton } from "@/components/follow-button";
import { useRouter } from "next/navigation";
import { UserCardTrigger } from "@/components/user";

interface FollowerUser {
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isFollowing: boolean;
}

interface FollowersContentProps {
  username: string;
  initialFollowers: FollowerUser[];
  currentUserId: string | null;
  isPrivateLocked?: boolean;
  profileBgColor?: string | null;
  bgIsLight?: boolean;
}

export function FollowersContent({
  username,
  initialFollowers,
  currentUserId,
  isPrivateLocked,
  profileBgColor,
  bgIsLight = false,
}: FollowersContentProps) {
  const [followers, setFollowers] = useState(initialFollowers);
  const router = useRouter();

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    if (!isFollowing) {
      setFollowers((prev) => prev.filter((u) => u.userId !== userId));
    } else {
      setFollowers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, isFollowing } : u))
      );
    }
    router.refresh();
  };

  const hasCustomBg = !!profileBgColor;
  const textClass = bgIsLight ? "text-gray-900" : hasCustomBg ? "text-gray-100" : "";
  const mutedClass = bgIsLight ? "text-gray-500" : hasCustomBg ? "text-gray-400" : "text-muted-foreground";
  const borderClass = bgIsLight ? "border-black/10" : hasCustomBg ? "border-white/10" : "border-border";
  const headerBgClass = bgIsLight ? "bg-white/90" : hasCustomBg ? "bg-black/30" : "bg-background/95";
  const itemHoverClass = bgIsLight ? "hover:bg-black/5" : hasCustomBg ? "hover:bg-white/5" : "hover:bg-muted/50";
  const avatarBgClass = bgIsLight ? "bg-black/10" : hasCustomBg ? "bg-white/10" : "bg-muted";

  const bgStyle = profileBgColor ? { backgroundColor: profileBgColor } : undefined;

  return (
    <div className={`flex-1 flex flex-col w-full ${textClass}`} style={bgStyle}>
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <div className={`sticky top-0 z-10 ${headerBgClass} backdrop-blur border-b ${borderClass}`}>
          <div className="px-4 py-3 flex items-center gap-4">
            <Link
              href={`/${username}`}
              className={`p-2 hover:bg-black/10 rounded-full transition-colors inline-flex items-center justify-center`}
            >
              <ArrowLeft size={20} className={textClass} />
            </Link>
            <div>
              <h1 className={`text-lg font-semibold ${textClass}`}>Followers</h1>
              <p className={`text-sm ${mutedClass}`}>@{username}</p>
            </div>
          </div>
        </div>

        <div className={`divide-y ${borderClass}`}>
          {isPrivateLocked ? (
            <div className="text-center py-16 px-4">
              <Lock size={64} className={`mx-auto ${mutedClass} mb-4`} />
              <h3 className={`font-semibold text-xl mb-2 ${textClass}`}>This list is private</h3>
              <p className={`${mutedClass} max-w-sm mx-auto`}>
                Follow @{username} to see who follows them
              </p>
            </div>
          ) : followers.length === 0 ? (
            <div className={`text-center py-12 ${mutedClass}`}>
              <p>No followers yet</p>
            </div>
          ) : (
            followers.map((user) => (
              <div
                key={user.userId}
                className={`flex items-center gap-3 p-4 ${itemHoverClass} transition-colors`}
              >
                <UserCardTrigger userId={user.userId}>
                  <div className={`relative w-12 h-12 rounded-full overflow-hidden ${avatarBgClass} cursor-pointer shrink-0`}>
                    <Image
                      src={user.avatar || "/noAvatar.png"}
                      alt={user.username}
                      fill
                      className="object-cover"
                    />
                  </div>
                </UserCardTrigger>

                <div className="flex-1 min-w-0">
                  <UserCardTrigger userId={user.userId}>
                    <div className="cursor-pointer">
                      <p className={`font-semibold truncate hover:underline ${textClass}`}>
                        {user.displayName || user.username}
                      </p>
                      <p className={`text-sm ${mutedClass}`}>@{user.username}</p>
                    </div>
                  </UserCardTrigger>
                </div>

                {currentUserId !== user.userId && (
                  <FollowButton
                    targetUserId={user.userId}
                    initialIsFollowing={user.isFollowing}
                    username={user.username}
                    onFollowChange={(isFollowing) => handleFollowChange(user.userId, isFollowing)}
                    bgIsLight={bgIsLight}
                    hasCustomBg={hasCustomBg}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
