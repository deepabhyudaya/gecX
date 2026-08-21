"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LeaderboardTable } from "./LeaderboardTable";
import { TimeframeTabs, type Timeframe } from "./TimeframeTabs";
import { Trophy, RefreshCw } from "lucide-react";
import type { LeaderboardEntry } from "@/actions/karma-tracking.actions";

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardEntry[];
  initialMyRank: number | null;
  userId: string | null;
  initialTimeframe: Timeframe;
}

export function LeaderboardClient({
  initialLeaderboard,
  initialMyRank,
  userId,
  initialTimeframe,
}: LeaderboardClientProps) {
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [myRank, setMyRank] = useState(initialMyRank);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const refreshData = useCallback(async (newTimeframe?: Timeframe) => {
    const tf = newTimeframe || timeframe;
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/leaderboard?timeframe=${tf}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        if (typeof window !== 'undefined') {
          setLastUpdated(new Date());
        }

        if (userId && data.leaderboard) {
          const myEntry = data.leaderboard.find((e: LeaderboardEntry) => e.userId === userId);
          setMyRank(myEntry?.rank || null);
        }
      }
    } catch (error) {
      console.error("Failed to refresh leaderboard:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [timeframe, userId]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    setTimeframe(newTimeframe);

    const url = new URL(window.location.href);
    url.searchParams.set("timeframe", newTimeframe);
    window.history.pushState({}, "", url);
    refreshData(newTimeframe);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "karmaUpdate") {
        refreshData();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshData]);

  useEffect(() => {
    setIsMounted(true);
    setLastUpdated(new Date());
  }, []);

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Leaderboard</h1>
                <p className="text-xs text-muted-foreground">
                  Top contributors in your college
                </p>
              </div>
            </div>
            <button
              onClick={() => refreshData()}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              <motion.div
                animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            </button>
          </div>

          <TimeframeTabs current={timeframe} onChange={handleTimeframeChange} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {userId && myRank && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-3 bg-primary/5 border-b border-border"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Rank</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">#{myRank}</span>
                <span className="text-xs text-muted-foreground">
                  in {timeframe === "all" ? "all time" : `this ${timeframe}`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={timeframe + (lastUpdated?.toISOString() || '')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LeaderboardTable
              entries={leaderboard}
              currentUserId={userId}
              isLoading={isRefreshing && leaderboard.length === 0}
            />
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Earn karma by posting, commenting, getting likes, and maintaining good attendance.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isMounted && lastUpdated && (
              <>Last updated: {lastUpdated.toLocaleTimeString()}</>
            )}
            {isRefreshing && <span className="ml-2 text-primary">• Updating...</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
