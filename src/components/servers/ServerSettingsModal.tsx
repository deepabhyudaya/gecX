"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateServerInfo,
  regenerateInviteCode,
  toggleServerDiscoverable,
  deleteServer,
} from "@/actions/server.actions";
import { updateServerMedia, getServerEmojis, removeServerEmoji, removeServerSticker, getServerSlotInfo, addServerEmojiWithSlotCheck, addServerStickerWithSlotCheck } from "@/actions/emoji-sticker.actions";
import { getServerRoles } from "@/actions/role.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Copy, Check, Globe, Hash, RefreshCw, Trash2, AlertTriangle, Image as ImageIcon, Smile, Sticker, Plus, X, ExternalLink, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { RoleManager } from "@/components/roles";
import { ROLE_PERMISSIONS } from "@/lib/role-permissions";

interface ServerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: {
    id: string;
    name: string;
    description?: string | null;
    inviteCode: string;
    isDiscoverable: boolean;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    myRole?: string;
    myPermissions?: string;
  };
}

function checkPerm(myPermissions: string | undefined, myRole: string | undefined, flag: bigint): boolean {
  if (myRole === "ADMIN") return true;
  if (!myPermissions) return false;
  const perms = BigInt(myPermissions);
  return (perms & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR || (perms & flag) === flag;
}

export default function ServerSettingsModal({
  open,
  onOpenChange,
  server,
}: ServerSettingsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "media" | "emojis" | "stickers" | "roles">("general");
  const isAdmin = server.myRole === "ADMIN";
  const isMod = server.myRole === "MODERATOR";

  const canManageServer = isAdmin || checkPerm(server.myPermissions, server.myRole, ROLE_PERMISSIONS.MANAGE_SERVER);
  const canManageEmojis = isAdmin || isMod || checkPerm(server.myPermissions, server.myRole, ROLE_PERMISSIONS.MANAGE_EMOJIS);
  const canManageRoles = isAdmin || checkPerm(server.myPermissions, server.myRole, ROLE_PERMISSIONS.MANAGE_ROLES);
  const canManage = canManageServer || canManageEmojis || canManageRoles;

  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || "");
  const [inviteCode, setInviteCode] = useState(server.inviteCode);
  const [isDiscoverable, setIsDiscoverable] = useState(server.isDiscoverable);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [iconUrl, setIconUrl] = useState(server.iconUrl || "");
  const [bannerUrl, setBannerUrl] = useState(server.bannerUrl || "");
  const [savingMedia, setSavingMedia] = useState(false);

  const [emojis, setEmojis] = useState<any[]>([]);
  const [stickers, setStickers] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [slotInfo, setSlotInfo] = useState<{
    emojiCount: number;
    stickerCount: number;
    totalEmojiSlots: number;
    totalStickerSlots: number;
    remainingEmojiSlots: number;
    remainingStickerSlots: number;
  } | null>(null);

  const [assetName, setAssetName] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [addingAsset, setAddingAsset] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (open && (activeTab === "emojis" || activeTab === "stickers")) {
      const fetchAssets = async () => {
        setLoadingAssets(true);
        setError(null);
        try {
          const [res, slots] = await Promise.all([
            getServerEmojis(server.id),
            getServerSlotInfo(server.id),
          ]);
          setEmojis(res.emojis);
          setStickers(res.stickers);
          setSlotInfo(slots);
        } catch (error) {
          console.error("Failed to load server assets", error);
        } finally {
          setLoadingAssets(false);
        }
      };
      fetchAssets();
    }
  }, [open, activeTab, server.id]);

  useEffect(() => {
    if (open && activeTab === "roles" && canManageRoles) {
      const fetchRoles = async () => {
        setLoadingRoles(true);
        try {
          const serverRoles = await getServerRoles(server.id);
          setRoles(serverRoles);
        } catch (error) {
          console.error("Failed to load server roles", error);
        } finally {
          setLoadingRoles(false);
        }
      };
      fetchRoles();
    }
  }, [open, activeTab, server.id, canManageRoles]);

  useEffect(() => {
    if (open) {
      setName(server.name);
      setDescription(server.description || "");
      setInviteCode(server.inviteCode);
      setIsDiscoverable(server.isDiscoverable);
      setIconUrl(server.iconUrl || "");
      setBannerUrl(server.bannerUrl || "");
      setAssetName("");
      setAssetUrl("");
    }
  }, [open, server]);

  const handleUpdateInfo = async () => {
    setLoading(true);
    try {
      await updateServerInfo(server.id, name, description);
      router.refresh();
    } catch (error) {
      console.error("Failed to update server:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMedia = async () => {
    setSavingMedia(true);
    try {
      await updateServerMedia(server.id, {
        iconUrl: iconUrl || undefined,
        bannerUrl: bannerUrl || undefined
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to update media:", error);
    } finally {
      setSavingMedia(false);
    }
  };

  const handleAddAsset = async (type: "emoji" | "sticker") => {
    if (!assetName || !assetUrl) return;
    setAddingAsset(true);
    setError(null);
    try {
      if (type === "emoji") {
        await addServerEmojiWithSlotCheck(server.id, assetName, assetUrl);
      } else {
        await addServerStickerWithSlotCheck(server.id, assetName, assetUrl);
      }

      const [res, slots] = await Promise.all([
        getServerEmojis(server.id),
        getServerSlotInfo(server.id),
      ]);
      setEmojis(res.emojis);
      setStickers(res.stickers);
      setSlotInfo(slots);

      setAssetName("");
      setAssetUrl("");
      router.refresh();
    } catch (error: any) {
      console.error(`Failed to add ${type}:`, error);
      setError(error.message || `Failed to add ${type}. Please check the URL and try again.`);
    } finally {
      setAddingAsset(false);
    }
  };

  const handleRemoveAsset = async (id: string, type: "emoji" | "sticker") => {
    try {
      if (type === "emoji") {
        await removeServerEmoji(id);
      } else {
        await removeServerSticker(id);
      }

      const res = await getServerEmojis(server.id);
      setEmojis(res.emojis);
      setStickers(res.stickers);
      router.refresh();
    } catch (error) {
      console.error(`Failed to remove ${type}:`, error);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const result = await regenerateInviteCode(server.id);
      setInviteCode(result.inviteCode);
    } catch (error) {
      console.error("Failed to regenerate code:", error);
    }
  };

  const handleToggleDiscoverable = async () => {
    try {
      const result = await toggleServerDiscoverable(server.id);
      setIsDiscoverable(result.isDiscoverable);
    } catch (error) {
      console.error("Failed to toggle discoverable:", error);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] sm:h-[600px] flex p-0 overflow-hidden bg-card border-border">
        <div className="w-48 sm:w-56 bg-muted/30 border-r border-border flex flex-col p-4 shrink-0 overflow-y-auto">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">
            Server Settings
          </h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("general")}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium flex items-center gap-2",
                activeTab === "general" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              Overview
            </button>
            {canManage && (
              <button
                onClick={() => setActiveTab("media")}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium flex items-center gap-2",
                  activeTab === "media" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Server Branding
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setActiveTab("emojis")}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium flex items-center gap-2",
                  activeTab === "emojis" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Custom Emojis
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setActiveTab("stickers")}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium flex items-center gap-2",
                  activeTab === "stickers" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Custom Stickers
              </button>
            )}
            {canManageRoles && (
              <button
                onClick={() => setActiveTab("roles")}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors font-medium flex items-center gap-2",
                  activeTab === "roles" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Shield className="w-4 h-4" />
                Roles
              </button>
            )}
          </nav>
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto p-6 relative">
          {activeTab === "general" && (
            <div className="space-y-6 max-w-lg">
              <h3 className="text-xl font-semibold">Overview</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground uppercase tracking-widest text-[11px] text-muted-foreground">Server Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground uppercase tracking-widest text-[11px] text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <button
                  onClick={handleUpdateInfo}
                  disabled={loading || name === server.name && description === (server.description || "")}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>

              <div className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">
                  Invite Code
                </h3>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      readOnly
                      value={inviteCode}
                      className="w-full bg-muted border border-border rounded-lg pl-10 pr-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <button
                    onClick={copyCode}
                    className={cn(
                      "p-2 rounded-lg border border-border transition-colors",
                      copied
                        ? "bg-green-500/10 border-green-500/30 text-green-500"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {canManageServer && (
                    <button
                      onClick={handleRegenerateCode}
                      className="p-2 rounded-lg border border-border bg-muted hover:bg-accent transition-colors"
                      title="Generate new invite code"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {canManageServer && (
                <div className="space-y-4 pt-6 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Discoverable Server
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Allow anyone to find and join this server from the discover page.
                      </p>
                    </div>
                    <Switch
                      checked={isDiscoverable}
                      onCheckedChange={handleToggleDiscoverable}
                    />
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-4 pt-6 border-t border-border">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Danger Zone
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Deleting a server is permanent and cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete "${server.name}"? This action cannot be undone.`)) {
                        await deleteServer(server.id);
                        router.push("/servers");
                      }
                    }}
                    className="px-4 py-2 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Server
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "roles" && canManageRoles && (
            <div className="flex-1 overflow-y-auto">
              {loadingRoles ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <RoleManager
                  serverId={server.id}
                  roles={roles}
                  isAdmin={canManageRoles}
                />
              )}
            </div>
          )}

          {activeTab === "media" && canManage && (
            <div className="space-y-6 max-w-lg">
              <h3 className="text-xl font-semibold">Server Branding</h3>
              <p className="text-sm text-muted-foreground -mt-2">
                Customize how your server appears to members and on the discover page.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground uppercase tracking-widest text-[11px] text-muted-foreground">Server Icon URL</label>
                  <input
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="https://example.com/icon.png"
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  {iconUrl && (
                    <div className="mt-2 w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border">
                      <img src={iconUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-4">
                  <label className="text-sm font-medium text-foreground uppercase tracking-widest text-[11px] text-muted-foreground">Server Banner URL</label>
                  <input
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://example.com/banner.png"
                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                  {bannerUrl && (
                    <div className="mt-2 w-full h-24 rounded-xl overflow-hidden bg-muted border border-border">
                      <img src={bannerUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <button
                  onClick={handleUpdateMedia}
                  disabled={savingMedia || (iconUrl === (server.iconUrl || "") && bannerUrl === (server.bannerUrl || ""))}
                  className="px-4 py-2 mt-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {savingMedia ? "Saving..." : "Save Media"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "emojis" && canManage && (
            <div className="space-y-6 flex-1 flex flex-col h-full">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2"><Smile className="size-5" /> Custom Emojis</h3>
                <p className="text-sm text-muted-foreground">Add custom emojis for members to use in this server. Use :name: in messages.</p>
              </div>

              {slotInfo && (
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Emoji Slots</span>
                    <span className="text-sm text-muted-foreground">
                      {slotInfo.emojiCount} / {slotInfo.totalEmojiSlots} used
                      <span className="text-xs ml-2">({slotInfo.remainingEmojiSlots} remaining)</span>
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((slotInfo.emojiCount / slotInfo.totalEmojiSlots) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {slotInfo.remainingEmojiSlots <= 0 && (
                    <a
                      href="/shop?tab=server-slots"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="size-3" /> Purchase more slots in Shop
                    </a>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3 shrink-0">
                <h4 className="text-sm font-medium">Add New Emoji</h4>
                <div className="flex gap-2">
                  <input
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="emoji_name"
                    className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                  />
                  <input
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    placeholder="Image/GIF URL"
                    className="flex-[2] bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => handleAddAsset("emoji")}
                    disabled={addingAsset || !assetName || !assetUrl || (slotInfo?.remainingEmojiSlots ?? 0) <= 0}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    {addingAsset ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Add
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL must end in .gif, .png, .jpg, .jpeg, or .webp
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingAssets ? (
                  <div className="flex items-center justify-center h-32"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
                ) : emojis.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                    <Smile className="size-8 mb-2 opacity-50" />
                    <p className="text-sm">No custom emojis yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {emojis.map((emoji) => (
                      <div key={emoji.id} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md border border-border group">
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={emoji.imageUrl} alt={emoji.name} className="w-6 h-6 object-contain shrink-0" />
                          <span className="text-sm truncate">:{emoji.name}:</span>
                        </div>
                        <button
                          onClick={() => handleRemoveAsset(emoji.id, "emoji")}
                          className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-all shrink-0"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "stickers" && canManage && (
            <div className="space-y-6 flex-1 flex flex-col h-full">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2"><Sticker className="size-5" /> Custom Stickers</h3>
                <p className="text-sm text-muted-foreground">Add custom stickers for members to send as standalone messages.</p>
              </div>

              {slotInfo && (
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Sticker Slots</span>
                    <span className="text-sm text-muted-foreground">
                      {slotInfo.stickerCount} / {slotInfo.totalStickerSlots} used
                      <span className="text-xs ml-2">({slotInfo.remainingStickerSlots} remaining)</span>
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((slotInfo.stickerCount / slotInfo.totalStickerSlots) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {slotInfo.remainingStickerSlots <= 0 && (
                    <a
                      href="/shop?tab=server-slots"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="size-3" /> Purchase more slots in Shop
                    </a>
                  )}
                </div>
              )}

              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3 shrink-0">
                <h4 className="text-sm font-medium">Add New Sticker</h4>
                <div className="flex gap-2">
                  <input
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder="sticker_name"
                    className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                  />
                  <input
                    value={assetUrl}
                    onChange={(e) => setAssetUrl(e.target.value)}
                    placeholder="Image/GIF URL"
                    className="flex-[2] bg-background border border-border rounded-md px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => handleAddAsset("sticker")}
                    disabled={addingAsset || !assetName || !assetUrl || (slotInfo?.remainingStickerSlots ?? 0) <= 0}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    {addingAsset ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Add
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL must end in .gif, .png, .jpg, .jpeg, or .webp
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingAssets ? (
                  <div className="flex items-center justify-center h-32"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
                ) : stickers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                    <Sticker className="size-8 mb-2 opacity-50" />
                    <p className="text-sm">No custom stickers yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {stickers.map((sticker) => (
                      <div key={sticker.id} className="relative aspect-square bg-muted rounded-lg border border-border flex items-center justify-center group overflow-hidden">
                        <img src={sticker.imageUrl} alt={sticker.name} className="w-full h-full object-contain p-2" />
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                          <span className="text-xs font-medium truncate px-2 w-full text-center">:{sticker.name}:</span>
                          <button
                            onClick={() => handleRemoveAsset(sticker.id, "sticker")}
                            className="p-1.5 bg-destructive text-destructive-foreground rounded-md shadow-sm"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
