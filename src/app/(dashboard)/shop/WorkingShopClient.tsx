"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { purchaseAvatar, equipAvatar } from "@/actions/avatar-shop.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Search,
  Check,
  Sparkles,
  Smile,
  Bot,
  Palette,
  Gamepad2,
  User,
  Layers,
  Orbit,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShopItem {
  id: string;
  style: string;
  seed: string;
  name: string;
  cost: number;
  category: string;
  owned: boolean;
  equippedAcademic: boolean;
  equippedCommunity: boolean;
  previewUrl: string;
}

interface ShopData {
  items: ShopItem[];
  balance: { balance: number; totalEarned?: number; totalSpent?: number };
  equipped: {
    academicStyle?: string;
    academicSeed?: string;
    communityStyle?: string;
    communitySeed?: string;
  };
}

const CATEGORIES = [
  { key: "all", label: "All Styles", icon: Layers, accent: "text-foreground" },
  { key: "characters", label: "Characters", icon: User, accent: "text-sky-500" },
  { key: "fun", label: "Fun & Emoji", icon: Smile, accent: "text-amber-500" },
  { key: "robots", label: "Robots", icon: Bot, accent: "text-emerald-500" },
  { key: "artistic", label: "Artistic", icon: Palette, accent: "text-purple-500" },
  { key: "pixel", label: "Pixel Art", icon: Gamepad2, accent: "text-rose-500" },
  { key: "abstract", label: "Abstract", icon: Sparkles, accent: "text-blue-500" },
  { key: "orbs", label: "Orbs", icon: Orbit, accent: "text-violet-500" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

const CATEGORY_BADGE: Record<string, string> = {
  characters: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  fun: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  robots: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  artistic: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  pixel: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  abstract: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  orbs: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
};

const STYLE_LABELS: Record<string, string> = {
  "adventurer": "Adventurer",
  "adventurer-neutral": "Adventurer Neutral",
  "avataaars": "Avataaars",
  "avataaars-neutral": "Avataaars Neutral",
  "big-ears": "Big Ears",
  "big-ears-neutral": "Big Ears Neutral",
  "big-smile": "Big Smile",
  "bottts": "Bottts",
  "bottts-neutral": "Bottts Neutral",
  "croodles": "Croodles",
  "croodles-neutral": "Croodles Neutral",
  "dylan": "Dylan",
  "fun-emoji": "Fun Emoji",
  "glass": "Glass",
  "icons": "Icons",
  "identicon": "Identicon",
  "initials": "Initials",
  "lorelei": "Lorelei",
  "lorelei-neutral": "Lorelei Neutral",
  "micah": "Micah",
  "miniavs": "Miniavs",
  "notionists": "Notionists",
  "notionists-neutral": "Notionists Neutral",
  "open-peeps": "Open Peeps",
  "personas": "Personas",
  "pixel-art": "Pixel Art",
  "pixel-art-neutral": "Pixel Art Neutral",
  "rings": "Rings",
  "shapes": "Shapes",
  "thumbs": "Thumbs",
  "toon-head": "Toon Head",
  "orb": "Orb",
};

function AvatarImg({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground/60 text-[10px] font-medium text-center px-2 leading-tight">
        {alt}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-[1.08]"
      onError={() => setErrored(true)}
    />
  );
}

function AvatarCard({
  item,
  onPurchase,
  onEquip,
  isPurchasing,
  balance,
}: {
  item: ShopItem;
  onPurchase: () => void;
  onEquip: (profileType: "academic" | "community") => void;
  isPurchasing: boolean;
  balance: number;
}) {
  const canAfford = balance >= item.cost;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card overflow-hidden select-none",
        "transition-all duration-200 hover:-translate-y-0.5",
        "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/25 hover:border-border/60",
        item.owned && "ring-1 ring-emerald-500/40"
      )}
    >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm border border-border/60 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-sm">
        <Coins className="w-3 h-3 text-amber-500 shrink-0" />
        {item.cost}
      </div>

      {item.owned && (
        <div className="absolute top-2 left-2 z-10">
          <span className="inline-flex items-center gap-0.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 text-[10px] font-semibold">
            <Check className="w-2.5 h-2.5" />
            Owned
          </span>
        </div>
      )}

      <div className="relative mx-2.5 mt-2.5 mb-0 rounded-lg overflow-hidden bg-muted/50 dark:bg-muted/25 aspect-square flex items-center justify-center">
        <AvatarImg src={item.previewUrl} alt={item.name} />
      </div>

      <div className="px-2.5 py-2.5 flex flex-col gap-2">
        <p className="text-[12px] font-semibold truncate leading-tight">{item.name}</p>

        {item.owned ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-3 h-3 shrink-0" />
              In collection
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEquip("academic")}
                className="w-full h-7 text-[10px] font-semibold px-2 justify-start truncate"
                title="Equip as academic avatar"
              >
                <Sparkles className="w-3 h-3 mr-1 shrink-0" />
                Academic
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEquip("community")}
                className="w-full h-7 text-[10px] font-semibold px-2 justify-start truncate"
                title="Equip as community avatar"
              >
                <Smile className="w-3 h-3 mr-1 shrink-0" />
                Community
              </Button>
            </div>
          </div>
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

function StyleFamilyGroup({
  styleSlug,
  items,
  onPurchase,
  onEquip,
  isPurchasing,
  balance,
}: {
  styleSlug: string;
  items: ShopItem[];
  onPurchase: (id: string, cost: number) => void;
  onEquip: (style: string, seed: string, profileType: "academic" | "community") => void;
  isPurchasing: string | null;
  balance: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const label = STYLE_LABELS[styleSlug] ?? styleSlug;

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
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover/header:text-foreground transition-colors">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground/50 ml-1">
          {items.length} variant{items.length !== 1 ? "s" : ""}
        </span>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-1">
          {items.map((item) => (
            <AvatarCard
              key={item.id}
              item={item}
              onPurchase={() => onPurchase(item.id, item.cost)}
              onEquip={(profileType) => onEquip(item.style, item.seed, profileType)}
              isPurchasing={isPurchasing === item.id}
              balance={balance}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategorySection({
  catKey,
  items,
  onPurchase,
  onEquip,
  isPurchasing,
  balance,
  compact = false,
}: {
  catKey: string;
  items: ShopItem[];
  onPurchase: (id: string, cost: number) => void;
  onEquip: (style: string, seed: string, profileType: "academic" | "community") => void;
  isPurchasing: string | null;
  balance: number;
  compact?: boolean;
}) {
  const cat = CATEGORIES.find((c) => c.key === catKey);

  const byStyle = useMemo(() => {
    const map = new Map<string, ShopItem[]>();
    items.forEach((it) => {
      if (!map.has(it.style)) map.set(it.style, []);
      map.get(it.style)!.push(it);
    });
    return map;
  }, [items]);

  if (!cat || cat.key === "all") return null;

  const Icon = cat.icon;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border/40">
        <Icon className={cn("w-4 h-4", cat.accent)} />
        <h2 className="text-sm font-bold">{cat.label}</h2>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-semibold px-1.5 h-4 border",
            CATEGORY_BADGE[catKey] ?? "bg-muted text-muted-foreground"
          )}
        >
          {items.length} styles
        </Badge>
      </div>

      <div className="space-y-5">
        {Array.from(byStyle.entries()).map(([slug, styleItems]) => (
          <StyleFamilyGroup
            key={slug}
            styleSlug={slug}
            items={styleItems}
            onPurchase={onPurchase}
            onEquip={onEquip}
            isPurchasing={isPurchasing}
            balance={balance}
          />
        ))}
      </div>
    </section>
  );
}

const WorkingShopClient = ({ initialData }: { initialData: ShopData }) => {
  const [shopData, setShopData] = useState(initialData);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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

      const [style, seed] = itemId.split("--");
      if (!style || !seed) {
        throw new Error("Invalid item ID");
      }
      const result = await purchaseAvatar(style, seed);
      if (result.success) {
        toast.success("Avatar purchased! 🎉");

        setShopData(prev => ({
          ...prev,
          balance: result.remainingBalance,
          items: prev.items.map(item =>
            item.id === itemId
              ? { ...item, owned: true }
              : item
          )
        }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleEquip = async (style: string, seed: string, profileType: "academic" | "community") => {
    try {
      const result = await equipAvatar(profileType, style, seed);
      if (result.success) {
        toast.success(`Avatar equipped for ${profileType} profile! ✨`);

        setShopData(prev => ({
          ...prev,
          items: prev.items.map(item => ({
            ...item,
            equippedAcademic: profileType === "academic" && item.style === style && item.seed === seed,
            equippedCommunity: profileType === "community" && item.style === style && item.seed === seed,
          })),
          equipped: {
            ...prev.equipped,
            [`${profileType}Style`]: style,
            [`${profileType}Seed`]: seed,
          }
        }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Equip failed");
    }
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: shopData.items.length };
    shopData.items.forEach((it) => {
      map[it.category] = (map[it.category] ?? 0) + 1;
    });
    return map;
  }, [shopData.items]);

  const filteredItems = useMemo(() => {
    let list = shopData.items;
    if (activeCategory !== "all") {
      list = list.filter((it) => it.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.style.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          (STYLE_LABELS[it.style] ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [shopData.items, activeCategory, search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ShopItem[]>();
    filteredItems.forEach((it) => {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category)!.push(it);
    });
    return map;
  }, [filteredItems]);

  const ownedCount = shopData.items.filter((i) => i.owned).length;
  const isSearching = search.trim().length > 0;

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-sidebar h-full overflow-hidden">
        <div className="px-3 pt-4 pb-3 border-b border-border/60">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
            Avatar Shop
          </p>
        </div>

        <div className="mx-2 mt-3 mb-1 rounded-lg bg-amber-500/10 border border-amber-500/15 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide leading-none">Balance</span>
            </div>
            {ownedCount > 0 && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">
                {ownedCount} owned
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0" title={`${shopData.balance.balance.toLocaleString()} gecX`}>
            <span className="text-base font-bold tabular-nums text-foreground truncate min-w-0">
              {shopData.balance.balance.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-amber-600/80 shrink-0">gecX</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 pt-1 pb-1.5">
            Categories
          </p>
          {CATEGORIES.map((cat) => {
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
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">

        <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 overflow-hidden">
              <h1 className="text-sm font-bold leading-none truncate">
                {isSearching
                  ? `Search: "${search}"`
                  : (CATEGORIES.find((c) => c.key === activeCategory)?.label ?? "Avatar Shop")}
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {filteredItems.length} variant{filteredItems.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="md:hidden ml-auto flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/15 rounded-lg px-2 py-1 shrink-0">
              <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-bold tabular-nums leading-none">
                {shopData.balance.balance.toLocaleString()} <span className="text-[9px] font-normal text-muted-foreground">gecX</span>
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
            {CATEGORIES.map((cat) => {
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
          <div className="p-4 pb-24">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <Search className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No styles match your search.</p>
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                  Clear filters
                </Button>
              </div>
            ) : isSearching ? (

              <div>
                <p className="text-[11px] text-muted-foreground mb-4">
                  Results across all categories
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {filteredItems.map((item) => (
                    <AvatarCard
                      key={item.id}
                      item={item}
                      onPurchase={() => handlePurchase(item.id, item.cost)}
                      onEquip={(profileType) => handleEquip(item.style, item.seed, profileType)}
                      isPurchasing={isPurchasing === item.id}
                      balance={shopData.balance.balance}
                    />
                  ))}
                </div>
              </div>
            ) : activeCategory === "all" ? (

              <div className="space-y-10">
                {CATEGORIES
                  .filter((c) => c.key !== "all" && byCategory.has(c.key))
                  .map((cat) => (
                    <CategorySection
                      key={cat.key}
                      catKey={cat.key}
                      items={byCategory.get(cat.key)!}
                      onPurchase={handlePurchase}
                      onEquip={handleEquip}
                      isPurchasing={isPurchasing}
                      balance={shopData.balance.balance}
                    />
                  ))}
              </div>
            ) : (

              <CategorySection
                catKey={activeCategory}
                items={filteredItems}
                onPurchase={handlePurchase}
                onEquip={handleEquip}
                isPurchasing={isPurchasing}
                balance={shopData.balance.balance}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkingShopClient;
