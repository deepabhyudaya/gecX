"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";
import {
  MessageCircle,
  User,
  Users,
  Hash,
  ExternalLink,
  Loader2,
  Trophy,
  FileText
} from "lucide-react";
import { getKarmaTierColor, getKarmaTierTextGradientStyle, getKarmaTier } from "@/lib/karma-tiers";
import { isLightColor } from "@/lib/color-catalog";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { followUser } from "@/actions/community-profile.actions";
import { requestDMAccess, cancelDMRequest } from "@/actions/dm-access.actions";
import { startConversation } from "@/actions/message.actions";
import { toast } from "react-toastify";
import type { UserCardData } from "@/actions/user-card.actions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import BadgeRow from "@/components/badges/BadgeRow";

interface UserCardProps {
  user: UserCardData;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isInline?: boolean;
}

function UserCardContent({
  user,
  onClose
}: {
  user: UserCardData;
  onClose?: () => void;
}) {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [hasDMAccess, setHasDMAccess] = useState(user.hasDMAccess);
  const [isDMPending, setIsDMPending] = useState(user.hasPendingDMRequest);
  const [isDMLoading, setIsDMLoading] = useState(false);
  const router = useRouter();

  const handleFollow = async () => {
    if (isFollowLoading || user.isOwnProfile) return;
    setIsFollowLoading(true);

    try {
      const result = await followUser(user.userId);
      setIsFollowing(result.following);
      toast.success(result.following ? "Now following!" : "Unfollowed");
    } catch (error) {
      toast.error("Failed to follow user");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (isDMLoading || user.isOwnProfile) return;
    setIsDMLoading(true);

    try {
      if (hasDMAccess) {
        const convId = await startConversation(user.userId);
        router.push(`/messages?convId=${convId}&type=direct`);
        onClose?.();
      } else if (isDMPending) {
        await cancelDMRequest(user.userId);
        setIsDMPending(false);
        toast.success("DM request cancelled");
      } else {
        const result = await requestDMAccess(user.userId);
        if (result.success) {
          setIsDMPending(true);
          toast.success("DM request sent!");
        } else {
          toast.error(result.error || "Failed to send request");
        }
      }
    } catch (error) {
      toast.error("Failed to process request");
    } finally {
      setIsDMLoading(false);
    }
  };

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const tier = getKarmaTier(user.karmaPoints);
  const hasCustomBg = !!user.profileBgColor;

  const bgIsLight = hasCustomBg ? isLightColor(user.profileBgColor!) : !isDark;
  const bgStyle: React.CSSProperties = hasCustomBg
    ? { backgroundColor: user.profileBgColor || undefined }
    : tier
      ? tier.name === "Cosmic"
        ? {
            background: "linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(34,211,238,0.15) 50%, rgba(168,85,247,0.2) 100%)",
            boxShadow: "inset 0 0 60px rgba(168,85,247,0.15)",
          }
        : {
            background: `linear-gradient(135deg, ${tier.colorHex}40 0%, ${tier.colorHex}20 50%, ${tier.colorHex}30 100%)`,
          }
      : {};

  const textClass = hasCustomBg
    ? (bgIsLight ? "text-gray-900" : "text-gray-100")
    : "text-foreground";
  const mutedClass = hasCustomBg
    ? (bgIsLight ? "text-gray-600" : "text-gray-400")
    : "text-muted-foreground";

  const cardBgClass = hasCustomBg
    ? (bgIsLight
        ? "bg-white/80 border border-black/10 text-gray-900"
        : "bg-black/40 border border-white/15 text-gray-100")
    : "bg-muted/60 border border-border text-foreground";
  const borderClass = hasCustomBg
    ? (bgIsLight ? "border-black/10" : "border-white/15")
    : "border-border";

  const usernameStyle = user.equippedUsernameColor
    ? { color: user.equippedUsernameColor }
    : getKarmaTierTextGradientStyle(user.karmaPoints) || { color: getKarmaTierColor(user.karmaPoints) || undefined };

  const effectiveAvatar = user.customAvatar || user.avatar || "/noAvatar.png";
  const hasMutual = user.mutualServers.length > 0 || user.mutualGroups.length > 0;

  return (
    <div className="w-full min-h-full" style={bgStyle}>
      <div className="relative w-full h-24">
        {user.bannerUrl ? (
          <img
            src={user.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={tier
              ? tier.name === "Cosmic"
                ? {
                    background: "linear-gradient(135deg, rgba(168,85,247,0.35) 0%, rgba(34,211,238,0.2) 50%, rgba(168,85,247,0.3) 100%)",
                    boxShadow: "inset 0 0 40px rgba(168,85,247,0.2)",
                  }
                : {
                    background: `linear-gradient(135deg, ${tier.colorHex}60 0%, ${tier.colorHex}40 100%)`,
                  }
              : { backgroundColor: "hsl(var(--muted))" }}
          />
        )}
      </div>

      <div className="relative px-4 pb-4 -mt-10">

        <div className="flex items-end justify-between">
          <div className="relative">
            <StreakBorderAvatar
              src={effectiveAvatar}
              alt={user.username}
              streak={user.currentStreak || 0}
              karmaPoints={user.karmaPoints}
              size="lg"
              useRawImg={!!user.customAvatar}
              fallback={user.username[0]?.toUpperCase()}
            />
          </div>

          {user.karmaPoints > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      cardBgClass
                    )}
                  >
                    <Trophy size={12} className="text-yellow-500" />
                    <span>{user.karmaPoints.toLocaleString()}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Karma Points</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3
              className={cn(
                "text-lg font-bold",
                user.equippedNameplate && "px-2 py-0.5 rounded-md inline-block"
              )}
              style={{
                ...usernameStyle,
                ...(user.equippedNameplate ? {
                  background: user.equippedNameplate,
                  textShadow: "0 1px 2px rgba(0,0,0,0.4)"
                } : {})
              }}
            >
              {user.displayName || user.username}
            </h3>
            <BadgeRow userId={user.userId} isSelf={user.isOwnProfile} />
          </div>
          <p className={cn("text-sm", mutedClass)}>
            @{user.username}
          </p>
        </div>

        {user.bio && (
          <p className={cn("mt-3 text-sm", textClass)}>
            {user.bio.length > 100 ? `${user.bio.slice(0, 100)}...` : user.bio}
          </p>
        )}

        <div className={cn(
          "flex items-center gap-4 mt-3 text-sm",
          mutedClass
        )}>
          <div className="flex items-center gap-1">
            <FileText size={14} />
            <span className={cn("font-semibold", textClass)}>{user.postCount}</span>
            <span>posts</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span className={cn("font-semibold", textClass)}>{user.followerCount}</span>
            <span>followers</span>
          </div>
          <div className="flex items-center gap-1">
            <User size={14} />
            <span className={cn("font-semibold", textClass)}>{user.followingCount}</span>
            <span>following</span>
          </div>
        </div>

        {hasMutual && (
          <div className={cn("mt-3 pt-3 border-t", borderClass)}>
            {user.mutualServers.length > 0 && (
              <div className="mb-2">
                <p className={cn("text-xs font-medium mb-1.5", mutedClass)}>
                  {user.mutualServers.length === 1 ? "1 Mutual Server" : `${user.mutualServers.length} Mutual Servers`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user.mutualServers.map(server => (
                    <TooltipProvider key={server.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/servers/${server.id}`}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                              cardBgClass,
                              "hover:opacity-80 transition-opacity"
                            )}
                          >
                            {server.iconUrl ? (
                              <img src={server.iconUrl} alt="" className="w-4 h-4 rounded" />
                            ) : (
                              <div className={cn("w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-[8px] font-bold", textClass)}>
                                {server.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <span className={cn("truncate max-w-[100px]", textClass)}>{server.name}</span>
                            {server.targetRoles && server.targetRoles.length > 0 && (
                              <div className="flex gap-0.5">
                                {server.targetRoles.map((role) => (
                                  <span
                                    key={role.id}
                                    className="text-[9px] px-1 py-0.5 rounded-full font-medium border inline-flex items-center gap-0.5"
                                    style={role.color ? {
                                      backgroundColor: `${role.color}20`,
                                      borderColor: role.color,
                                      color: role.color,
                                    } : undefined}
                                  >
                                    {role.iconUrl && (
                                      <img src={role.iconUrl} alt="" className="w-2.5 h-2.5 rounded-sm object-contain" />
                                    )}
                                    {role.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{server.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )}

            {user.mutualGroups.length > 0 && (
              <div>
                <p className={cn("text-xs font-medium mb-1.5", mutedClass)}>
                  {user.mutualGroups.length === 1 ? "1 Mutual Group" : `${user.mutualGroups.length} Mutual Groups`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {user.mutualGroups.map(group => (
                    <TooltipProvider key={group.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={`/messages?convId=${group.id}&type=group`}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                              cardBgClass,
                              "hover:opacity-80 transition-opacity"
                            )}
                          >
                            <Hash size={12} className={textClass} />
                            <span className={cn("truncate max-w-[100px]", textClass)}>{group.name}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{group.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!user.isOwnProfile && (
          <div className="flex gap-2 mt-4">
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={handleFollow}
              disabled={isFollowLoading}
              className="flex-1"
            >
              {isFollowLoading && <Loader2 size={14} className="animate-spin mr-1" />}
              {isFollowing ? "Following" : user.requireFollowApproval ? "Request Follow" : "Follow"}
            </Button>

            <Button
              variant={hasDMAccess || isDMPending ? "outline" : "default"}
              size="sm"
              onClick={handleMessage}
              disabled={isDMLoading}
              className="flex-1 gap-1"
              style={!hasDMAccess && !isDMPending ? { backgroundColor: "#10b981", borderColor: "#10b981" } : undefined}
            >
              {isDMLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
              {hasDMAccess ? "Message" : isDMPending ? "Request Sent" : "Request DM"}
            </Button>
          </div>
        )}

        <Link
          href={`/${user.username}`}
          onClick={onClose}
          className={cn(
            "flex items-center justify-center gap-1.5 mt-3 pt-3 border-t text-sm font-medium hover:underline",
            borderClass,
            textClass
          )}
        >
          <ExternalLink size={14} />
          View Full Profile
        </Link>
      </div>
    </div>
  );
}

export function UserCard({ user, children, open: controlledOpen, onOpenChange, isInline }: UserCardProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  if (isInline) {
    return <UserCardContent user={user} />;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="p-0 overflow-hidden max-w-[380px] border-0">
        <UserCardContent user={user} onClose={() => handleOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
