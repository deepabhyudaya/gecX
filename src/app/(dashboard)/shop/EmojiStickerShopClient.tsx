"use client";

import { useState } from "react";
import { Coins, Loader2, Smile, Sticker, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { purchaseGlobalEmojiPack } from "@/actions/emoji-sticker.actions";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface EmojiStickerShopClientProps {
  initialData: {
    balance: number;
    emojiPacks: { packId: string; items: any[]; allOwned: boolean }[];
    stickerPacks: { packId: string; items: any[]; allOwned: boolean }[];
  };
}

const PACK_PRICES: Record<string, number> = {
  "reactions-pack": 200,
  "campus-pack": 200,
  "wave-stickers": 300,
};

const DEFAULT_PACK_PRICE = 200;

export default function EmojiStickerShopClient({ initialData }: EmojiStickerShopClientProps) {
  const router = useRouter();
  const [balance, setBalance] = useState(initialData.balance);
  const [selectedPack, setSelectedPack] = useState<any | null>(null);
  const [isSticker, setIsSticker] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPack) return;
    const price = PACK_PRICES[selectedPack.packId] || DEFAULT_PACK_PRICE;
    if (balance < price) {
      toast.error(`You need ${price} gecX to purchase this pack.`);
      return;
    }

    setPurchasing(true);
    try {
      await purchaseGlobalEmojiPack(selectedPack.packId, isSticker);
      setBalance((b) => b - price);
      toast.success(`You can now use these ${isSticker ? "stickers" : "emojis"} globally!`);
      setSelectedPack(null);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "An error occurred during purchase.");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="absolute top-4 right-6 bg-muted border border-border rounded-full px-4 py-2 flex items-center gap-2 shadow-sm z-10">
        <Coins className="w-5 h-5 text-yellow-500" />
        <span className="font-bold text-foreground">{balance.toLocaleString()} gecX</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-12 pb-24">

          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Smile className="text-primary" /> Emoji Packs
              </h2>
              <p className="text-muted-foreground">Unlock custom emojis to use anywhere.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialData.emojiPacks.map((pack) => {
                const price = PACK_PRICES[pack.packId] || DEFAULT_PACK_PRICE;
                return (
                  <div key={pack.packId} className="bg-card border border-border rounded-xl p-5 flex flex-col hover:border-primary/50 transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg capitalize">{pack.packId.replace(/-/g, " ")}</h3>
                      {pack.allOwned ? (
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Check size={14} /> Owned
                        </div>
                      ) : (
                        <div className="bg-muted px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 text-muted-foreground border border-border/50">
                          <Coins size={12} className="text-yellow-500" /> {price}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 bg-muted/30 rounded-lg p-3 grid grid-cols-4 gap-2 mb-4 border border-border/20">
                      {pack.items.map((emoji) => (
                        <div key={emoji.id} className="aspect-square bg-background rounded-md flex items-center justify-center p-1 border border-border/10 shadow-sm relative group" title={emoji.name}>
                          <img src={emoji.imageUrl} alt={emoji.name} className="w-full h-full object-contain" />
                          {!emoji.owned && <div className="absolute inset-0 bg-background/50 rounded-md" />}
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={pack.allOwned}
                      onClick={() => {
                        setSelectedPack(pack);
                        setIsSticker(false);
                      }}
                      className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
                        pack.allOwned
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                      }`}
                    >
                      {pack.allOwned ? "Owned" : "Purchase Pack"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sticker className="text-primary" /> Sticker Packs
              </h2>
              <p className="text-muted-foreground">Unlock custom stickers to use anywhere.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialData.stickerPacks.map((pack) => {
                const price = PACK_PRICES[pack.packId] || DEFAULT_PACK_PRICE;
                return (
                  <div key={pack.packId} className="bg-card border border-border rounded-xl p-5 flex flex-col hover:border-primary/50 transition-colors shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg capitalize">{pack.packId.replace(/-/g, " ")}</h3>
                      {pack.allOwned ? (
                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                          <Check size={14} /> Owned
                        </div>
                      ) : (
                        <div className="bg-muted px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 text-muted-foreground border border-border/50">
                          <Coins size={12} className="text-yellow-500" /> {price}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 bg-muted/30 rounded-lg p-3 grid grid-cols-3 gap-2 mb-4 border border-border/20">
                      {pack.items.map((sticker) => (
                        <div key={sticker.id} className="aspect-square bg-background rounded-md flex items-center justify-center p-2 border border-border/10 shadow-sm relative group" title={sticker.name}>
                          <img src={sticker.imageUrl} alt={sticker.name} className="w-full h-full object-contain" />
                          {!sticker.owned && <div className="absolute inset-0 bg-background/50 rounded-md" />}
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={pack.allOwned}
                      onClick={() => {
                        setSelectedPack(pack);
                        setIsSticker(true);
                      }}
                      className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
                        pack.allOwned
                          ? "bg-muted text-muted-foreground cursor-not-allowed"
                          : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                      }`}
                    >
                      {pack.allOwned ? "Owned" : "Purchase Pack"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>

      <Dialog open={!!selectedPack} onOpenChange={(open) => !open && !purchasing && setSelectedPack(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to purchase the{" "}
              <span className="font-bold text-foreground">{selectedPack?.packId.replace(/-/g, " ")}</span> pack?
            </DialogDescription>
          </DialogHeader>

          {selectedPack && (
            <div className="bg-muted rounded-lg p-4 flex items-center justify-between border border-border">
              <span className="font-semibold text-muted-foreground">Price</span>
              <span className="font-bold flex items-center gap-1 text-lg">
                <Coins className="w-5 h-5 text-yellow-500" />
                {PACK_PRICES[selectedPack.packId] || DEFAULT_PACK_PRICE}
              </span>
            </div>
          )}

          <DialogFooter className="mt-6 flex gap-2">
            <button
              onClick={() => setSelectedPack(null)}
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
