import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getMyCommunityProfile } from "@/actions/community-profile.actions";
import { getUserPosts } from "@/actions/community.actions";
import { getEquippedColors } from "@/actions/color-shop.actions";
import { PostCard } from "@/components/community/PostCard";
import { KarmaBreakdown } from "@/components/community/KarmaBreakdown";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lock, FileText, Trophy, Settings, User } from "lucide-react";
import { getKarmaTier, getKarmaTierColor, getKarmaTierTextGradientStyle } from "@/lib/karma-tiers";
import { isLightColor } from "@/lib/color-catalog";
import { CustomAvatar } from "@/components/CustomAvatar";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";

export const metadata: Metadata = {
  title: "My Community Profile | gecX",
  description: "View and manage your community profile",
};

export default async function MyCommunityProfilePage() {
  const clerkUser = await currentUser();
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();
  const isAdmin = role === "admin";

  if (!clerkUser) {
    redirect("/sign-in");
  }

  const profile = await getMyCommunityProfile();
  if (!profile) {
    notFound();
  }

  const [{ posts }, equippedColors] = await Promise.all([
    getUserPosts(profile.username),
    getEquippedColors(profile.userId),
  ]);

  const tier = getKarmaTier(profile.karmaPoints);

  const bgIsLight = equippedColors.profileBgColor ? isLightColor(equippedColors.profileBgColor) : false;

  const themeVariables = bgIsLight
    ? {
        "--foreground": "222.2 84% 4.9%",
        "--muted": "210 40% 96.1%",
        "--muted-foreground": "215.4 16.3% 46.9%",
        "--border": "214.3 31.8% 91.4%",
        "--card": "0 0% 100%",
        "--card-foreground": "222.2 84% 4.9%",
        "--accent": "210 40% 96.1%",
        "--accent-foreground": "222.2 47.4% 11.2%",
      } as React.CSSProperties
    : equippedColors.profileBgColor
      ? {
          "--foreground": "0 0% 98%",
          "--muted": "0 0% 10%",
          "--muted-foreground": "0 0% 64%",
          "--border": "240 3.7% 15.9%",
          "--card": "0 0% 0%",
          "--card-foreground": "0 0% 98%",
          "--accent": "0 0% 12%",
          "--accent-foreground": "0 0% 98%",
        } as React.CSSProperties
      : {};

  const effectiveAvatar = profile.customAvatar || profile.avatar || "/noAvatar.png";

  const bgStyle = {
    ...themeVariables,
    ...(equippedColors.profileBgColor
      ? { backgroundColor: equippedColors.profileBgColor }
      : tier
        ? tier.name === "Cosmic"
          ? {
              background: "linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(34,211,238,0.15) 50%, rgba(168,85,247,0.2) 100%)",
              boxShadow: "inset 0 0 60px rgba(168,85,247,0.15)",
            }
          : { background: `linear-gradient(135deg, ${tier.colorHex}40 0%, ${tier.colorHex}20 50%, ${tier.colorHex}30 100%)` }
        : {}),
  };

  const usernameStyle = equippedColors.usernameColor
    ? { color: equippedColors.usernameColor }
    : getKarmaTierTextGradientStyle(profile.karmaPoints) || { color: getKarmaTierColor(profile.karmaPoints) || undefined };

  return (
    <div className="flex-1 flex flex-col w-full relative" style={bgStyle}>
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-4 max-w-2xl mx-auto">
          <Link
            href="/community"
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <User size={20} className="text-muted-foreground" />
            <h1 className="text-lg font-semibold leading-tight">
              My Profile
            </h1>
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

      <div className="px-4 pb-6 pt-4 border-b border-border">
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

          <Link href="/settings/community">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings size={14} />
              Edit Profile
            </Button>
          </Link>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold" style={usernameStyle}>
            {profile.displayName || profile.username}
            {profile.isPrivate && (
              <Lock size={14} className="inline ml-2 text-muted-foreground" />
            )}
          </h2>
          <p className="text-muted-foreground" style={equippedColors.usernameColor ? { color: equippedColors.usernameColor, opacity: 0.7 } : undefined}>@{profile.username}</p>

          {profile.bio && (
            <p className="mt-3 text-sm whitespace-pre-wrap">{profile.bio}</p>
          )}

          {(role === "student" || role === "teacher") && (
            <Link href="/profile">
              <Button variant="outline" size="sm" className="mt-3 gap-2">
                <span className="text-lg">🎓</span>
                View Academic Profile
              </Button>
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
            />
          )}

          <div className="flex items-center gap-6 mt-4">
            <Link href={`/${profile.username}/following`} className="hover:underline">
              <span className="font-semibold">{profile.followingCount}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </Link>
            <Link href={`/${profile.username}/followers`} className="hover:underline">
              <span className="font-semibold">{profile.followerCount}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </Link>
            {profile.karmaPoints > 0 && (
              <Link href="/leaderboard" className="flex items-center gap-1 hover:opacity-80 transition-opacity" title="View Leaderboard">
                <Trophy size={14} className="text-yellow-500" />
                <span className="font-semibold">{profile.karmaPoints.toLocaleString("en-US")}</span>
                <span className="text-muted-foreground">Karma</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div>
        {posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText size={48} className="mx-auto mb-4" />
            <p>No posts yet</p>
            <p className="mt-1">Share your first post with the community!</p>
            <Link href="/community">
              <Button className="mt-4" variant="outline">
                Go to Feed
              </Button>
            </Link>
          </div>
        ) : (
          posts.map((post) => (
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
                  equippedColor: equippedColors.usernameColor || null,
                  equippedNameplate: equippedColors.nameplateBg || null,
                },
                originalPost: post.originalPost ? {
                  ...post.originalPost,
                  authorImage: post.originalPost.author?.avatar || null,
                  author: {
                    userId: (post.originalPost.author as any)?.userId || "unknown",
                    username: post.originalPost.author?.username || "unknown",
                    displayName: post.originalPost.author?.displayName,
                    avatar: post.originalPost.author?.avatar,
                    customAvatar: (post.originalPost.author as any)?.customAvatar || null,
                    karmaPoints: (post.originalPost.author as any)?.karmaPoints || 0,
                    currentStreak: (post.originalPost.author as any)?.currentStreak || 0,
                    equippedColor: (post.originalPost.author as any)?.equippedColor || null,
                    equippedNameplate: (post.originalPost.author as any)?.equippedNameplate || null,
                  },
                } : null,
                isOwnPost: true,
                isAdmin,
              }}
            />
          ))
        )}
      </div>
      </div>
    </div>
  );
}
