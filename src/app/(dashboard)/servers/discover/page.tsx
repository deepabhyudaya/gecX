import { auth } from "@clerk/nextjs/server";
import { getDiscoverableServers, joinServerByCode } from "@/actions/server.actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, Users, Hash, ArrowLeft, Plus, Check, Rocket, Flame, TrendingUp } from "lucide-react";
import { unstable_noStore } from "next/cache";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DiscoverServersPage() {
  unstable_noStore();
  const { userId } = auth();
  if (!userId) return null;

  const servers = await getDiscoverableServers();

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 px-4 border-b border-border flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Discover Servers</h2>
            <p className="text-xs text-muted-foreground">Find public servers to join</p>
          </div>
        </div>
        <Link
          href="/servers"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent text-sm text-muted-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Servers
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Compass className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No public servers yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              There are no discoverable servers at the moment. Create your own server and make it discoverable, or join a server using an invite code.
            </p>
            <div className="flex gap-3">
              <Link
                href="/servers"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors"
              >
                Create Server
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {servers.map((server: any) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServerCard({ server }: { server: any }) {
  const isTrending = server.bumps >= 10;
  const isHot = server.bumps >= 5 && server.bumps < 10;

  return (
    <div className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
      <div className="h-28 relative overflow-hidden">
        {server.bannerUrl ? (
          <>
            <img
              src={server.bannerUrl}
              alt={`${server.name} banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </>
        ) : (
          <div className="h-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
            </div>
          </div>
        )}

        {isTrending && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center gap-1 shadow-lg animate-pulse">
            <Flame className="w-3 h-3" />
            Trending
          </div>
        )}
        {isHot && !isTrending && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-xs font-semibold flex items-center gap-1 shadow-md">
            <TrendingUp className="w-3 h-3" />
            Hot
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="w-14 h-14 rounded-2xl bg-background border-2 border-border flex items-center justify-center -mt-12 mb-3 shadow-lg group-hover:scale-105 transition-transform duration-300 overflow-hidden">
          {server.iconUrl ? (

            <img
              src={server.iconUrl}
              alt={server.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
              {server.name.substring(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <h3 className="font-bold text-foreground text-lg mb-1 truncate">{server.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10 leading-relaxed">
          {server.description || "No description provided"}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5">
          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
            <Users className="w-3.5 h-3.5" />
            <span className="font-medium">{server.memberCount || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-lg">
            <Hash className="w-3.5 h-3.5" />
            <span className="font-medium">{server.channelCount || 0}</span>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg font-medium",
            server.bumps > 0 ? "bg-primary/10 text-primary" : "bg-muted/50"
          )}>
            <Rocket className="w-3.5 h-3.5" />
            <span>{server.bumps || 0} bumps</span>
          </div>
        </div>

        <JoinServerButton serverId={server.id} inviteCode={server.inviteCode} isJoined={server.isJoined} />
      </div>
    </div>
  );
}

function JoinServerButton({ serverId, inviteCode, isJoined }: { serverId: string; inviteCode: string; isJoined: boolean }) {
  if (isJoined) {
    return (
      <Link
        href={`/servers?serverId=${serverId}`}
        className="w-full px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold hover:bg-accent transition-all duration-200 flex items-center justify-center gap-2 group"
      >
        Go to Server
      </Link>
    );
  }

  async function handleJoin() {
    "use server";
    await joinServerByCode(inviteCode);
    redirect(`/servers?serverId=${serverId}`);
  }

  return (
    <form action={handleJoin}>
      <button
        type="submit"
        className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Join Server
      </button>
    </form>
  );
}
