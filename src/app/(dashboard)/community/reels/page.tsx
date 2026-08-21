import { ReelsFeed } from "@/components/community/ReelsFeed";
import { ReelCreator } from "@/components/community/ReelCreator";
import Link from "next/link";
import { Film, BookOpen } from "lucide-react";
import { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getMyCommunityProfile } from "@/actions/community-profile.actions";

export const metadata: Metadata = {
  title: "Loops | gecX",
  description: "Short-form vertical and horizontal video feature",
};

export default async function ReelsPage() {
  const clerkUser = await currentUser();
  const profile = await getMyCommunityProfile();
  const userImage = profile?.customAvatar || profile?.avatar || clerkUser?.imageUrl;

  return (
    <div className="flex-1 flex flex-col h-full w-full max-w-2xl mx-auto">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border shrink-0">
        <div className="px-4 pt-3 pb-0 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-lg font-semibold">Loops</h1>
              <p className="text-xs text-muted-foreground">Campus short-form video sharing</p>
            </div>
          </div>

          <div className="flex border-b border-transparent gap-4">
            <Link
              href="/community"
              className="px-4 py-2 border-b-2 border-transparent text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="size-4" />
              Q&A Feed
            </Link>
            <Link
              href="/community/reels"
              className="px-4 py-2 border-b-2 border-foreground text-sm font-semibold text-foreground flex items-center gap-1.5"
            >
              <Film className="size-4" />
              Loops
            </Link>
          </div>
        </div>
      </div>

      <ReelCreator variant="inline" userImage={userImage} />

      <div className="flex-1 min-h-0 relative">
        <ReelsFeed />
      </div>
    </div>
  );
}
