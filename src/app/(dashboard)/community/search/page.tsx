"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Loader2, UserPlus, UserCheck, ArrowLeft } from "lucide-react";
import { searchUsers, followUser, getPublicUsers } from "@/actions/community-profile.actions";
import { UserCardTrigger } from "@/components/user";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { useDebounce } from "@/hooks/use-debounce";

interface UserResult {
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  followerCount: number;
  isPrivate: boolean;
  isFollowing: boolean;
  isOwnProfile: boolean;
  karmaPoints?: number;
  currentStreak?: number;
}

export default function SearchUsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  const debouncedQuery = useDebounce(query, 300);

  const loadPublicUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await getPublicUsers();
      setUsers(results as UserResult[]);
      const map: Record<string, boolean> = {};
      (results as UserResult[]).forEach((user) => {
        map[user.userId] = user.isFollowing;
      });
      setFollowingMap(map);
    } catch (error) {
      console.error("Failed to load public users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      loadPublicUsers();
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchUsers(searchQuery);
      setUsers(results as UserResult[]);
      const map: Record<string, boolean> = {};
      (results as UserResult[]).forEach((user) => {
        map[user.userId] = user.isFollowing;
      });
      setFollowingMap(map);
    } catch (error) {
      toast.error("Failed to search users");
    } finally {
      setIsLoading(false);
    }
  }, [loadPublicUsers]);

  useEffect(() => {
    loadPublicUsers();
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleFollow = async (userId: string) => {
    try {
      const result = await followUser(userId);
      setFollowingMap((prev) => ({ ...prev, [userId]: result.following }));
    } catch (error) {
      console.error("Failed to follow user:", error);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-4">
          <Link
            href="/community"
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold">Search Users</h1>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : query.trim() && users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
              >
                <UserCardTrigger userId={user.userId}>
                  <div className="cursor-pointer shrink-0">
                    <StreakBorderAvatar
                      src={user.avatar || "/noAvatar.png"}
                      alt={user.username}
                      streak={user.currentStreak || 0}
                      karmaPoints={user.karmaPoints || 0}
                      size="md"
                    />
                  </div>
                </UserCardTrigger>

                <div className="flex-1 min-w-0">
                  <UserCardTrigger userId={user.userId}>
                    <div className="cursor-pointer">
                      <p className="font-semibold truncate hover:underline">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{user.username} · {user.followerCount.toLocaleString()} followers
                      </p>
                    </div>
                  </UserCardTrigger>
                </div>

                {!user.isOwnProfile && (
                  <Button
                    variant={followingMap[user.userId] ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleFollow(user.userId)}
                    className="shrink-0 gap-1.5"
                  >
                    {followingMap[user.userId] ? (
                      <>
                        <UserCheck size={14} />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        {user.isPrivate ? "Request" : "Follow"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
