"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { purchaseAvatar, equipAvatar, randomizeAvatarSeed } from "@/actions/avatar-shop.actions";
import { AvatarCard } from "@/components/shop/AvatarCard";
import { AvatarPreviewModal } from "@/components/shop/AvatarPreviewModal";
import { UserGecXBalance } from "@/components/shop/UserGecXBalance";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

interface ShopData {
  items: Array<{
    id: string;
    style: string;
    name: string;
    description?: string | null;
    cost: number;
    category: string;
    owned: boolean;
    equippedAcademic: boolean;
    equippedCommunity: boolean;
    previewUrl: string;
  }>;
  balance: {
    balance: number;
    totalEarned: number;
    totalSpent: number;
  };
  equipped: {
    academicStyle?: string | null;
    academicSeed?: string | null;
    communityStyle?: string | null;
    communitySeed?: string | null;
  };
}

interface ShopClientProps {
  initialData: ShopData;
}

const ShopClient = ({ initialData }: ShopClientProps) => {
  const [shopData, setShopData] = useState(initialData);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewAvatar, setPreviewAvatar] = useState<ShopData["items"][0] | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const categories = ["all", "basic", "standard", "premium"];

  const filteredItems = shopData.items.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.style.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handlePurchase = async (style: string) => {
    setIsPurchasing(style);
    try {
      const result = await purchaseAvatar(style);
      if (result.success) {
        toast.success(`Purchased avatar! ${result.avatar.cost} gecX deducted.`);

        setShopData(prev => ({
          ...prev,
          balance: result.remainingBalance,
          items: prev.items.map(item =>
            item.style === style
              ? { ...item, owned: true }
              : item
          )
        }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed");
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleEquip = async (profileType: "academic" | "community", style: string) => {
    try {
      const result = await equipAvatar(profileType, style);
      if (result.success) {
        toast.success(`Avatar equipped for ${profileType} profile!`);

        setShopData(prev => ({
          ...prev,
          items: prev.items.map(item => ({
            ...item,
            equippedAcademic: profileType === "academic" && item.style === style,
            equippedCommunity: profileType === "community" && item.style === style,
          })),
          equipped: {
            ...prev.equipped,
            [`${profileType}Style`]: style,
            [`${profileType}Seed`]: prev.items.find(item => item.style === style)?.previewUrl,
          }
        }));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Equip failed");
    }
  };

  const handleRandomize = async (style: string) => {
    try {
      const result = await randomizeAvatarSeed(style);
      if (result.success) {
        toast.success("Avatar randomized!");

        if (previewAvatar?.style === style) {
          setPreviewAvatar(prev => prev ? {
            ...prev,
            previewUrl: `${prev.previewUrl.split('?')[0]}?${Date.now()}`
          } : null);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Randomize failed");
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Avatar Shop</h1>
            <p className="text-muted-foreground">Purchase and customize avatars with gecX tokens</p>
          </div>
          <UserGecXBalance balance={shopData.balance.balance} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search avatars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <AvatarCard
              key={item.style}
              item={item}
              onPreview={() => setPreviewAvatar(item)}
              onPurchase={() => handlePurchase(item.style)}
              onEquipAcademic={() => handleEquip("academic", item.style)}
              onEquipCommunity={() => handleEquip("community", item.style)}
              onRandomize={() => handleRandomize(item.style)}
              isPurchasing={isPurchasing === item.style}
              balance={shopData.balance.balance}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No avatars found matching your criteria.</p>
          </div>
        )}

        {previewAvatar && (
          <AvatarPreviewModal
            avatar={previewAvatar}
            onClose={() => setPreviewAvatar(null)}
            onPurchase={() => handlePurchase(previewAvatar.style)}
            onEquipAcademic={() => handleEquip("academic", previewAvatar.style)}
            onEquipCommunity={() => handleEquip("community", previewAvatar.style)}
            onRandomize={() => handleRandomize(previewAvatar.style)}
            isPurchasing={isPurchasing === previewAvatar.style}
            balance={shopData.balance.balance}
          />
        )}
      </div>
    </div>
  );
};

export default ShopClient;
