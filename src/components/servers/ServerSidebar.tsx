"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Compass, MessageSquare, Server } from "lucide-react";
import CreateServerModal from "./CreateServerModal";
import JoinServerModal from "./JoinServerModal";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ServerSidebarProps {
  servers: Array<{
    id: string;
    name: string;
    icon?: string | null;
    myRole: string;
    unreadCount?: number;
  }>;
  selectedServerId?: string;
}

export default function ServerSidebar({ servers, selectedServerId }: ServerSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const router = useRouter();

  return (
    <TooltipProvider delayDuration={100}>
    <div className="flex flex-col h-full w-[72px] bg-muted/30 border-r border-border py-3 items-center gap-2 shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/messages"
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
              "bg-muted hover:bg-primary hover:text-primary-foreground",
              "text-foreground shadow-sm border border-border/50"
            )}
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Messages</TooltipContent>
      </Tooltip>

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      {servers.map((server) => (
        <Tooltip key={server.id}>
          <TooltipTrigger asChild>
            <Link
              href={`/servers?serverId=${server.id}`}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative",
                selectedServerId === server.id
                  ? "rounded-xl bg-muted ring-2 ring-primary text-foreground"
                  : "bg-muted hover:rounded-xl hover:bg-primary hover:text-primary-foreground",
                "text-foreground shadow-sm border border-border/50"
              )}
            >
              {server.icon ? (
                <img src={server.icon} alt={server.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-xs font-bold uppercase">{server.name.substring(0, 2)}</span>
              )}

              {server.unreadCount && server.unreadCount > 0 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground border-2 border-muted">
                  {server.unreadCount > 9 ? "9+" : server.unreadCount}
                </div>
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{server.name}</TooltipContent>
        </Tooltip>
      ))}

      <div className="w-8 h-[2px] bg-border rounded-full my-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setShowCreate(true)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
              "bg-muted hover:rounded-xl hover:bg-primary hover:text-primary-foreground",
              "text-primary shadow-sm border border-border/50"
            )}
          >
            <Plus className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Create Server</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setShowJoin(true)}
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
              "bg-muted hover:rounded-xl hover:bg-primary hover:text-primary-foreground",
              "text-primary shadow-sm border border-border/50"
            )}
          >
            <Server className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Join Server</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/servers/discover"
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
              "bg-muted hover:rounded-xl hover:bg-primary hover:text-primary-foreground",
              "text-primary shadow-sm border border-border/50"
            )}
          >
            <Compass className="w-5 h-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Explore Servers</TooltipContent>
      </Tooltip>

      <CreateServerModal open={showCreate} onOpenChange={setShowCreate} />
      <JoinServerModal open={showJoin} onOpenChange={setShowJoin} />
    </div>
    </TooltipProvider>
  );
}
