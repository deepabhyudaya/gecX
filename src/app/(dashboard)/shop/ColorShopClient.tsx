"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Coins,
  Search,
  Check,
  Palette,
  Type,
  Image as ImageIcon,
  Layers,
  X,
  ChevronRight,
  RotateCcw,
  IdCard,
  Sparkles,
  UserCircle,
  LayoutTemplate,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  purchaseColor,
  equipUsernameColor,
  equipProfileBgColor,
  unequipUsernameColor,
  unequipProfileBgColor,
  equipNameplate,
  unequipNameplate,
  equipAppTheme,
  unequipAppTheme,
  purchaseImpersonation,
  activateImpersonation,
  cancelImpersonation,
} from "@/actions/color-shop.actions";
import { useTheme } from "next-themes";

interface ColorItem {
  id: string;
  name: string;
  colorValue: string;
  type: string;
  shade: string;
  category: string;
  cost: number;
  owned: boolean;
  equipped: boolean;
}

interface ColorShopData {
  usernameColors: Record<string, ColorItem[]>;
  profileBgColors: ColorItem[];
  appThemes: ColorItem[];
  nameplates: ColorItem[];
  customMediaItems: ColorItem[];
  impersonateItems: ColorItem[];
  equippedUsernameColorId: string | null;
  equippedProfileBgColorId: string | null;
  equippedThemeId: string | null;
  equippedNameplateId: string | null;
  balance: { balance: number };
  activeImpersonation: { targetUserId: string; targetUsername: string; expiresAt: Date } | null;
}

const COLOR_CATEGORIES = [
  { key: "all", label: "All Items", icon: Layers, accent: "text-foreground" },
  { key: "theme", label: "App Themes", icon: Palette, accent: "text-rose-500" },
  { key: "username", label: "Username", icon: Type, accent: "text-violet-500" },
  { key: "nameplate", label: "Nameplates", icon: IdCard, accent: "text-amber-500" },
  { key: "background", label: "Background", icon: ImageIcon, accent: "text-cyan-500" },
  { key: "special", label: "Special", icon: Sparkles, accent: "text-pink-500" },
  { key: "consumable", label: "Consumables", icon: UserCircle, accent: "text-emerald-500" },
] as const;

type ColorCategoryKey = (typeof COLOR_CATEGORIES)[number]["key"];

const HUE_CATEGORIES = [
  { key: "red", label: "Red", hex: "#EF4444" },
  { key: "orange", label: "Orange", hex: "#F97316" },
  { key: "amber", label: "Amber", hex: "#F59E0B" },
  { key: "yellow", label: "Yellow", hex: "#EAB308" },
  { key: "lime", label: "Lime", hex: "#84CC16" },
  { key: "green", label: "Green", hex: "#22C55E" },
  { key: "teal", label: "Teal", hex: "#14B8A6" },
  { key: "cyan", label: "Cyan", hex: "#06B6D4" },
  { key: "sky", label: "Sky", hex: "#0EA5E9" },
  { key: "blue", label: "Blue", hex: "#3B82F6" },
  { key: "indigo", label: "Indigo", hex: "#6366F1" },
  { key: "violet", label: "Violet", hex: "#8B5CF6" },
  { key: "purple", label: "Purple", hex: "#A855F7" },
  { key: "pink", label: "Pink", hex: "#EC4899" },
  { key: "rose", label: "Rose", hex: "#F43F5E" },
  { key: "monochrome", label: "Mono", hex: "#6B7280" },
] as const;

function ColorCard({
  item,
  onPurchase,
  onEquip,
  isPurchasing,
  isEquipping,
  balance,
}: {
  item: ColorItem;
  onPurchase: () => void;
  onEquip: () => void;
  isPurchasing: boolean;
  isEquipping: boolean;
  balance: number;
}) {
  const canAfford = balance >= item.cost;

  let swatchStyle: React.CSSProperties = {};
  if (item.type === "theme") {
    try {
      const vars = JSON.parse(item.colorValue);
      if (vars.backgroundImage) {
        swatchStyle = { background: vars.backgroundImage };
      } else if (vars["--background"] && vars["--primary"]) {
        swatchStyle = { background: `linear-gradient(135deg, hsl(${vars["--background"]}) 50%, hsl(${vars["--primary"]}) 50%)` };
      } else if (vars["--background"]) {
        swatchStyle = { backgroundColor: `hsl(${vars["--background"]})` };
      } else {
        swatchStyle = { backgroundColor: "#888" };
      }
    } catch {
      swatchStyle = { backgroundColor: "#888" };
    }
  } else if (item.shade === "gradient" || item.type === "nameplate") {
    swatchStyle = { background: item.colorValue };
  } else {
    swatchStyle = { backgroundColor: item.colorValue };
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card overflow-hidden select-none",
        "transition-all duration-200 hover:-translate-y-0.5",
        "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:border-border/60",
        item.equipped && "ring-1 ring-primary/60",
        item.owned && !item.equipped && "ring-1 ring-emerald-500/40"
      )}
    >
      <div
        className="w-full aspect-square rounded-t-xl border-b border-border/40"
        style={swatchStyle}
      />

      {item.equipped && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-0.5 bg-primary/90 text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold shadow">
            <Check className="w-2.5 h-2.5" /> Equipped
          </span>
        </div>
      )}
      {item.owned && !item.equipped && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-0.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 text-[10px] font-semibold">
            <Check className="w-2.5 h-2.5" /> Owned
          </span>
        </div>
      )}

      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm border border-border/60 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-sm">
        <Coins className="w-3 h-3 text-amber-500 shrink-0" />
        {item.cost}
      </div>

      <div className="px-2.5 py-2 flex flex-col gap-1.5">
        <p className="text-[12px] font-semibold truncate leading-tight">{item.name}</p>

        {item.owned ? (
          <Button
            size="sm"
            variant={item.equipped ? "default" : "outline"}
            onClick={onEquip}
            disabled={isEquipping}
            className="w-full h-6 text-[10px] font-semibold px-2"
          >
            {isEquipping ? (
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
            ) : item.equipped ? (
              <Check className="w-3 h-3 mr-1" />
            ) : null}
            {isEquipping ? "Equipping…" : item.equipped ? "Re-equip" : "Equip"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant={canAfford ? "default" : "secondary"}
            onClick={onPurchase}
            disabled={!canAfford || isPurchasing}
            className="w-full h-7 text-[11px] font-semibold px-2"
          >
            {isPurchasing ? (
              <>
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                Buying…
              </>
            ) : canAfford ? (
              <>
                <Coins className="w-3 h-3 mr-1" />
                Buy · {item.cost} gecX
              </>
            ) : (
              <span className="text-muted-foreground">Need {item.cost} gecX</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function HueGroup({
  hueKey,
  items,
  onPurchase,
  onEquip,
  isPurchasing,
  isEquipping,
  balance,
}: {
  hueKey: string;
  items: ColorItem[];
  onPurchase: (id: string, cost: number) => void;
  onEquip: (item: ColorItem) => void;
  isPurchasing: string | null;
  isEquipping: string | null;
  balance: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hue = HUE_CATEGORIES.find((h) => h.key === hueKey);
  const label = hue?.label ?? hueKey;
  const hex = hue?.hex ?? "#888";

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 mb-2 group/header"
      >
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-150",
            expanded && "rotate-90"
          )}
        />
        <span
          className="w-3 h-3 rounded-full border border-border/60 shrink-0"
          style={{ backgroundColor: hex }}
        />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover/header:text-foreground transition-colors">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">
          {items.length} shade{items.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-1">
          {items.map((item) => (
            <ColorCard
              key={item.id}
              item={item}
              onPurchase={() => onPurchase(item.id, item.cost)}
              onEquip={() => onEquip(item)}
              isPurchasing={isPurchasing === item.id}
              isEquipping={isEquipping === item.id}
              balance={balance}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ColorSection({
  title,
  icon: Icon,
  accent,
  items,
  equippedId,
  onPurchase,
  onEquip,
  onUnequip,
  isPurchasing,
  isEquipping,
  balance,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  items: ColorItem[];
  equippedId: string | null;
  onPurchase: (id: string, cost: number) => void;
  onEquip: (item: ColorItem) => void;
  onUnequip: () => void;
  isPurchasing: string | null;
  isEquipping: string | null;
  balance: number;
}) {

  const byHue = useMemo(() => {
    const map = new Map<string, ColorItem[]>();
    items.forEach((it) => {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    });
    return map;
  }, [items]);

  const orderedHues = HUE_CATEGORIES.map((h) => h.key).filter((k) => byHue.has(k));

  return (
    <section>
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/40">
        <Icon className={cn("w-4 h-4", accent)} />
        <h2 className="text-sm font-bold">{title}</h2>
        <Badge variant="outline" className="text-[10px] font-semibold px-1.5 h-4 border">
          {items.length} shades
        </Badge>

        {equippedId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onUnequip}
            disabled={!!isEquipping}
            className="ml-auto h-6 text-[10px] text-muted-foreground gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Revert to karma
          </Button>
        )}
      </div>

      <div className="space-y-5">
        {orderedHues.map((hue) => (
          <HueGroup
            key={hue}
            hueKey={hue}
            items={byHue.get(hue)!}
            onPurchase={onPurchase}
            onEquip={onEquip}
            isPurchasing={isPurchasing}
            isEquipping={isEquipping}
            balance={balance}
          />
        ))}
      </div>
    </section>
  );
}

export function ColorShopClient({ initialData }: { initialData: ColorShopData }) {
  const [data, setData] = useState(initialData);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [isEquipping, setIsEquipping] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ColorCategoryKey>("all");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { setTheme } = useTheme();

  const allUsernameItems = useMemo((): ColorItem[] => {
    return Object.values(data.usernameColors).flat();
  }, [data.usernameColors]);

  const allBgItems = useMemo((): ColorItem[] => data.profileBgColors, [data.profileBgColors]);
  const allThemeItems = useMemo((): ColorItem[] => data.appThemes, [data.appThemes]);
  const allNameplateItems = useMemo((): ColorItem[] => data.nameplates, [data.nameplates]);
  const allCustomMediaItems = useMemo((): ColorItem[] => data.customMediaItems || [], [data.customMediaItems]);
  const allImpersonateItems = useMemo((): ColorItem[] => data.impersonateItems || [], [data.impersonateItems]);

  const [impersonateTarget, setImpersonateTarget] = useState("");
  const [selectedImpersonateItem, setSelectedImpersonateItem] = useState<ColorItem | null>(null);
  const [isActivatingImpersonation, setIsActivatingImpersonation] = useState(false);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handlePurchase = async (itemId: string, cost: number) => {
    setIsPurchasing(itemId);
    try {
      await purchaseColor(itemId);
      toast.success("Color purchased! 🎨");
      setData((prev) => ({
        ...prev,
        balance: { ...prev.balance, balance: prev.balance.balance - cost },
        usernameColors: Object.fromEntries(
          Object.entries(prev.usernameColors).map(([cat, items]) => [
            cat,
            items.map((i) => (i.id === itemId ? { ...i, owned: true } : i)),
          ])
        ),
        profileBgColors: prev.profileBgColors.map((i) =>
          i.id === itemId ? { ...i, owned: true } : i
        ),
        appThemes: prev.appThemes.map((i) =>
          i.id === itemId ? { ...i, owned: true } : i
        ),
        nameplates: prev.nameplates.map((i) =>
          i.id === itemId ? { ...i, owned: true } : i
        ),
        customMediaItems: prev.customMediaItems.map((i) =>
          i.id === itemId ? { ...i, owned: true } : i
        ),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setIsPurchasing(null);
    }
  };

  const handlePurchaseImpersonate = async (item: ColorItem) => {
    setIsPurchasing(item.id);
    try {
      await purchaseImpersonation(item.id);
      toast.success(`${item.name} purchased! Choose a user to impersonate.`);
      setData((prev) => ({
        ...prev,
        balance: { ...prev.balance, balance: prev.balance.balance - item.cost },
      }));
      setSelectedImpersonateItem(item);
      setShowImpersonateDialog(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleActivateImpersonation = async () => {
    if (!selectedImpersonateItem || !impersonateTarget.trim()) return;
    const durationDays = parseInt(selectedImpersonateItem.colorValue, 10);
    if (!durationDays || isNaN(durationDays)) {
      toast.error("Invalid item duration");
      return;
    }
    setIsActivatingImpersonation(true);
    try {
      const result = await activateImpersonation(impersonateTarget.trim(), durationDays);
      toast.success(`Impersonation active! Expires in ${durationDays} day${durationDays > 1 ? "s" : ""}.`);
      setData((prev) => ({
        ...prev,
        activeImpersonation: { targetUserId: impersonateTarget.trim(), targetUsername: result.targetUsername || impersonateTarget.trim(), expiresAt: result.expiresAt },
      }));
      setShowImpersonateDialog(false);
      setSelectedImpersonateItem(null);
      setImpersonateTarget("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setIsActivatingImpersonation(false);
    }
  };

  const handleCancelImpersonation = async () => {
    try {
      await cancelImpersonation();
      toast.success("Impersonation cancelled");
      setData((prev) => ({ ...prev, activeImpersonation: null }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  const handleEquipUsername = async (item: ColorItem) => {
    setIsEquipping(item.id);
    try {
      await equipUsernameColor(item.id);
      toast.success("Username color equipped! ✨");
      setData((prev) => ({
        ...prev,
        equippedUsernameColorId: item.id,
        usernameColors: Object.fromEntries(
          Object.entries(prev.usernameColors).map(([cat, items]) => [
            cat,
            items.map((i) => ({ ...i, equipped: i.id === item.id })),
          ])
        ),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Equip failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleUnequipUsername = async () => {
    setIsEquipping("unequip-username");
    try {
      await unequipUsernameColor();
      toast.success("Reverted to karma-based color");
      setData((prev) => ({
        ...prev,
        equippedUsernameColorId: null,
        usernameColors: Object.fromEntries(
          Object.entries(prev.usernameColors).map(([cat, items]) => [
            cat,
            items.map((i) => ({ ...i, equipped: false })),
          ])
        ),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleEquipBg = async (item: ColorItem) => {
    setIsEquipping(item.id);
    try {
      await equipProfileBgColor(item.id);
      toast.success("Profile background equipped! ✨");
      setData((prev) => ({
        ...prev,
        equippedProfileBgColorId: item.id,
        profileBgColors: prev.profileBgColors.map((i) => ({
          ...i,
          equipped: i.id === item.id,
        })),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Equip failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleUnequipBg = async () => {
    setIsEquipping("unequip-bg");
    try {
      await unequipProfileBgColor();
      toast.success("Reverted to karma-based background");
      setData((prev) => ({
        ...prev,
        equippedProfileBgColorId: null,
        profileBgColors: prev.profileBgColors.map((i) => ({ ...i, equipped: false })),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleEquipTheme = async (item: ColorItem) => {
    setIsEquipping(item.id);
    try {
      await equipAppTheme(item.id);
      toast.success("App Theme equipped! 🌟");
      setData((prev) => ({
        ...prev,
        equippedThemeId: item.id,
        appThemes: prev.appThemes.map((i) => ({ ...i, equipped: i.id === item.id })),
      }));

      if (item.colorValue) {
        try {
          const themeVars = JSON.parse(item.colorValue) as Record<string, string>;
          const htmlEl = document.documentElement;

          Object.entries(themeVars).forEach(([key, value]) => {
            if (key === "backgroundImage") {

              document.body.style.backgroundImage = value;
            } else {
              htmlEl.style.setProperty(key, value);
            }
          });

          const bg = themeVars["--background"];
          let mode: "light" | "dark" = "dark";
          if (bg) {
            const match = bg.match(/(\d+(?:\.\d+)?)%/g);
            if (match && match.length >= 2) {
              const lightness = parseFloat(match[1]);
              mode = lightness > 50 ? "light" : "dark";
            }
          }
          htmlEl.style.colorScheme = mode;
          setTheme(mode);

          localStorage.setItem("gecx_equipped_theme", JSON.stringify({ vars: themeVars, mode }));
        } catch (e) { }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Equip failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleUnequipTheme = async () => {
    setIsEquipping("unequip-theme");
    try {
      await unequipAppTheme();
      toast.success("Reverted to default app theme");
      setData((prev) => ({
        ...prev,
        equippedThemeId: null,
        appThemes: prev.appThemes.map((i) => ({ ...i, equipped: false })),
      }));

      document.documentElement.removeAttribute("style");
      document.body.style.backgroundImage = "";
      setTheme("dark");

      localStorage.removeItem("gecx_equipped_theme");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleEquipNameplate = async (item: ColorItem) => {
    setIsEquipping(item.id);
    try {
      await equipNameplate(item.id);
      toast.success("Nameplate equipped! 🏅");
      setData((prev) => ({
        ...prev,
        equippedNameplateId: item.id,
        nameplates: prev.nameplates.map((i) => ({ ...i, equipped: i.id === item.id })),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Equip failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const handleUnequipNameplate = async () => {
    setIsEquipping("unequip-nameplate");
    try {
      await unequipNameplate();
      toast.success("Removed nameplate");
      setData((prev) => ({
        ...prev,
        equippedNameplateId: null,
        nameplates: prev.nameplates.map((i) => ({ ...i, equipped: false })),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsEquipping(null);
    }
  };

  const filteredUsername = useMemo(() => {
    if (!search.trim()) return allUsernameItems;
    const q = search.toLowerCase();
    return allUsernameItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.shade.toLowerCase().includes(q) ||
        i.colorValue.toLowerCase().includes(q)
    );
  }, [allUsernameItems, search]);

  const filteredBg = useMemo(() => {
    if (!search.trim()) return allBgItems;
    const q = search.toLowerCase();
    return allBgItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.shade.toLowerCase().includes(q) ||
        i.colorValue.toLowerCase().includes(q)
    );
  }, [allBgItems, search]);

  const filteredTheme = useMemo(() => {
    if (!search.trim()) return allThemeItems;
    const q = search.toLowerCase();
    return allThemeItems.filter((i) =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.shade.toLowerCase().includes(q)
    );
  }, [allThemeItems, search]);

  const filteredNameplate = useMemo(() => {
    if (!search.trim()) return allNameplateItems;
    const q = search.toLowerCase();
    return allNameplateItems.filter((i) =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.shade.toLowerCase().includes(q)
    );
  }, [allNameplateItems, search]);

  const filteredCustomMedia = useMemo(() => {
    if (!search.trim()) return allCustomMediaItems;
    const q = search.toLowerCase();
    return allCustomMediaItems.filter((i) =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [allCustomMediaItems, search]);

  const filteredImpersonate = useMemo(() => {
    if (!search.trim()) return allImpersonateItems;
    const q = search.toLowerCase();
    return allImpersonateItems.filter((i) =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [allImpersonateItems, search]);

  const ownedCount = [...allUsernameItems, ...allBgItems, ...allThemeItems, ...allNameplateItems, ...allCustomMediaItems].filter((i) => i.owned).length;
  const isSearching = search.trim().length > 0;

  const counts: Record<string, number> = {
    all: allUsernameItems.length + allBgItems.length + allThemeItems.length + allNameplateItems.length + allCustomMediaItems.length + allImpersonateItems.length,
    username: allUsernameItems.length,
    background: allBgItems.length,
    theme: allThemeItems.length,
    nameplate: allNameplateItems.length,
    special: allCustomMediaItems.length,
    consumable: allImpersonateItems.length,
  };

  const showUsername = activeCategory === "all" || activeCategory === "username";
  const showBg = activeCategory === "all" || activeCategory === "background";
  const showTheme = activeCategory === "all" || activeCategory === "theme";
  const showNameplate = activeCategory === "all" || activeCategory === "nameplate";
  const showSpecial = activeCategory === "all" || activeCategory === "special";
  const showConsumable = activeCategory === "all" || activeCategory === "consumable";

  const totalVisible =
    (showUsername ? filteredUsername.length : 0) +
    (showBg ? filteredBg.length : 0) +
    (showTheme ? filteredTheme.length : 0) +
    (showNameplate ? filteredNameplate.length : 0) +
    (showSpecial ? filteredCustomMedia.length : 0) +
    (showConsumable ? filteredImpersonate.length : 0);

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-sidebar h-full overflow-hidden">
        <div className="px-3 pt-4 pb-3 border-b border-border/60">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
            Color Shop
          </p>
        </div>

        <div className="mx-2 mt-3 mb-1 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/15 px-3 py-2">
          <Coins className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide leading-none">Balance</p>
            <p className="text-sm font-bold tabular-nums leading-tight">
              {data.balance.balance.toLocaleString()}
              <span className="text-[10px] font-normal text-muted-foreground ml-0.5">gecXC</span>
            </p>
          </div>
          {ownedCount > 0 && (
            <span className="ml-auto text-[10px] font-semibold text-muted-foreground shrink-0">
              {ownedCount} owned
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 pt-1 pb-1.5">
            Categories
          </p>
          {COLOR_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            const count = counts[cat.key] ?? 0;
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setSearch(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[13px] font-medium transition-all duration-100",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? cat.accent : "text-muted-foreground/60")} />
                <span className="flex-1 truncate">{cat.label}</span>
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-bold shrink-0",
                  isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </span>
              </button>
            );
          })}

          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 pt-3 pb-1.5">
            Filter by Hue
          </p>
          {HUE_CATEGORIES.map((hue) => (
            <button
              key={hue.key}
              onClick={() => setSearch(hue.label.toLowerCase())}
              className="w-full flex items-center gap-2.5 px-2 py-1 rounded-md text-left text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-100"
            >
              <span
                className="w-3 h-3 rounded-full border border-border/60 shrink-0"
                style={{ backgroundColor: hue.hex }}
              />
              <span className="flex-1 truncate">{hue.label}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-none">
                {isSearching
                  ? `Search: "${search}"`
                  : (COLOR_CATEGORIES.find((c) => c.key === activeCategory)?.label ?? "Colors & Backgrounds")}
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totalVisible} shade{totalVisible !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="md:hidden ml-auto flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/15 rounded-lg px-2 py-1 shrink-0">
              <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-bold tabular-nums leading-none">
                {data.balance.balance.toLocaleString()} <span className="text-[9px] font-normal text-muted-foreground">gecX</span>
              </span>
            </div>

            <div className="hidden sm:block md:ml-auto relative w-48 sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className={cn(
                  "w-full pl-8 pr-7 py-1.5 rounded-lg text-[12px] border bg-muted/50 text-foreground",
                  "placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-ring focus:border-ring",
                  "transition-all duration-150"
                )}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="sm:hidden px-4 pb-3">
            <div className="relative w-full shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className={cn(
                  "w-full pl-8 pr-7 py-1.5 rounded-lg text-[12px] border bg-muted/50 text-foreground",
                  "placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-ring focus:border-ring",
                  "transition-all duration-150"
                )}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 pb-3">
            {COLOR_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => { setActiveCategory(cat.key); setSearch(""); }}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all",
                    activeCategory === cat.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-accent"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 pb-24 space-y-10">
            {totalVisible === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <Search className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No colors match your search.</p>
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                {showTheme && filteredTheme.length > 0 && (
                  <ColorSection
                    title="App Themes"
                    icon={Palette}
                    accent="text-rose-500"
                    items={filteredTheme}
                    equippedId={data.equippedThemeId}
                    onPurchase={handlePurchase}
                    onEquip={handleEquipTheme}
                    onUnequip={handleUnequipTheme}
                    isPurchasing={isPurchasing}
                    isEquipping={isEquipping}
                    balance={data.balance.balance}
                  />
                )}

                {showNameplate && filteredNameplate.length > 0 && (
                  <ColorSection
                    title="Nameplates"
                    icon={IdCard}
                    accent="text-amber-500"
                    items={filteredNameplate}
                    equippedId={data.equippedNameplateId}
                    onPurchase={handlePurchase}
                    onEquip={handleEquipNameplate}
                    onUnequip={handleUnequipNameplate}
                    isPurchasing={isPurchasing}
                    isEquipping={isEquipping}
                    balance={data.balance.balance}
                  />
                )}

                {showUsername && filteredUsername.length > 0 && (
                  <ColorSection
                    title="Username Colors"
                    icon={Type}
                    accent="text-violet-500"
                    items={filteredUsername}
                    equippedId={data.equippedUsernameColorId}
                    onPurchase={handlePurchase}
                    onEquip={handleEquipUsername}
                    onUnequip={handleUnequipUsername}
                    isPurchasing={isPurchasing}
                    isEquipping={isEquipping}
                    balance={data.balance.balance}
                  />
                )}

                {showBg && filteredBg.length > 0 && (
                  <ColorSection
                    title="Profile Backgrounds"
                    icon={ImageIcon}
                    accent="text-cyan-500"
                    items={filteredBg}
                    equippedId={data.equippedProfileBgColorId}
                    onPurchase={handlePurchase}
                    onEquip={handleEquipBg}
                    onUnequip={handleUnequipBg}
                    isPurchasing={isPurchasing}
                    isEquipping={isEquipping}
                    balance={data.balance.balance}
                  />
                )}

                {showSpecial && filteredCustomMedia.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/40">
                      <Sparkles className="w-4 h-4 text-pink-500" />
                      <h2 className="text-sm font-bold">Special Features</h2>
                      <span className="text-[10px] text-muted-foreground ml-2">Unlock custom avatar & banner</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredCustomMedia.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "group relative flex flex-col rounded-xl border bg-card overflow-hidden",
                            "transition-all duration-200 hover:-translate-y-0.5",
                            "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:border-border/60",
                            item.owned && "ring-1 ring-emerald-500/40"
                          )}
                        >
                          <div className="w-full aspect-[2/1] bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 border-b border-border/40 flex items-center justify-center">
                            {item.type === "customAvatar" ? (
                              <UserCircle className="w-12 h-12 text-pink-500/60" />
                            ) : (
                              <LayoutTemplate className="w-12 h-12 text-emerald-500/60" />
                            )}
                          </div>

                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold">{item.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.type === "customAvatar"
                                    ? "Use any GIF/image as your avatar"
                                    : "Add a banner to your profile (2.5:1)"}
                                </p>
                              </div>
                              {item.owned ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                                  <Check className="w-3 h-3" />
                                  Owned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-600 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                                  <Coins className="w-3 h-3" />
                                  {item.cost}
                                </span>
                              )}
                            </div>

                            {!item.owned && (
                              <Button
                                size="sm"
                                onClick={() => handlePurchase(item.id, item.cost)}
                                disabled={isPurchasing === item.id || data.balance.balance < item.cost}
                                className="w-full mt-3 h-8 text-xs"
                                variant={data.balance.balance >= item.cost ? "default" : "secondary"}
                              >
                                {isPurchasing === item.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Buying…
                                  </>
                                ) : data.balance.balance >= item.cost ? (
                                  <>
                                    <Coins className="w-3 h-3 mr-1" />
                                    Buy for {item.cost} gecX
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">Need {item.cost} gecX</span>
                                )}
                              </Button>
                            )}
                            {item.owned && (
                              <p className="text-xs text-muted-foreground mt-3 text-center">
                                Configure in Settings → Community → Cosmetics
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {showConsumable && filteredImpersonate.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/40">
                      <UserCircle className="w-4 h-4 text-emerald-500" />
                      <h2 className="text-sm font-bold">Impersonation</h2>
                      <span className="text-[10px] text-muted-foreground ml-2">Copy another user's appearance temporarily</span>
                      {data.activeImpersonation && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelImpersonation}
                          className="ml-auto h-6 text-[10px] text-muted-foreground gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancel Active
                        </Button>
                      )}
                    </div>

                    {data.activeImpersonation && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          You are currently impersonating <span className="font-bold">@{data.activeImpersonation.targetUsername}</span>
                        </p>
                        <p className="text-[11px] text-emerald-500/80 mt-0.5">
                          Expires: {new Date(data.activeImpersonation.expiresAt).toLocaleDateString()} {new Date(data.activeImpersonation.expiresAt).toLocaleTimeString()}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {filteredImpersonate.map((item) => {
                        const duration = parseInt(item.colorValue, 10);
                        const canAfford = data.balance.balance >= item.cost;
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "group relative flex flex-col rounded-xl border bg-card overflow-hidden",
                              "transition-all duration-200 hover:-translate-y-0.5",
                              "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:border-border/60"
                            )}
                          >
                            <div className="w-full aspect-[2/1] bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border-b border-border/40 flex items-center justify-center">
                              <UserCircle className="w-12 h-12 text-emerald-500/60" />
                            </div>
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold">{item.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Copy username color, bg, theme, nameplate for {duration} day{duration > 1 ? "s" : ""}
                                  </p>
                                </div>
                                <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-600 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0">
                                  <Coins className="w-3 h-3" />
                                  {item.cost}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handlePurchaseImpersonate(item)}
                                disabled={isPurchasing === item.id || !canAfford}
                                className="w-full mt-3 h-8 text-xs"
                                variant={canAfford ? "default" : "secondary"}
                              >
                                {isPurchasing === item.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Buying…
                                  </>
                                ) : canAfford ? (
                                  <>
                                    <Coins className="w-3 h-3 mr-1" />
                                    Buy &amp; Use
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">Need {item.cost} gecX</span>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      
      <Dialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Impersonate User</DialogTitle>
            <DialogDescription>
              Enter the username of the person whose appearance you want to copy.
              Their username color, profile background, app theme, and nameplate will be applied to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Username</label>
              <Input
                value={impersonateTarget}
                onChange={(e) => setImpersonateTarget(e.target.value)}
                placeholder="Enter username (e.g. johndoe)"
                className="text-sm"
              />
            </div>
            {selectedImpersonateItem && (
              <p className="text-xs text-muted-foreground">
                Duration: {selectedImpersonateItem.colorValue} day{parseInt(selectedImpersonateItem.colorValue, 10) > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowImpersonateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleActivateImpersonation}
              disabled={!impersonateTarget.trim() || isActivatingImpersonation}
            >
              {isActivatingImpersonation ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Activating…
                </>
              ) : (
                "Activate Impersonation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
