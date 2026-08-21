import {
  getMyServers,
  getServerMessages,
  getServerMembers,
} from "@/actions/server.actions";
import { getServerEmojis } from "@/actions/emoji-sticker.actions";
import ServerChatView from "@/components/servers/ServerChatView";
import { getMyCommunityProfile } from "@/actions/community-profile.actions";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

interface ServersPageProps {
  searchParams: { [key: string]: string | undefined };
}

export default async function ServersPage({ searchParams }: ServersPageProps) {
  const { userId } = auth();
  if (!userId) return null;

  const servers = await getMyServers();
  const selectedServerId = searchParams.serverId;
  const selectedChannelId = searchParams.channelId;

  if (!selectedServerId && servers.length > 0) {
    redirect(`/servers?serverId=${servers[0].id}`);
  }

  const selectedServer = servers.find((s) => s.id === selectedServerId) || null;
  let messages: any[] = [];
  let members: any[] = [];
  let serverEmojis: any[] = [];
  let serverStickers: any[] = [];
  let currentUserProfile = null;

  if (selectedServer && selectedChannelId) {
    const [messagesData, membersData, media, profile] = await Promise.all([
      getServerMessages(selectedChannelId),
      getServerMembers(selectedServerId!),
      getServerEmojis(selectedServerId!),
      getMyCommunityProfile(),
    ]);
    messages = messagesData;
    members = membersData;
    serverEmojis = media.emojis;
    serverStickers = media.stickers;
    currentUserProfile = profile;
  }

  const selectedChannel = selectedServer
    ? { id: selectedChannelId || "", name: "" }
    : null;

  if (!selectedChannelId || !selectedServer) {
    return (
      <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            {selectedServer ? "No channel selected" : "Welcome to Servers"}
          </h3>
          <p className="text-sm">
            {selectedServer
              ? "Select a channel to start messaging"
              : "Create or join a server to start chatting."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <ServerChatView
        server={{
          id: selectedServer.id,
          name: selectedServer.name,
          description: selectedServer.description,
          iconUrl: selectedServer.iconUrl,
          bannerUrl: selectedServer.bannerUrl,
          createdById: selectedServer.createdById,
          myRole: selectedServer.myRole,
          myPermissions: selectedServer.myPermissions,
          isMuted: selectedServer.isMuted,
          members: members.map((m: any) => ({
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
            avatar: m.avatar,
            customAvatar: m.customAvatar,
            currentStreak: m.currentStreak,
            roles: m.roles || [],
          })),
        }}
        channel={{
          id: selectedChannelId,
          name: selectedChannel?.name || "",
        }}
        messages={messages}
        currentUserId={userId}
        selectedServerId={selectedServerId}
        currentUserProfile={currentUserProfile}
        serverEmojis={serverEmojis}
        serverStickers={serverStickers}
      />
    </div>
  );
}
