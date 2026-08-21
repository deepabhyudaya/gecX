"use client";

import { useState, useEffect } from "react";
import { Coins, Loader2, Smile, Sticker, Plus, Check, ChevronDown, Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { purchaseServerSlotPack, getUserModeratedServers } from "@/actions/emoji-sticker.actions";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ServerInfo {
  id: string;
  name: string;
  iconUrl: string | null;
  role: string;
  emojiCount: number;
  stickerCount: number;
  totalEmojiSlots: number;
  totalStickerSlots: number;
  remainingEmojiSlots: number;
  remainingStickerSlots: number;
}

interface ServerEmojiSlotShopClientProps {
  initialBalance: number;
}

const SLOT_PLANS = {
  STARTER: {
    name: "Starter Pack",
    emojiSlots: 50,
    stickerSlots: 25,
    cost: 3000,
    description: "Perfect for growing servers",
  },
  STANDARD: {
    name: "Standard Pack",
    emojiSlots: 100,
    stickerSlots: 50,
    cost: 5500,
    description: "Best value for active servers",
  },
  PREMIUM: {
    name: "Premium Pack",
    emojiSlots: 200,
    stickerSlots: 100,
    cost: 10000,
    description: "Maximum creative freedom",
  },
};

export default function ServerEmojiSlotShopClient({ initialBalance }: ServerEmojiSlotShopClientProps) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof SLOT_PLANS | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [loadingServers, setLoadingServers] = useState(true);
  const [showServerDropdown, setShowServerDropdown] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      const moderatedServers = await getUserModeratedServers();
      setServers(moderatedServers);
      if (moderatedServers.length > 0) {
        setSelectedServerId(moderatedServers[0].id);
      }
    } catch (error) {
      console.error("Failed to load moderated servers:", error);
      toast.error("Failed to load your servers");
    } finally {
      setLoadingServers(false);
    }
  }

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  const handlePurchase = async () => {
    if (!selectedServerId || !selectedPlan) return;

    const plan = SLOT_PLANS[selectedPlan];
    if (balance < plan.cost) {
      toast.error(`You need ${plan.cost} gecX to purchase this pack.`);
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchaseServerSlotPack(selectedServerId, selectedPlan);
      setBalance((b) => b - plan.cost);

      setServers((prev) =>
        prev.map((s) =>
          s.id === selectedServerId
            ? {
                ...s,
                totalEmojiSlots: s.totalEmojiSlots + result.emojiSlots,
                totalStickerSlots: s.totalStickerSlots + result.stickerSlots,
                remainingEmojiSlots: s.remainingEmojiSlots + result.emojiSlots,
                remainingStickerSlots: s.remainingStickerSlots + result.stickerSlots,
              }
            : s
        )
      );

      toast.success(
        `Successfully purchased ${plan.name} for ${selectedServer?.name}! Added ${result.emojiSlots} emoji slots and ${result.stickerSlots} sticker slots.`
      );
      setSelectedPlan(null);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "An error occurred during purchase.");
    } finally {
      setPurchasing(false);
    }
  };

  if (loadingServers) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Server className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">No Servers Found</h2>
        <p className="text-muted-foreground max-w-md">
          You need to be an admin or moderator of at least one server to purchase emoji and sticker slots.
          Join or create a server first!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-8 pb-24">
          <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Server className="text-primary" /> Server Emoji & Sticker Slots
              </h2>
              <p className="text-muted-foreground">
                Purchase additional emoji and sticker slots for your servers. Base slots: 10 emojis + 5 stickers free per server.
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/15 rounded-lg px-4 py-2 flex items-center gap-2 shrink-0 self-start">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="font-bold tabular-nums">
                {balance.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">gecX</span>
              </span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Select Server to Purchase For
            </label>
            <div className="relative">
              <button
                onClick={() => setShowServerDropdown(!showServerDropdown)}
                className="w-full flex items-center justify-between p-3 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {selectedServer?.iconUrl ? (

                    <img
                      src={selectedServer.iconUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Server className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold">{selectedServer?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedServer?.remainingEmojiSlots} emoji slots • {selectedServer?.remainingStickerSlots} sticker slots remaining
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 transition-transform ${showServerDropdown ? "rotate-180" : ""}`} />
              </button>

              {showServerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                  {servers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => {
                        setSelectedServerId(server.id);
                        setShowServerDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left ${
                        selectedServerId === server.id ? "bg-primary/10" : ""
                      }`}
                    >
                      {server.iconUrl ? (

                        <img src={server.iconUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Server className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{server.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {server.emojiCount}/{server.totalEmojiSlots} emojis • {server.stickerCount}/{server.totalStickerSlots} stickers
                        </p>
                      </div>
                      {selectedServerId === server.id && <Check className="w-4 h-4 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedServer && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smile className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold">Emoji Slots</span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {selectedServer.emojiCount} / {selectedServer.totalEmojiSlots}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((selectedServer.emojiCount / selectedServer.totalEmojiSlots) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedServer.remainingEmojiSlots} slots available (Max: 500)
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sticker className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold">Sticker Slots</span>
                </div>
                <div className="text-2xl font-bold mb-1">
                  {selectedServer.stickerCount} / {selectedServer.totalStickerSlots}
                </div>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((selectedServer.stickerCount / selectedServer.totalStickerSlots) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedServer.remainingStickerSlots} slots available (Max: 200)
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-4">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(SLOT_PLANS) as [keyof typeof SLOT_PLANS, typeof SLOT_PLANS["STARTER"]][]).map(
                ([planType, plan]) => {
                  const canPurchase =
                    selectedServer &&
                    selectedServer.remainingEmojiSlots + plan.emojiSlots <= 500 &&
                    selectedServer.remainingStickerSlots + plan.stickerSlots <= 200 &&
                    balance >= plan.cost;

                  const wouldExceedMax =
                    selectedServer &&
                    (selectedServer.totalEmojiSlots + plan.emojiSlots > 500 ||
                      selectedServer.totalStickerSlots + plan.stickerSlots > 200);

                  return (
                    <div
                      key={planType}
                      className={`bg-card border border-border rounded-xl p-5 flex flex-col transition-all ${
                        canPurchase
                          ? "hover:border-primary/50 cursor-pointer"
                          : wouldExceedMax
                          ? "opacity-60"
                          : "opacity-80"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-lg">{plan.name}</h4>
                        <div className="bg-muted px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 text-muted-foreground border border-border/50">
                          <Coins size={12} className="text-yellow-500" /> {plan.cost.toLocaleString()}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>

                      <div className="flex-1 space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Plus className="w-4 h-4 text-green-500" />
                          <span>
                            <strong>{plan.emojiSlots}</strong> emoji slots
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Plus className="w-4 h-4 text-green-500" />
                          <span>
                            <strong>{plan.stickerSlots}</strong> sticker slots
                          </span>
                        </div>
                      </div>

                      {wouldExceedMax ? (
                        <div className="text-xs text-destructive text-center py-2 bg-destructive/10 rounded-lg">
                          Would exceed maximum limit
                        </div>
                      ) : balance < plan.cost ? (
                        <div className="text-xs text-destructive text-center py-2 bg-destructive/10 rounded-lg">
                          Insufficient gecX
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedPlan(planType)}
                          className="w-full py-2.5 rounded-lg font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
                        >
                          Purchase
                        </button>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={!!selectedPlan}
        onOpenChange={(open) => !open && !purchasing && setSelectedPlan(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to purchase the{" "}
              <span className="font-bold text-foreground">
                {selectedPlan && SLOT_PLANS[selectedPlan].name}
              </span>{" "}
              for <span className="font-bold text-foreground">{selectedServer?.name}</span>?
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between border border-border">
                <span className="text-sm text-muted-foreground">Plan</span>
                <span className="font-semibold">{SLOT_PLANS[selectedPlan].name}</span>
              </div>
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between border border-border">
                <span className="text-sm text-muted-foreground">Emoji Slots Added</span>
                <span className="font-semibold text-green-600">+{SLOT_PLANS[selectedPlan].emojiSlots}</span>
              </div>
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between border border-border">
                <span className="text-sm text-muted-foreground">Sticker Slots Added</span>
                <span className="font-semibold text-green-600">+{SLOT_PLANS[selectedPlan].stickerSlots}</span>
              </div>
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between border border-border">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="font-bold flex items-center gap-1">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  {SLOT_PLANS[selectedPlan].cost.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex gap-2">
            <button
              onClick={() => setSelectedPlan(null)}
              disabled={purchasing}
              className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-medium transition-colors flex items-center gap-2"
            >
              {purchasing && <Loader2 className="w-4 h-4 animate-spin" />}
              {purchasing ? "Purchasing..." : "Confirm Purchase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
