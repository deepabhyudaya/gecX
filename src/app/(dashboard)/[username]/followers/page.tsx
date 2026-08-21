import { auth } from "@clerk/nextjs/server";
import { getFollowers, getCommunityProfile } from "@/actions/community-profile.actions";
import { getEquippedColors } from "@/actions/color-shop.actions";
import { FollowersContent } from "./followers-content";
import { isLightColor } from "@/lib/color-catalog";
import { Metadata } from "next";

interface FollowersPageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: FollowersPageProps): Promise<Metadata> {
  return {
    title: `Followers of ${params.username} | gecX`,
  };
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const { userId } = auth();

  const profile = await getCommunityProfile(params.username);
  const isPrivateLocked = profile?.isPrivate && !profile.isFollowing && profile.userId !== userId;

  const followers = isPrivateLocked ? [] : await getFollowers(params.username);

  const equippedColors = profile ? await getEquippedColors(profile.userId) : null;
  const profileBgColor = equippedColors?.profileBgColor ?? null;
  const bgIsLight = profileBgColor ? isLightColor(profileBgColor) : false;

  return (
    <FollowersContent
      username={params.username}
      initialFollowers={followers}
      currentUserId={userId}
      isPrivateLocked={isPrivateLocked}
      profileBgColor={profileBgColor}
      bgIsLight={bgIsLight}
    />
  );
}
