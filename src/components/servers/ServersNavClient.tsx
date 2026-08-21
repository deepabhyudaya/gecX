"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import ServerSidebar from "./ServerSidebar";
import ServerChannelList from "./ServerChannelList";
import {
  getServerChannels,
  getServerCategories,
  getServerMembers,
} from "@/actions/server.actions";
import { getServerEmojis } from "@/actions/emoji-sticker.actions";

interface ServersNavClientProps {
  servers: any[];
  children: React.ReactNode;
}

export default function ServersNavClient({ servers, children }: ServersNavClientProps) {
  const searchParams = useSearchParams();
  const serverId = searchParams.get("serverId");
  const channelId = searchParams.get("channelId");
  const selectedServer = servers.find((s) => s.id === serverId);

  const [channels, setChannels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [serverData, setServerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasChannel = !!channelId && channels.some((c) => c.id === channelId);

  const fetchServerData = useCallback(async (sid: string) => {
    setIsLoading(true);
    try {
      const [ch, cat, mem, media] = await Promise.all([
        getServerChannels(sid),
        getServerCategories(sid),
        getServerMembers(sid),
        getServerEmojis(sid),
      ]);
      setChannels(ch);
      setCategories(cat);
      setServerData({
        members: mem.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          username: m.username,
          displayName: m.displayName,
          isMuted: m.isMuted,
          joinedAt: m.joinedAt,
          karmaPoints: m.karmaPoints,
          equippedColor: m.equippedColor,
          equippedNameplate: m.equippedNameplate,
          roles: m.roles || [],
        })),
        serverEmojis: media.emojis,
        serverStickers: media.stickers,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (serverId) {
      fetchServerData(serverId);
    } else {
      setChannels([]);
      setCategories([]);
      setServerData(null);
    }
  }, [serverId, fetchServerData]);

  return (
    <>
      <div className="hidden md:flex flex-col shrink-0">
        <ServerSidebar
          servers={servers.map((s) => ({
            id: s.id,
            name: s.name,
            icon: s.iconUrl || s.icon,
            myRole: s.myRole,
            unreadCount: s.unreadCount,
          }))}
          selectedServerId={serverId || undefined}
        />
      </div>

      {selectedServer ? (
        <>
          {!hasChannel && (
            <div className="flex md:hidden flex-1 min-w-0">
              <ServerSidebar
                servers={servers.map((s) => ({
                  id: s.id,
                  name: s.name,
                  icon: s.iconUrl || s.icon,
                  myRole: s.myRole,
                  unreadCount: s.unreadCount,
                }))}
                selectedServerId={serverId || undefined}
              />
              <div className="flex-1 min-w-0">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse space-y-3 w-full p-4">
                      <div className="h-10 bg-muted rounded-lg" />
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-8 bg-muted rounded-md" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <ServerChannelList
                    server={{
                      id: selectedServer.id,
                      name: selectedServer.name,
                      description: selectedServer.description,
                      inviteCode: selectedServer.inviteCode,
                      isDiscoverable: selectedServer.isDiscoverable,
                      myRole: selectedServer.myRole,
                      myPermissions: selectedServer.myPermissions,
                      createdById: selectedServer.createdById,
                      iconUrl: selectedServer.iconUrl,
                      bannerUrl: selectedServer.bannerUrl,
                    }}
                    channels={channels}
                    categories={categories}
                    selectedChannelId={channelId || undefined}
                  />
                )}
              </div>
            </div>
          )}

          <div className={`${hasChannel ? "hidden md:flex" : "hidden md:flex"} flex-col`}>
            {isLoading ? (
              <div className="w-64 p-3 space-y-2 animate-pulse">
                <div className="h-10 bg-muted rounded-lg" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded-md" />
                ))}
              </div>
            ) : (
              <ServerChannelList
                server={{
                  id: selectedServer.id,
                  name: selectedServer.name,
                  description: selectedServer.description,
                  inviteCode: selectedServer.inviteCode,
                  isDiscoverable: selectedServer.isDiscoverable,
                  myRole: selectedServer.myRole,
                  myPermissions: selectedServer.myPermissions,
                  createdById: selectedServer.createdById,
                  iconUrl: selectedServer.iconUrl,
                  bannerUrl: selectedServer.bannerUrl,
                }}
                channels={channels}
                categories={categories}
                selectedChannelId={channelId || undefined}
              />
            )}
          </div>

          {children}
        </>
      ) : (
        <>
          <div className="flex md:hidden flex-1">
            <ServerSidebar
              servers={servers.map((s) => ({
                id: s.id,
                name: s.name,
                icon: s.iconUrl || s.icon,
                myRole: s.myRole,
                unreadCount: s.unreadCount,
              }))}
              selectedServerId={serverId || undefined}
            />
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center max-w-md px-6">
                <h3 className="text-xl font-semibold mb-4">Select a server</h3>
                <p className="text-sm">Pick a server to view its channels.</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center max-w-md">
              <h3 className="text-xl font-semibold mb-4">Welcome to Servers</h3>
              <p className="text-sm mb-6">
                Create or join a server to start chatting with your friends and classmates.
              </p>
              <p className="text-xs text-muted-foreground">
                Click the + button in the sidebar to create a server, or the compass to discover public servers.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
