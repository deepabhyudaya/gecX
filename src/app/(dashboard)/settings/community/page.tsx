"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyCommunityProfile, updateCommunityProfile, checkUsernameAvailable, updateCustomAvatar, updateProfileBanner } from "@/actions/community-profile.actions";
import {
  getColorShopData,
  equipProfileBgColor,
  unequipProfileBgColor,
  equipNameplate,
  unequipNameplate,
  equipUsernameColor,
  unequipUsernameColor,
} from "@/actions/color-shop.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import { Loader2, ArrowLeft, Trophy, Check, ExternalLink, Palette, Image as ImageIcon, IdCard, Type, UserCircle, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type CosmeticItem = {
  id: string;
  name: string;
  colorValue: string;
  type: string;
  shade: string;
  category: string;
  owned: boolean;
  equipped: boolean;
};

function CosmeticSwatch({
  item,
  onEquip,
  isEquipping,
}: {
  item: CosmeticItem;
  onEquip: (item: CosmeticItem) => void;
  isEquipping: boolean;
}) {
  let swatchStyle: React.CSSProperties = {};
  if (item.shade === "gradient" || item.type === "nameplate") {
    swatchStyle = { background: item.colorValue };
  } else {
    swatchStyle = { backgroundColor: item.colorValue };
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        item.equipped && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
      onClick={() => !item.equipped && onEquip(item)}
    >
      <div className="w-full aspect-square" style={swatchStyle} />

      {item.equipped && (
        <div className="absolute top-1.5 left-1.5">
          <span className="inline-flex items-center gap-0.5 bg-primary/90 text-primary-foreground rounded-full px-1.5 py-0.5 text-[9px] font-semibold shadow">
            <Check className="w-2 h-2" /> On
          </span>
        </div>
      )}

      <div className="px-2 py-1.5">
        <p className="text-[11px] font-medium truncate leading-tight">{item.name}</p>
        {isEquipping && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
        )}
      </div>
    </div>
  );
}

type CosmeticTab = "username" | "nameplate" | "background" | "avatar" | "banner";

export default function CommunitySettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<{
    username: string;
    displayName: string | null;
    bio: string | null;
    isPrivate: boolean;
    requireFollowApproval: boolean;
    showKarma: string;
    karmaPoints: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
    isPrivate: false,
    requireFollowApproval: false,
    showKarma: "everyone" as "nobody" | "followers" | "everyone",
    showAcademicProfile: "nobody" as "nobody" | "followers" | "everyone",
  });

  const [usernameError, setUsernameError] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);

  const [cosmeticTab, setCosmeticTab] = useState<CosmeticTab>("username");
  const [isLoadingCosmetics, setIsLoadingCosmetics] = useState(false);
  const [isEquipping, setIsEquipping] = useState<string | null>(null);
  const [cosmetics, setCosmetics] = useState<{
    usernameColors: CosmeticItem[];
    nameplates: CosmeticItem[];
    profileBgColors: CosmeticItem[];
    equippedUsernameColorId: string | null;
    equippedNameplateId: string | null;
    equippedProfileBgColorId: string | null;

    ownsCustomAvatar: boolean;
    ownsProfileBanner: boolean;
    customAvatarUrl: string | null;
    bannerUrl: string | null;
    customAvatarItemId: string | null;
    profileBannerItemId: string | null;
  } | null>(null);

  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);

  useEffect(() => {
    loadProfile();
    loadCosmetics();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getMyCommunityProfile();
      if (data) {
        setProfile(data);
        setFormData({
          username: data.username,
          displayName: data.displayName || "",
          bio: data.bio || "",
          isPrivate: data.isPrivate,
          requireFollowApproval: data.requireFollowApproval || false,
          showKarma: (data.showKarma as "nobody" | "followers" | "everyone") || "everyone",
          showAcademicProfile: (data.showAcademicProfile as "nobody" | "followers" | "everyone") || "nobody",
        });
      }
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const loadCosmetics = async () => {
    setIsLoadingCosmetics(true);
    try {
      const data = await getColorShopData();

      const usernameColors = Object.values(data.usernameColors)
        .flat()
        .filter((i: any) => i.owned) as unknown as CosmeticItem[];
      const nameplates = data.nameplates.filter((i: any) => i.owned) as unknown as CosmeticItem[];
      const profileBgColors = data.profileBgColors.filter((i: any) => i.owned) as unknown as CosmeticItem[];

      setCosmetics({
        usernameColors,
        nameplates,
        profileBgColors,
        equippedUsernameColorId: data.equippedUsernameColorId,
        equippedNameplateId: data.equippedNameplateId,
        equippedProfileBgColorId: data.equippedProfileBgColorId,

        ownsCustomAvatar: data.ownsCustomAvatar,
        ownsProfileBanner: data.ownsProfileBanner,
        customAvatarUrl: data.customAvatarUrl,
        bannerUrl: data.bannerUrl,
        customAvatarItemId: data.customAvatarItemId,
        profileBannerItemId: data.profileBannerItemId,
      });

      setAvatarUrlInput(data.customAvatarUrl || "");
      setBannerUrlInput(data.bannerUrl || "");
    } catch {

    } finally {
      setIsLoadingCosmetics(false);
    }
  };

  const handleEquipUsernameColor = async (item: CosmeticItem) => {
    setIsEquipping(item.id);
    try {
      await equipUsernameColor(item.id);
      toast.success("Username color equipped!");
      setCosmetics((prev) =>
        prev
          ? {
              ...prev,
              equippedUsernameColorId: item.id,
              usernameColors: prev.usernameColors.map((i) => ({ ...i, equipped: i.id === item.id })),
            }
          : prev
      );
    } catch {
      toast.error("Failed to equip");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleUnequipUsernameColor = async () => {
    setIsEquipping("unequip-username");
    try {
      await unequipUsernameColor();
      toast.success("Reverted to karma color");
      setCosmetics((prev) =>
        prev
          ? {
              ...prev,
              equippedUsernameColorId: null,
              usernameColors: prev.usernameColors.map((i) => ({ ...i, equipped: false })),
            }
          : prev
      );
    } catch {
      toast.error("Failed to unequip");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleEquipNameplate = async (item: CosmeticItem) => {
    setIsEquipping(item.id);
    try {
      await equipNameplate(item.id);
      toast.success("Nameplate equipped! 🏅");
      setCosmetics((prev) =>
        prev
          ? {
              ...prev,
              equippedNameplateId: item.id,
              nameplates: prev.nameplates.map((i) => ({ ...i, equipped: i.id === item.id })),
            }
          : prev
      );
    } catch {
      toast.error("Failed to equip");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleUnequipNameplate = async () => {
    setIsEquipping("unequip-nameplate");
    try {
      await unequipNameplate();
      toast.success("Nameplate removed");
      setCosmetics((prev) =>
        prev
          ? {
              ...prev,
              equippedNameplateId: null,
              nameplates: prev.nameplates.map((i) => ({ ...i, equipped: false })),
            }
          : prev
      );
    } catch {
      toast.error("Failed to unequip");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleEquipBg = async (item: CosmeticItem) => {
    setIsEquipping(item.id);
    try {
      await equipProfileBgColor(item.id);
      toast.success("Profile background equipped! ✨");
      setCosmetics((prev) =>
        prev
          ? {
              ...prev,
              equippedProfileBgColorId: item.id,
              profileBgColors: prev.profileBgColors.map((i) => ({ ...i, equipped: i.id === item.id })),
            }
          : prev
      );
    } catch {
      toast.error("Failed to equip");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleUpdateAvatar = async () => {
    if (!cosmetics?.ownsCustomAvatar) {
      toast.error("Purchase Custom Avatar from the shop first!");
      return;
    }
    setIsUpdatingAvatar(true);
    try {
      await updateCustomAvatar(avatarUrlInput || null);
      toast.success("Custom avatar updated!");
      setCosmetics((prev) =>
        prev ? { ...prev, customAvatarUrl: avatarUrlInput || null } : prev
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update avatar");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleClearAvatar = async () => {
    if (!cosmetics?.ownsCustomAvatar) return;
    setIsUpdatingAvatar(true);
    try {
      await updateCustomAvatar(null);
      toast.success("Custom avatar removed!");
      setAvatarUrlInput("");
      setCosmetics((prev) =>
        prev ? { ...prev, customAvatarUrl: null } : prev
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to clear avatar");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleUpdateBanner = async () => {
    if (!cosmetics?.ownsProfileBanner) {
      toast.error("Purchase Profile Banner from the shop first!");
      return;
    }
    setIsUpdatingBanner(true);
    try {
      await updateProfileBanner(bannerUrlInput || null);
      toast.success("Profile banner updated!");
      setCosmetics((prev) =>
        prev ? { ...prev, bannerUrl: bannerUrlInput || null } : prev
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update banner");
    } finally {
      setIsUpdatingBanner(false);
    }
  };

  const handleClearBanner = async () => {
    if (!cosmetics?.ownsProfileBanner) return;
    setIsUpdatingBanner(true);
    try {
      await updateProfileBanner(null);
      toast.success("Profile banner removed!");
      setBannerUrlInput("");
      setCosmetics((prev) =>
        prev ? { ...prev, bannerUrl: null } : prev
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to clear banner");
    } finally {
      setIsUpdatingBanner(false);
    }
  };

  const handleUnequipBg = async () => {
    setIsEquipping("unequip-bg");
    try {
      await unequipProfileBgColor();
      toast.success("Profile background removed");
      setCosmetics((prev) =>
        prev
          ? {
              ...prev,
              equippedProfileBgColorId: null,
              profileBgColors: prev.profileBgColors.map((i) => ({ ...i, equipped: false })),
            }
          : prev
      );
    } catch {
      toast.error("Failed to unequip");
    } finally {
      setIsEquipping(null);
    }
  };

  const checkUsername = async (username: string) => {
    if (!username || username === profile?.username) {
      setUsernameError("");
      return;
    }
    setUsernameChecking(true);
    try {
      const result = await checkUsernameAvailable(username);
      setUsernameError(result.available ? "" : "Username is already taken");
    } catch {

    } finally {
      setUsernameChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameError) { toast.error("Please fix the errors before saving"); return; }
    setIsSaving(true);
    try {
      await updateCommunityProfile({
        username: formData.username,
        displayName: formData.displayName,
        bio: formData.bio,
        isPrivate: formData.isPrivate,
        requireFollowApproval: formData.requireFollowApproval,
        showKarma: formData.showKarma,
        showAcademicProfile: formData.showAcademicProfile,
      });
      toast.success("Profile updated!");
      router.push(`/${formData.username}`);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  const cosmeticTabs: { key: CosmeticTab; label: string; icon: React.ElementType; accent: string }[] = [
    { key: "username", label: "Username", icon: Type, accent: "text-violet-500" },
    { key: "nameplate", label: "Nameplate", icon: IdCard, accent: "text-amber-500" },
    { key: "background", label: "Profile Bg", icon: ImageIcon, accent: "text-cyan-500" },
    { key: "avatar", label: "Custom Avatar", icon: UserCircle, accent: "text-pink-500" },
    { key: "banner", label: "Profile Banner", icon: LayoutTemplate, accent: "text-emerald-500" },
  ];

  const activeItems =
    cosmeticTab === "username"
      ? cosmetics?.usernameColors ?? []
      : cosmeticTab === "nameplate"
      ? cosmetics?.nameplates ?? []
      : cosmetics?.profileBgColors ?? [];

  const activeEquippedId =
    cosmeticTab === "username"
      ? cosmetics?.equippedUsernameColorId
      : cosmeticTab === "nameplate"
      ? cosmetics?.equippedNameplateId
      : cosmetics?.equippedProfileBgColorId;

  const handleEquip = (item: CosmeticItem) => {
    if (cosmeticTab === "username") handleEquipUsernameColor(item);
    else if (cosmeticTab === "nameplate") handleEquipNameplate(item);
    else if (cosmeticTab === "background") handleEquipBg(item);
  };

  const handleUnequip = () => {
    if (cosmeticTab === "username") handleUnequipUsernameColor();
    else if (cosmeticTab === "nameplate") handleUnequipNameplate();
    else if (cosmeticTab === "background") handleUnequipBg();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${formData.username || "profile"}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold">Community Profile Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Customize your community profile. This is separate from your academic profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                    setFormData({ ...formData, username: value });
                    checkUsername(value);
                  }}
                  placeholder="your_username"
                />
                {usernameChecking && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                )}
              </div>
              {usernameError && <p className="text-sm text-destructive">{usernameError}</p>}
              <p className="text-xs text-muted-foreground">
                Profile URL: gecX.com/{formData.username}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value.slice(0, 50) })}
                placeholder="Your Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 500) })}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{formData.bio?.length || 0}/500</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette size={18} className="text-rose-500" />
                  Your Cosmetics
                </CardTitle>
                <CardDescription className="mt-1">
                  Equip purchased cosmetics directly from here.
                </CardDescription>
              </div>
              <Link href="/shop">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink size={13} />
                  Shop
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              {cosmeticTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCosmeticTab(tab.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all",
                      cosmeticTab === tab.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", cosmeticTab === tab.key ? "text-inherit" : tab.accent)} />
                    {tab.label}
                  </button>
                );
              })}

              {activeEquippedId && cosmeticTab !== "avatar" && cosmeticTab !== "banner" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleUnequip}
                  disabled={!!isEquipping}
                  className="ml-auto h-7 text-[11px] text-muted-foreground gap-1 px-2"
                >
                  {isEquipping?.startsWith("unequip") ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  Remove
                </Button>
              )}
            </div>

            {isLoadingCosmetics ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : cosmeticTab === "avatar" ? (

              <div className="space-y-4">
                {!cosmetics?.ownsCustomAvatar ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-muted-foreground">
                    <UserCircle size={48} className="opacity-50" />
                    <p className="text-sm">Unlock Custom Avatar from the shop</p>
                    <p className="text-xs">Set any GIF or image as your profile picture</p>
                    <Link href="/shop">
                      <Button variant="outline" size="sm" className="mt-1 gap-1.5 text-xs">
                        <ExternalLink size={13} />
                        Browse Shop
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="avatarUrl">Avatar Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="avatarUrl"
                          value={avatarUrlInput}
                          onChange={(e) => setAvatarUrlInput(e.target.value)}
                          placeholder="https://i.imgur.com/... or Discord/Tenor/Giphy link"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleUpdateAvatar}
                          disabled={isUpdatingAvatar}
                          size="sm"
                        >
                          {isUpdatingAvatar ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Direct image link (JPG, PNG, GIF, WebP). Supports Imgur, Discord, Tenor, Giphy.
                      </p>
                    </div>

                    {avatarUrlInput && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Preview</p>
                        <div className="flex items-center gap-3">
                          <img
                            src={avatarUrlInput}
                            alt="Avatar preview"
                            className="w-16 h-16 rounded-full object-cover border-2 border-border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/noAvatar.png";
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Your custom avatar will replace the default profile picture.
                            </p>
                          </div>
                          {cosmetics?.customAvatarUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearAvatar}
                              disabled={isUpdatingAvatar}
                              className="text-destructive hover:text-destructive"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {!avatarUrlInput && cosmetics?.customAvatarUrl && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Current Avatar</p>
                        <div className="flex items-center gap-3">
                          <img
                            src={cosmetics.customAvatarUrl}
                            alt="Current avatar"
                            className="w-16 h-16 rounded-full object-cover border-2 border-border"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAvatar}
                            disabled={isUpdatingAvatar}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove Custom Avatar
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : cosmeticTab === "banner" ? (

              <div className="space-y-4">
                {!cosmetics?.ownsProfileBanner ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-muted-foreground">
                    <LayoutTemplate size={48} className="opacity-50" />
                    <p className="text-sm">Unlock Profile Banner from the shop</p>
                    <p className="text-xs">Add a wide banner to your profile (Discord-style)</p>
                    <Link href="/shop">
                      <Button variant="outline" size="sm" className="mt-1 gap-1.5 text-xs">
                        <ExternalLink size={13} />
                        Browse Shop
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bannerUrl">Banner Image URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bannerUrl"
                          value={bannerUrlInput}
                          onChange={(e) => setBannerUrlInput(e.target.value)}
                          placeholder="https://i.imgur.com/... (recommended: 600x240 or 2.5:1 ratio)"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleUpdateBanner}
                          disabled={isUpdatingBanner}
                          size="sm"
                        >
                          {isUpdatingBanner ? <Loader2 size={14} className="animate-spin" /> : "Save"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Recommended size: 600x240px (2.5:1 aspect ratio). Supports GIFs!
                      </p>
                    </div>

                    {bannerUrlInput && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Preview</p>
                        <div className="relative">
                          <img
                            src={bannerUrlInput}
                            alt="Banner preview"
                            className="w-full aspect-[2.5/1] object-cover rounded-lg border border-border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          {cosmetics?.bannerUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearBanner}
                              disabled={isUpdatingBanner}
                              className="text-destructive hover:text-destructive"
                            >
                              Clear Banner
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {!bannerUrlInput && cosmetics?.bannerUrl && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Current Banner</p>
                        <div className="relative">
                          <img
                            src={cosmetics.bannerUrl}
                            alt="Current banner"
                            className="w-full aspect-[2.5/1] object-cover rounded-lg border border-border"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearBanner}
                          disabled={isUpdatingBanner}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove Banner
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-muted-foreground">
                <p className="text-sm">No {cosmeticTab === "username" ? "username colors" : cosmeticTab === "nameplate" ? "nameplates" : "profile backgrounds"} owned yet.</p>
                <Link href="/shop">
                  <Button variant="outline" size="sm" className="mt-1 gap-1.5 text-xs">
                    <ExternalLink size={13} />
                    Browse Shop
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {activeItems.map((item) => (
                  <CosmeticSwatch
                    key={item.id}
                    item={item}
                    onEquip={handleEquip}
                    isEquipping={isEquipping === item.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy & Karma</CardTitle>
            <CardDescription>Control who can see your content and karma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="private">Private Account</Label>
                <p className="text-sm text-muted-foreground">
                  Only your followers can see your posts
                </p>
              </div>
              <Switch
                id="private"
                checked={formData.isPrivate}
                onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="space-y-0.5">
                <Label htmlFor="require-approval">Require Follow Approval</Label>
                <p className="text-sm text-muted-foreground">
                  Manually approve who can follow you
                </p>
              </div>
              <Switch
                id="require-approval"
                checked={formData.requireFollowApproval}
                onCheckedChange={(checked) => setFormData({ ...formData, requireFollowApproval: checked })}
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-yellow-500" />
                <Label>Show Karma To</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Control who can see your karma points on your profile
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {(["nobody", "followers", "everyone"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, showKarma: opt })}
                    className={cn(
                      "p-3 rounded-lg border text-sm font-medium transition-all",
                      formData.showKarma === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{opt === "nobody" ? "🔒" : opt === "followers" ? "👥" : "🌍"}</span>
                      <span className="capitalize">{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {formData.showKarma !== "nobody" && profile && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Karma</p>
                <p className="text-2xl font-bold">{profile.karmaPoints.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Earned through academic performance and community engagement
                </p>
              </div>
            )}

            <div className="border-t border-border pt-6 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎓</span>
                <Label>Show Academic Profile To</Label>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Control who can see a link to your academic profile on your community profile
              </p>
              <p className="text-xs text-muted-foreground">
                (Temporary share codes still work regardless of this setting)
              </p>
              <div className="grid grid-cols-3 gap-3 mt-3">
                {(["nobody", "followers", "everyone"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, showAcademicProfile: opt })}
                    className={cn(
                      "p-3 rounded-lg border text-sm font-medium transition-all",
                      formData.showAcademicProfile === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{opt === "nobody" ? "🔒" : opt === "followers" ? "👥" : "🌍"}</span>
                      <span className="capitalize">{opt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving || !!usernameError} className="flex-1">
            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Save Changes
          </Button>
          <Link href={`/${formData.username}`}>
            <Button variant="outline" type="button">
              View Profile
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
