import { auth } from "@clerk/nextjs/server";
import { getFollowing, getCommunityProfile } from "@/actions/community-profile.actions";
import { getEquippedColors } from "@/actions/color-shop.actions";
import { FollowingContent } from "./following-content";
import { isLightColor } from "@/lib/color-catalog";
import { Metadata } from "next";

interface FollowingPageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: FollowingPageProps): Promise<Metadata> {
  return {
    title: `${params.username} is following | gecX`,
  };
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { userId } = auth();

  const profile = await getCommunityProfile(params.username);
  const isPrivateLocked = profile?.isPrivate && !profile.isFollowing && profile.userId !== userId;

  const following = isPrivateLocked ? [] : await getFollowing(params.username);

  const equippedColors = profile ? await getEquippedColors(profile.userId) : null;
  const profileBgColor = equippedColors?.profileBgColor ?? null;
  const bgIsLight = profileBgColor ? isLightColor(profileBgColor) : false;

  return (
    <FollowingContent
      username={params.username}
      initialFollowing={following}
      currentUserId={userId}
      isPrivateLocked={isPrivateLocked}
      profileBgColor={profileBgColor}
      bgIsLight={bgIsLight}
    />
  );
}
