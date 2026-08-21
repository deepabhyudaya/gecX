"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, ArrowUp, ArrowDown, Minus } from "lucide-react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/actions/karma-tracking.actions";
import { UserCardTrigger } from "@/components/user";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string | null;
  isLoading?: boolean;
}

const rankIcons = [
  { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10" },
  { icon: Medal, color: "text-amber-600", bg: "bg-amber-600/10" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

export function LeaderboardTable({
  entries,
  currentUserId,
  isLoading,
}: LeaderboardTableProps) {
  if (isLoading) {
    return <LeaderboardSkeleton />;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No karma yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Be the first to earn karma by posting, commenting, and engaging with the community!
        </p>
      </div>
    );
  }

  const currentUserEntry = entries.find((e) => e.userId === currentUserId);
  const showCurrentUserBanner = currentUserEntry && currentUserEntry.rank > 20;

  return (
    <div className="space-y-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2"
      >
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
            isCurrentUser={entry.userId === currentUserId}
          />
        ))}
      </motion.div>

      {showCurrentUserBanner && currentUserEntry && (
        <div className="pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center mb-3">
            Your current rank
          </div>
          <LeaderboardRow
            entry={currentUserEntry}
            isCurrentUser={true}
          />
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const rankStyle = rankIcons[entry.rank - 1];
  const RankIcon = rankStyle?.icon;

  return (
    <motion.div
      variants={rowVariants}
      className={`
        group flex items-center gap-4 p-3 rounded-xl
        transition-all duration-200
        ${isCurrentUser
          ? "bg-primary/5 border border-primary/20"
          : "hover:bg-muted/50 border border-transparent"
        }
      `}
    >
      <div className="w-10 flex justify-center">
        {RankIcon ? (
          <div className={`w-8 h-8 rounded-full ${rankStyle.bg} flex items-center justify-center`}>
            <RankIcon className={`w-4 h-4 ${rankStyle.color}`} />
          </div>
        ) : (
          <span className="text-lg font-semibold text-muted-foreground">
            #{entry.rank}
          </span>
        )}
      </div>

      <UserCardTrigger userId={entry.userId}>
        <div className="cursor-pointer">
          <StreakBorderAvatar
            src={entry.avatar}
            alt={entry.username}
            streak={entry.currentStreak || 0}
            karmaPoints={entry.totalKarma || 0}
            size="md"
            fallback={entry.displayName?.[0]?.toUpperCase() || entry.username[0]?.toUpperCase()}
          />
        </div>
      </UserCardTrigger>

      <div className="flex-1 min-w-0">
        <UserCardTrigger userId={entry.userId}>
          <span className="block font-semibold text-sm hover:underline truncate cursor-pointer">
            {entry.displayName || entry.username}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-primary font-normal">(You)</span>
            )}
          </span>
        </UserCardTrigger>
        <p className="text-xs text-muted-foreground truncate">@{entry.username}</p>
      </div>

      <div className="text-right shrink-0">
        <div className="flex items-center gap-1.5 justify-end">
          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
          <span className="font-bold text-sm">
            {entry.karmaEarned.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {entry.totalKarma.toLocaleString()} total
        </p>
      </div>
    </motion.div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 rounded-xl animate-pulse"
        >
          <div className="w-10 flex justify-center">
            <div className="w-6 h-6 rounded-full bg-muted" />
          </div>
          <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
          <div className="space-y-2 text-right">
            <div className="h-4 bg-muted rounded w-16 ml-auto" />
            <div className="h-3 bg-muted rounded w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}
