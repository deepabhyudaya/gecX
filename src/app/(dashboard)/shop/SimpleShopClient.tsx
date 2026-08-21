"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { purchaseAvatar, equipAvatar } from "@/actions/avatar-shop.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const SimpleShopClient = ({ initialData }: any) => {
  const [shopData, setShopData] = useState(initialData);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  const handlePurchase = async (style: string, cost: number) => {
    setIsPurchasing(style);
    try {
      const result = await purchaseAvatar(style);
      if (result.success) {
        toast.success(`Purchased avatar! ${result.avatar.cost} gecX deducted.`);
        setShopData(prev => ({
          ...prev,
          balance: result.remainingBalance,
          items: prev.items.map((item: any) =>
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
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Equip failed");
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Avatar Shop</h1>
            <p className="text-muted-foreground">Purchase avatars with gecX tokens</p>
          </div>
          <div className="text-lg font-semibold">
            Balance: {shopData.balance.balance} gecX
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shopData.items.map((item: any) => (
            <Card key={item.style}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.style}</p>
                <p className="text-lg font-bold">{item.cost} gecX</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-24 h-24"
                    />
                  </div>

                  {item.owned ? (
                    <div className="space-y-2">
                      <div className="text-sm text-green-600">✓ Owned</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEquip("academic", item.style)}
                          variant={item.equippedAcademic ? "default" : "outline"}
                        >
                          Academic
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEquip("community", item.style)}
                          variant={item.equippedCommunity ? "default" : "outline"}
                        >
                          Community
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(item.style, item.cost)}
                      disabled={shopData.balance.balance < item.cost || isPurchasing === item.style}
                      className="w-full"
                    >
                      {isPurchasing === item.style ? "Purchasing..." : `Buy for ${item.cost} gecX`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleShopClient;
