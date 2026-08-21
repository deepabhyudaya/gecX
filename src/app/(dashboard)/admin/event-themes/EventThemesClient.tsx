"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-toastify";
import {
  createEventTheme,
  updateEventTheme,
  deleteEventTheme,
  pushEventTheme,
  endEventTheme,
} from "@/actions/event-theme.actions";
import { ArrowLeft, Sparkles, Trash2, Edit3, Rocket, StopCircle, Palette, ImageIcon, Type, Paintbrush, SmilePlus, ImagePlus } from "lucide-react";
import Link from "next/link";
import EmojiPicker from "@/components/messages/LazyEmojiPicker";
import { Theme as EmojiPickerTheme } from "emoji-picker-react";
import EmojiRenderer, { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { useTheme } from "next-themes";

interface EventTheme {
  id: string;
  name: string;
  backgroundImage: string | null;
  bannerImage: string | null;
  bannerText: string | null;
  bannerTextColor: string;
  bannerBgColor: string;
  bannerOverlayOpacity: number;
  panelBgOpacity: number;
  greetingMessage: string | null;
  greetingAuthorName: string | null;
  themeVars: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  initialThemes: EventTheme[];
}

const baseVariants = [
  { type: "Dark", bg: "240 10% 4%", fg: "0 0% 98%", card: "240 10% 6%", border: "240 10% 12%", muted: "240 10% 12%", mutedFg: "240 5% 65%" },
  { type: "Light", bg: "0 0% 100%", fg: "240 10% 4%", card: "0 0% 98%", border: "240 6% 90%", muted: "240 6% 94%", mutedFg: "240 4% 46%" },
  { type: "Midnight", bg: "220 30% 10%", fg: "0 0% 98%", card: "220 30% 13%", border: "220 30% 18%", muted: "220 30% 18%", mutedFg: "220 15% 70%" },
  { type: "Amoled", bg: "0 0% 0%", fg: "0 0% 100%", card: "0 0% 4%", border: "0 0% 12%", muted: "0 0% 12%", mutedFg: "0 0% 60%" },
  { type: "Sepia", bg: "40 50% 95%", fg: "40 50% 20%", card: "40 50% 92%", border: "40 30% 85%", muted: "40 30% 88%", mutedFg: "40 30% 50%" },
  { type: "Discord", bg: "220 13% 18%", fg: "0 0% 100%", card: "220 13% 22%", border: "220 13% 28%", muted: "220 13% 28%", mutedFg: "220 10% 70%" },
  { type: "Dim", bg: "210 20% 15%", fg: "0 0% 98%", card: "210 20% 18%", border: "210 20% 25%", muted: "210 20% 25%", mutedFg: "210 15% 75%" },
  { type: "Forest", bg: "140 30% 8%", fg: "140 10% 95%", card: "140 30% 12%", border: "140 30% 20%", muted: "140 30% 20%", mutedFg: "140 15% 70%" },
  { type: "Coffee", bg: "30 30% 10%", fg: "30 20% 95%", card: "30 30% 15%", border: "30 30% 22%", muted: "30 30% 22%", mutedFg: "30 15% 70%" },
  { type: "Plum", bg: "280 30% 12%", fg: "280 20% 95%", card: "280 30% 16%", border: "280 30% 24%", muted: "280 30% 24%", mutedFg: "280 15% 70%" },
];

const accents = [
  { name: "Crimson", primary: "348 83% 47%" },
  { name: "Red", primary: "0 84% 60%" },
  { name: "Orange", primary: "24 95% 53%" },
  { name: "Amber", primary: "38 92% 50%" },
  { name: "Yellow", primary: "45 93% 47%" },
  { name: "Lime", primary: "84 81% 44%" },
  { name: "Emerald", primary: "142 71% 45%" },
  { name: "Green", primary: "142 76% 36%" },
  { name: "Teal", primary: "173 80% 40%" },
  { name: "Cyan", primary: "189 94% 43%" },
  { name: "Sky", primary: "199 89% 48%" },
  { name: "Azure", primary: "200 98% 39%" },
  { name: "Blue", primary: "221 83% 53%" },
  { name: "Indigo", primary: "239 84% 67%" },
  { name: "Violet", primary: "262 83% 58%" },
  { name: "Purple", primary: "271 91% 65%" },
  { name: "Fuchsia", primary: "292 84% 61%" },
  { name: "Pink", primary: "330 81% 60%" },
  { name: "Rose", primary: "346 87% 60%" },
  { name: "Slate", primary: "215 16% 47%" },
];

function generateThemeVars(baseType: string, accentPrimary: string) {
  const base = baseVariants.find((b) => b.type === baseType) || baseVariants[0];
  const isLight = base.type === "Light" || base.type === "Sepia";
  return JSON.stringify({
    "--background": base.bg,
    "--foreground": base.fg,
    "--card": base.card,
    "--card-foreground": base.fg,
    "--popover": base.card,
    "--popover-foreground": base.fg,
    "--primary": accentPrimary,
    "--primary-foreground": isLight ? "0 0% 98%" : "0 0% 100%",
    "--secondary": base.muted,
    "--secondary-foreground": base.fg,
    "--muted": base.muted,
    "--muted-foreground": base.mutedFg,
    "--accent": base.muted,
    "--accent-foreground": base.fg,
    "--destructive": "0 84.2% 60.2%",
    "--destructive-foreground": "0 0% 98%",
    "--border": base.border,
    "--input": base.border,
    "--ring": accentPrimary,
    "--sidebar-background": base.card,
    "--sidebar-foreground": base.fg,
    "--sidebar-primary": accentPrimary,
    "--sidebar-primary-foreground": isLight ? "0 0% 98%" : "0 0% 100%",
    "--sidebar-accent": base.muted,
    "--sidebar-accent-foreground": base.fg,
    "--sidebar-border": base.border,
    "--sidebar-ring": accentPrimary,
  });
}

export default function EventThemesClient({ initialThemes }: Props) {
  const [themes, setThemes] = useState<EventTheme[]>(initialThemes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [bannerTextColor, setBannerTextColor] = useState("#ffffff");
  const [bannerBgColor, setBannerBgColor] = useState("rgba(0,0,0,0.6)");
  const [bannerOverlayOpacity, setBannerOverlayOpacity] = useState(0.4);
  const [panelBgOpacity, setPanelBgOpacity] = useState(0.92);
  const [greetingMessage, setGreetingMessage] = useState("");
  const [greetingAuthorName, setGreetingAuthorName] = useState("");
  const [themeVars, setThemeVars] = useState("");
  const [baseType, setBaseType] = useState("Dark");
  const [accentName, setAccentName] = useState("Orange");
  const [useCustomVars, setUseCustomVars] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
  const customEmojiPickerRef = useRef<HTMLDivElement>(null);
  const [customEmojis, setCustomEmojis] = useState<Array<{ id: string; name: string; imageUrl: string; groupName: string }>>([]);

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; theme: EventTheme | null }>({ open: false, theme: null });

  useEffect(() => {
    fetch("/api/user-emojis")
      .then((res) => res.json())
      .then((data) => {
        const emojis = data.emojis || [];
        setCustomEmojis(emojis);
      })
      .catch(() => setCustomEmojis([]));
  }, []);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!showCustomEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (customEmojiPickerRef.current && !customEmojiPickerRef.current.contains(e.target as Node)) {
        setShowCustomEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustomEmojiPicker]);

  const resetForm = () => {
    setName("");
    setBackgroundImage("");
    setBannerImage("");
    setBannerText("");
    setBannerTextColor("#ffffff");
    setBannerBgColor("rgba(0,0,0,0.6)");
    setBannerOverlayOpacity(0.4);
    setPanelBgOpacity(0.92);
    setGreetingMessage("");
    setGreetingAuthorName("");
    setThemeVars("");
    setBaseType("Dark");
    setAccentName("Orange");
    setUseCustomVars(false);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (theme: EventTheme) => {
    setEditingId(theme.id);
    setName(theme.name);
    setBackgroundImage(theme.backgroundImage || "");
    setBannerImage(theme.bannerImage || "");
    setBannerText(theme.bannerText || "");
    setBannerTextColor(theme.bannerTextColor);
    setBannerBgColor(theme.bannerBgColor);
    setBannerOverlayOpacity(theme.bannerOverlayOpacity ?? 0.4);
    setPanelBgOpacity(theme.panelBgOpacity ?? 0.92);
    setGreetingMessage(theme.greetingMessage || "");
    setGreetingAuthorName(theme.greetingAuthorName || "");
    setThemeVars(theme.themeVars);
    setUseCustomVars(true);
    setShowForm(true);
  };

  const buildThemeVars = () => {
    if (useCustomVars && themeVars.trim()) return themeVars.trim();
    const accent = accents.find((a) => a.name === accentName) || accents[0];
    return generateThemeVars(baseType, accent.primary);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        backgroundImage: backgroundImage.trim() || undefined,
        bannerImage: bannerImage.trim() || undefined,
        bannerText: bannerText.trim() || undefined,
        bannerTextColor: bannerTextColor.trim() || undefined,
        bannerBgColor: bannerBgColor.trim() || undefined,
        bannerOverlayOpacity,
        panelBgOpacity,
        greetingMessage: greetingMessage.trim() || undefined,
        greetingAuthorName: greetingAuthorName.trim() || undefined,
        themeVars: buildThemeVars(),
      };

      if (editingId) {
        const result = await updateEventTheme(editingId, payload);
        if (result.success) {
          toast.success("Event theme updated");
          setThemes((prev) => prev.map((t) => (t.id === editingId ? result.theme : t)));
          setShowForm(false);
          resetForm();
        }
      } else {
        const result = await createEventTheme(payload);
        if (result.success) {
          toast.success("Event theme created");
          setThemes((prev) => [result.theme, ...prev]);
          setShowForm(false);
          resetForm();
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save theme");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.theme) return;
    try {
      await deleteEventTheme(deleteDialog.theme.id);
      toast.success("Event theme deleted");
      setThemes((prev) => prev.filter((t) => t.id !== deleteDialog.theme!.id));
      setDeleteDialog({ open: false, theme: null });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  const handlePush = async (theme: EventTheme) => {
    try {
      const result = await pushEventTheme(theme.id);
      if (result.success) {
        toast.success(`"${theme.name}" is now live for all users!`);
        setThemes((prev) =>
          prev.map((t) => ({ ...t, isActive: t.id === theme.id }))
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to push theme");
    }
  };

  const handleEnd = async (theme: EventTheme) => {
    try {
      await endEventTheme(theme.id);
      toast.success("Event theme ended");
      setThemes((prev) => prev.map((t) => (t.id === theme.id ? { ...t, isActive: false } : t)));
    } catch (err: any) {
      toast.error(err?.message || "Failed to end theme");
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Event Themes
          </h1>
          <p className="text-sm text-muted-foreground">
            Create seasonal themes and push them to all users instantly.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-2">
          <Palette className="w-4 h-4" />
          New Event Theme
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Event Theme" : "Create Event Theme"}</CardTitle>
            <CardDescription>
              Design a theme with custom colors, banner, and background.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Theme Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Celebration" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bgImage">Background Image URL</Label>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <Input id="bgImage" value={backgroundImage} onChange={(e) => setBackgroundImage(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bannerImage">Banner Image URL</Label>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <Input id="bannerImage" value={bannerImage} onChange={(e) => setBannerImage(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bannerText">Banner Text</Label>
                <div className="flex items-center gap-2 relative">
                  <Type className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    id="bannerText"
                    value={bannerText}
                    onChange={(e) => setBannerText(e.target.value)}
                    placeholder="Happy Diwali!"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                      showEmojiPicker
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                    title="Add emoji"
                  >
                    <SmilePlus className="w-4 h-4" />
                  </button>
                  {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute top-full right-0 mt-2 z-[9999]">
                      <EmojiPicker
                        onEmojiClick={(emojiData) => {
                          setBannerText((prev) => prev + emojiData.emoji);
                        }}
                        width={300}
                        height={400}
                        theme={resolvedTheme === "dark" ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowEmojiPicker(false); setShowCustomEmojiPicker((v) => !v); }}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors ${
                      showCustomEmojiPicker
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                    title="Add custom emoji"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </button>
                  {showCustomEmojiPicker && (
                    <div ref={customEmojiPickerRef} className="absolute top-full right-0 mt-2 z-[9999] w-[320px] max-h-[320px] overflow-y-auto rounded-xl border bg-card p-3 shadow-xl">
                      {customEmojis.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No custom emojis found</p>
                      ) : (
                        <div className="space-y-3">
                          {Array.from(new Set(customEmojis.map((e) => e.groupName))).map((group) => (
                            <div key={group}>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
                              <div className="grid grid-cols-6 gap-1">
                                {customEmojis
                                  .filter((e) => e.groupName === group)
                                  .map((emoji) => (
                                    <button
                                      key={emoji.id}
                                      type="button"
                                      onClick={() => {
                                        setBannerText((prev) => prev + `:${emoji.name}:`);
                                        setShowCustomEmojiPicker(false);
                                      }}
                                      className="flex items-center justify-center p-1.5 rounded-md hover:bg-accent transition-colors"
                                      title={`:${emoji.name}:`}
                                    >
                                      <img src={emoji.imageUrl} alt={emoji.name} className="w-6 h-6 object-contain" loading="lazy" />
                                    </button>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bannerTextColor">Banner Text Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bannerTextColor}
                    onChange={(e) => setBannerTextColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input value={bannerTextColor} onChange={(e) => setBannerTextColor(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bannerBgColor">Banner Background</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bannerBgColor.startsWith("#") ? bannerBgColor : "#000000"}
                    onChange={(e) => setBannerBgColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer shrink-0"
                  />
                  <Input id="bannerBgColor" value={bannerBgColor} onChange={(e) => setBannerBgColor(e.target.value)} placeholder="rgba(0,0,0,0.6)" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Banner Overlay Opacity</Label>
                  <span className="text-xs text-muted-foreground font-mono">{Math.round(bannerOverlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={bannerOverlayOpacity}
                  onChange={(e) => setBannerOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-xs text-muted-foreground">Lower = more banner image visible. Higher = more overlay color.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Panel Background Opacity</Label>
                  <span className="text-xs text-muted-foreground font-mono">{Math.round(panelBgOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={panelBgOpacity}
                  onChange={(e) => setPanelBgOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-xs text-muted-foreground">Lower = background image shows through more. Higher = more solid panels.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="greetingMessage">Greeting Message (shown in dialog)</Label>
                <Textarea
                  id="greetingMessage"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder="Hey there! A festive theme has been applied just for you..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Custom message shown to users in the event theme dialog. Leave blank for default.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="greetingAuthorName">Greeting Author Name</Label>
                <Input
                  id="greetingAuthorName"
                  value={greetingAuthorName}
                  onChange={(e) => setGreetingAuthorName(e.target.value)}
                  placeholder="Admin Team"
                />
                <p className="text-xs text-muted-foreground">Name shown below the greeting message (e.g. "— Principal").</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Theme Colors</Label>
              </div>
              {!useCustomVars ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Base Variant</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={baseType}
                      onChange={(e) => setBaseType(e.target.value)}
                    >
                      {baseVariants.map((b) => (
                        <option key={b.type} value={b.type}>{b.type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={accentName}
                      onChange={(e) => setAccentName(e.target.value)}
                    >
                      {accents.map((a) => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Custom Theme Variables (JSON)</Label>
                  <Textarea
                    value={themeVars}
                    onChange={(e) => setThemeVars(e.target.value)}
                    rows={6}
                    placeholder='{"--background":"240 10% 4%", ...}'
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customVars"
                  checked={useCustomVars}
                  onChange={(e) => setUseCustomVars(e.target.checked)}
                  className="rounded border-primary"
                />
                <Label htmlFor="customVars" className="text-xs text-muted-foreground cursor-pointer">
                  Edit custom JSON variables
                </Label>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingId ? "Update Theme" : "Create Theme"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((theme) => (
          <Card key={theme.id} className={theme.isActive ? "border-green-500/50 ring-1 ring-green-500/20" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{theme.name}</CardTitle>
                  <CardDescription>
                    {theme.isActive ? (
                      <span className="text-green-500 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Currently Active
                      </span>
                    ) : (
                      "Inactive"
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(theme)}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteDialog({ open: true, theme })}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(theme.bannerImage || theme.bannerText) && (
                <div
                  className="h-20 rounded-lg bg-cover bg-center flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundImage: theme.bannerImage ? `url(${theme.bannerImage})` : undefined }}
                >
                  <div className="absolute inset-0" style={{ backgroundColor: theme.bannerBgColor, opacity: theme.bannerOverlayOpacity ?? 0.4 }} />
                  {theme.bannerText && (
                    <span className="relative z-10 font-bold text-lg" style={{ color: theme.bannerTextColor }}>
                      <EmojiRenderer content={theme.bannerText} emojiMap={buildEmojiMap(customEmojis, [])} />
                    </span>
                  )}
                </div>
              )}
              {theme.backgroundImage && (
                <div className="h-16 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${theme.backgroundImage})` }} />
              )}
              <div className="flex gap-2">
                {!theme.isActive ? (
                  <Button className="flex-1 gap-2" onClick={() => handlePush(theme)}>
                    <Rocket className="w-4 h-4" />
                    Push Live
                  </Button>
                ) : (
                  <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleEnd(theme)}>
                    <StopCircle className="w-4 h-4" />
                    End Event
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {themes.length === 0 && !showForm && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No event themes yet. Create one to get started!</p>
        </div>
      )}

      <Dialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog({ open: o, theme: deleteDialog.theme })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event Theme</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.theme?.name}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, theme: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
