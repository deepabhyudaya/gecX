import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getCommunityProfile } from "@/actions/community-profile.actions";
import { getUserPosts } from "@/actions/community.actions";
import { getEquippedColors } from "@/actions/color-shop.actions";
import { getPendingFollowRequest } from "@/actions/follow-request.actions";
import { checkDMAccess, getPendingDMRequest } from "@/actions/dm-access.actions";
import { PostCard } from "@/components/community/PostCard";
import { KarmaBreakdown } from "@/components/community/KarmaBreakdown";
import { FollowButton } from "@/components/follow-button";
import { DMRequestButton } from "@/components/dm-request-button";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock, Users, FileText, Trophy, Settings, MessageCircle } from "lucide-react";
import { getKarmaTierGradient, getKarmaTier, getKarmaTierColor, getKarmaTierTextGradientStyle } from "@/lib/karma-tiers";
import { isLightColor } from "@/lib/color-catalog";
import { CustomAvatar } from "@/components/CustomAvatar";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";
import { ProfileTabs } from "@/components/user/ProfileTabs";

interface ProfilePageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const profile = await getCommunityProfile(params.username);
  return {
    title: profile ? `${profile.displayName || profile.username} | gecX` : "Profile | gecX",
    description: profile?.bio || `View ${params.username}'s profile on gecX`,
  };
}

export default async function CommunityProfilePage({ params }: ProfilePageProps) {
  const clerkUser = await currentUser();
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();
  const isAdmin = role === "admin";

  const profile = await getCommunityProfile(params.username);
  if (!profile) {
    notFound();
  }

  const { posts, isPrivate: isPrivateAccount } = await getUserPosts(params.username);

  const equippedColors = await getEquippedColors(profile.userId);

  const isOwnProfile = clerkUser?.id === profile.userId;
  const tier = getKarmaTier(profile.karmaPoints);

  const bgIsLight = equippedColors.profileBgColor ? isLightColor(equippedColors.profileBgColor) : false;

  const textClass = bgIsLight ? "text-gray-900" : equippedColors.profileBgColor ? "text-gray-100" : "";
  const mutedClass = bgIsLight ? "text-gray-500" : equippedColors.profileBgColor ? "text-gray-400" : "text-muted-foreground";
  const cardBgClass = bgIsLight ? "bg-white/70" : equippedColors.profileBgColor ? "bg-black/30" : "bg-muted/50";
  const cardTextClass = bgIsLight ? "text-gray-900" : equippedColors.profileBgColor ? "text-gray-100" : "";
  const borderClass = bgIsLight ? "border-black/10" : equippedColors.profileBgColor ? "border-white/10" : "border-border";
  const headerBgClass = bgIsLight ? "bg-white/90" : equippedColors.profileBgColor ? "bg-black/30" : "bg-background/95";

  const effectiveAvatar = profile.customAvatar || profile.avatar || "/noAvatar.png";

  const bgStyle: React.CSSProperties = equippedColors.profileBgColor
    ? { backgroundColor: equippedColors.profileBgColor }
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

  const usernameStyle = equippedColors.usernameColor
    ? { color: equippedColors.usernameColor }
    : getKarmaTierTextGradientStyle(profile.karmaPoints) || { color: getKarmaTierColor(profile.karmaPoints) || undefined };

  return (
    <div className={`flex-1 flex flex-col w-full relative ${textClass}`} style={bgStyle}>
      <div className={`sticky top-0 z-10 ${headerBgClass} backdrop-blur border-b ${borderClass}`}>
        <div className="px-4 py-3 flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/community"
            className={`p-2 hover:bg-black/10 rounded-full transition-colors`}
          >
            <ArrowLeft size={20} className={textClass} />
          </Link>
          <div>
            <h1 className={`text-lg font-semibold leading-tight ${textClass}`}>
              {profile.displayName || profile.username}
            </h1>
            <p className={`text-xs ${mutedClass}`}>
              {profile.postCount} posts
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full">
      {profile.bannerUrl && (
        <div className="w-full sm:rounded-t-xl overflow-hidden">
          <img
            src={profile.bannerUrl}
            alt="Profile banner"
            className="w-full aspect-[2.5/1] sm:aspect-[3/1] object-cover"
          />
        </div>
      )}

      <div className={`px-4 pb-6 pt-4 border-b ${borderClass}`}>
        <div className="flex items-start justify-between">
          <div className={`relative ${profile.bannerUrl ? "-mt-14 sm:-mt-16" : ""}`}>
            <StreakBorderAvatar
              src={profile.customAvatar || profile.avatar}
              alt={profile.username}
              streak={profile.currentStreak || 0}
              karmaPoints={profile.karmaPoints}
              size="xl"
              useRawImg={!!profile.customAvatar}
              fallback={profile.username[0]?.toUpperCase()}
            />
          </div>

          {isOwnProfile ? (
            <Link href="/settings/community">
              {equippedColors.profileBgColor ? (
                <button
                  style={
                    bgIsLight
                      ? { backgroundColor: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.18)", color: "#1a1a1a" }
                      : { backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#f1f1f1" }
                  }
                  className="inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-3 transition-opacity hover:opacity-80"
                >
                  <Settings size={14} />
                  Edit Profile
                </button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings size={14} />
                  Edit Profile
                </Button>
              )}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <FollowButton
                targetUserId={profile.userId}
                initialIsFollowing={profile.isFollowing}
                username={profile.username}
                isPrivate={profile.isPrivate || profile.requireFollowApproval}
                bgIsLight={bgIsLight}
                hasCustomBg={!!equippedColors.profileBgColor}
              />
              <DMRequestButton
                targetUserId={profile.userId}
                username={profile.username}
                bgIsLight={bgIsLight}
                hasCustomBg={!!equippedColors.profileBgColor}
                isPublic={!profile.isPrivate && !profile.requireFollowApproval}
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold" style={usernameStyle}>
            {profile.displayName || profile.username}
            {profile.isPrivate && (
              <Lock size={14} className={`inline ml-2 ${mutedClass}`} />
            )}
          </h2>
          <p className={mutedClass} style={equippedColors.usernameColor ? { color: equippedColors.usernameColor, opacity: 0.7 } : undefined}>@{profile.username}</p>

          {profile.bio && (
            <p className={`mt-3 text-sm whitespace-pre-wrap ${textClass}`}>{profile.bio}</p>
          )}

          {(profile.canViewAcademic || isOwnProfile) && (
            <Link href={`/profile?id=${profile.userId}`} className="inline-block mt-3">
              {equippedColors.profileBgColor ? (
                <button
                  style={
                    bgIsLight
                      ? { backgroundColor: "rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.18)", color: "#1a1a1a" }
                      : { backgroundColor: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#f1f1f1" }
                  }
                  className="inline-flex items-center gap-2 rounded-md text-sm font-medium h-9 px-3 transition-opacity hover:opacity-80"
                >
                  <span className="text-lg">🎓</span>
                  View Academic Profile
                </button>
              ) : (
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="text-lg">🎓</span>
                  View Academic Profile
                </Button>
              )}
            </Link>
          )}

          {profile.karmaPoints > 0 && (
            <KarmaBreakdown
              userId={profile.userId}
              initialData={{
                today: 0,
                week: 0,
                month: 0,
                total: profile.karmaPoints,
              }}
              cardBgClass={cardBgClass}
              cardTextClass={cardTextClass}
              mutedClass={mutedClass}
              borderClass={borderClass}
            />
          )}

          <div className="flex items-center gap-6 mt-4">
            <div className="cursor-default">
              <span className={`font-semibold ${textClass}`}>{profile.postCount}</span>
              <span className={`${mutedClass} ml-1`}>posts</span>
            </div>

            {profile.isPrivate && !profile.isFollowing && !isOwnProfile ? (
              <div className="cursor-default flex items-center gap-1">
                <span className={`font-semibold ${textClass}`}>{profile.followingCount}</span>
                <span className={`${mutedClass} ml-1`}>following</span>
                <Lock size={12} className={`${mutedClass} ml-0.5`} />
              </div>
            ) : (
              <Link href={`/${profile.username}/following`} className="hover:underline">
                <span className={`font-semibold ${textClass}`}>{profile.followingCount}</span>
                <span className={`${mutedClass} ml-1`}>following</span>
              </Link>
            )}

            {profile.isPrivate && !profile.isFollowing && !isOwnProfile ? (
              <div className="cursor-default flex items-center gap-1">
                <span className={`font-semibold ${textClass}`}>{profile.followerCount}</span>
                <span className={`${mutedClass} ml-1`}>followers</span>
                <Lock size={12} className={`${mutedClass} ml-0.5`} />
              </div>
            ) : (
              <Link href={`/${profile.username}/followers`} className="hover:underline">
                <span className={`font-semibold ${textClass}`}>{profile.followerCount}</span>
                <span className={`${mutedClass} ml-1`}>followers</span>
              </Link>
            )}

            {profile.karmaPoints > 0 && (
              <Link href="/leaderboard" className="flex items-center gap-1 hover:opacity-80 transition-opacity" title="View Leaderboard">
                <Trophy size={14} className="text-yellow-500" />
                <span className={`font-semibold ${textClass}`}>{profile.karmaPoints.toLocaleString()}</span>
                <span className={mutedClass}>Karma</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isPrivateAccount && !profile.isFollowing && !isOwnProfile ? (
          <div className="text-center py-12 px-4">
            <Lock size={48} className={`mx-auto ${mutedClass} mb-4`} />
            <h3 className={`font-semibold text-lg ${textClass}`}>This account is private</h3>
            <p className={`${mutedClass} mt-1`}>
              Follow @{profile.username} to see their posts
            </p>
          </div>
        ) : (
          <ProfileTabs
            posts={posts as any[]}
            profile={profile}
            clerkUserId={clerkUser?.id}
            isAdmin={isAdmin}
            bgIsLight={bgIsLight}
            hasCustomBg={!!equippedColors.profileBgColor}
          />
        )}
      </div>
      </div>
    </div>
  );
}
