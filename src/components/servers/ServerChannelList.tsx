"use client";

import Link from "next/link";
import { Hash, Plus, Settings, Crown, Shield, User, Pencil, Trash2, MoreVertical, Lock, ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import CreateChannelModal from "./CreateChannelModal";
import ServerSettingsModal from "./ServerSettingsModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteChannel, updateChannel, createCategory, deleteCategory, updateCategory, moveChannelToCategory } from "@/actions/server.actions";
import { ROLE_PERMISSIONS } from "@/lib/role-permissions";
import { useRouter } from "next/navigation";

interface ServerChannelListProps {
  server: {
    id: string;
    name: string;
    description?: string | null;
    inviteCode: string;
    isDiscoverable: boolean;
    myRole: string;
    myPermissions?: string;
    createdById: string;
    iconUrl?: string | null;
    bannerUrl?: string | null;
  };
  channels: Array<{
    id: string;
    name: string;
    order: number;
    categoryId?: string | null;
    isPrivate?: boolean;
    _count?: { messages: number };
  }>;
  categories?: Array<{
    id: string;
    name: string;
    order: number;
    channels?: Array<{
      id: string;
      name: string;
      order: number;
      isPrivate?: boolean;
      _count?: { messages: number };
    }>;
  }>;
  selectedChannelId?: string;
}

const roleIcons: Record<string, React.ReactNode> = {
  ADMIN: <Crown className="w-3 h-3 text-yellow-500" />,
  MODERATOR: <Shield className="w-3 h-3 text-blue-500" />,
  MEMBER: <User className="w-3 h-3 text-muted-foreground" />,
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  MODERATOR: "Mod",
  MEMBER: "Member",
};

export default function ServerChannelList({
  server,
  channels,
  categories = [],
  selectedChannelId,
}: ServerChannelListProps) {
  const router = useRouter();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const isAdmin = server.myRole === "ADMIN";
  const isMod = server.myRole === "MODERATOR";

  const hasPermission = (flag: bigint): boolean => {
    if (isAdmin) return true;
    if (!server.myPermissions) return false;
    const perms = BigInt(server.myPermissions);
    return (perms & flag) === flag;
  };

  const canManageChannels = isAdmin || isMod || hasPermission(ROLE_PERMISSIONS.MANAGE_CHANNELS);
  const canManageServer = isAdmin || hasPermission(ROLE_PERMISSIONS.MANAGE_SERVER);
  const canManageEmojis = isAdmin || isMod || hasPermission(ROLE_PERMISSIONS.MANAGE_EMOJIS);
  const canManage = canManageChannels || canManageServer || canManageEmojis;

  const uncategorizedChannels = channels.filter(c => !c.categoryId);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col h-full w-full md:w-60 bg-muted/30 border-r border-border">
        <div className="relative shrink-0">
          {server.bannerUrl ? (
            <div className="w-full h-[135px] relative overflow-hidden bg-muted">
              <img
                src={server.bannerUrl}
                alt="Server banner"
                className="w-full h-full object-cover"
                onError={(e) => {

                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
            </div>
          ) : (
            <div className="w-full h-[60px] bg-gradient-to-br from-primary/30 via-primary/10 to-muted" />
          )}

          <div className="absolute left-4" style={{ bottom: '-44px' }}>
            <div className="w-[88px] h-[88px] rounded-[24px] bg-background border-[6px] border-background overflow-hidden shadow-lg">
              {server.iconUrl ? (

                <img
                  src={server.iconUrl}
                  alt={server.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{server.name.substring(0, 2).toUpperCase()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pt-12 pb-3 flex items-center justify-between bg-background/50 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-bold text-foreground truncate text-lg">{server.name}</h2>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shrink-0"
              >
                <Settings className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Server Settings</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-1">
          {categories.map((category) => {
            const isCollapsed = collapsedCategories.has(category.id);
            const categoryChannels = channels.filter(c => c.categoryId === category.id);

            return (
              <div key={category.id} className="space-y-0.5">
                <div className="px-2 py-1 group">
                  {editingCategory === category.id ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await updateCategory(category.id, editCategoryName);
                        setEditingCategory(null);
                        router.refresh();
                      }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs font-semibold"
                        onBlur={() => setEditingCategory(null)}
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setCollapsedCategories(prev => {
                          const next = new Set(prev);
                          if (next.has(category.id)) {
                            next.delete(category.id);
                          } else {
                            next.add(category.id);
                          }
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 w-full text-left"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      )}
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                        {category.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {categoryChannels.length}
                      </span>

                      {canManageChannels && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity ml-auto"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingCategory(category.id);
                                setEditCategoryName(category.name);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                if (confirm(`Delete category "${category.name}"? Channels will become uncategorized.`)) {
                                  await deleteCategory(category.id);
                                  router.refresh();
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </button>
                  )}
                </div>

                {!isCollapsed && categoryChannels.map((channel) => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    server={server}
                    isSelected={selectedChannelId === channel.id}
                    isAdmin={canManageChannels}
                    isEditing={editingChannel === channel.id}
                    editName={editName}
                    setEditName={setEditName}
                    setEditingChannel={setEditingChannel}
                    router={router}
                  />
                ))}
              </div>
            );
          })}

          {uncategorizedChannels.length > 0 && (
            <div className="space-y-0.5">
              {categories.length > 0 && (
                <div className="px-2 py-1">
                </div>
              )}
              {uncategorizedChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  server={server}
                  isSelected={selectedChannelId === channel.id}
                  isAdmin={isAdmin}
                  isEditing={editingChannel === channel.id}
                  editName={editName}
                  setEditName={setEditName}
                  setEditingChannel={setEditingChannel}
                  router={router}
                />
              ))}
            </div>
          )}

          {canManageChannels && !creatingCategory && (
            <button
              onClick={() => setCreatingCategory(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors w-full"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Create Category</span>
            </button>
          )}

          {canManageChannels && creatingCategory && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (newCategoryName.trim()) {
                  await createCategory(server.id, newCategoryName.trim());
                  setNewCategoryName("");
                  setCreatingCategory(false);
                  router.refresh();
                }
              }}
              className="flex items-center gap-1 px-2 py-1"
            >
              <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Category name"
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm"
                onBlur={() => {
                  if (!newCategoryName.trim()) {
                    setCreatingCategory(false);
                  }
                }}
              />
            </form>
          )}

          {canManageChannels && (
            <button
              onClick={() => setShowCreateChannel(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors w-full mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Channel</span>
            </button>
          )}
        </div>

        <div className="h-14 px-3 flex items-center gap-2 border-t border-border bg-background/50">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted">
            {roleIcons[server.myRole]}
            <span className="text-xs font-medium text-muted-foreground">
              {roleLabels[server.myRole]}
            </span>
          </div>
        </div>

        <CreateChannelModal
          open={showCreateChannel}
          onOpenChange={setShowCreateChannel}
          serverId={server.id}
        />

        <ServerSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          server={{
            ...server,
            myRole: server.myRole,
            myPermissions: server.myPermissions,
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function ChannelItem({
  channel,
  server,
  isSelected,
  isAdmin,
  isEditing,
  editName,
  setEditName,
  setEditingChannel,
  router,
}: {
  channel: any;
  server: any;
  isSelected: boolean;
  isAdmin: boolean;
  isEditing: boolean;
  editName: string;
  setEditName: (name: string) => void;
  setEditingChannel: (id: string | null) => void;
  router: any;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group ml-4",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <Link
        href={`/servers?serverId=${server.id}&channelId=${channel.id}`}
        prefetch={true}
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <Hash className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
        {isEditing ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await updateChannel(channel.id, editName);
              setEditingChannel(null);
              router.refresh();
            }}
            className="flex items-center gap-1 flex-1"
          >
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-background border border-border rounded px-1 py-0.5 text-sm"
              onBlur={() => setEditingChannel(null)}
            />
          </form>
        ) : (
          <span className="truncate flex items-center gap-1">
            {channel.name}
            {isAdmin && channel.isPrivate && (
              <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </span>
        )}
      </Link>

      {isAdmin && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity shrink-0"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditingChannel(channel.id);
                setEditName(channel.name);
              }}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Name
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={async () => {
                if (confirm(`Delete #${channel.name}? This cannot be undone.`)) {
                  await deleteChannel(channel.id);
                  router.refresh();
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isSelected && !isEditing && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      )}
    </div>
  );
}
