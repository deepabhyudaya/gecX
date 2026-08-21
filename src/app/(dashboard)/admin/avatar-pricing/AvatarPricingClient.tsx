"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { updateAvatarPrice, toggleAvatarItemStatus, resetAvatarPricesToDefaults } from "@/actions/gecx-settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Save, Power } from "lucide-react";

interface ShopItem {
  id: string;
  style: string;
  name: string;
  description?: string;
  cost: number;
  category: string;
  isActive: boolean;
  previewSeed: string;
}

interface AvatarPricingClientProps {
  initialItems: ShopItem[];
}

const AvatarPricingClient = ({ initialItems }: AvatarPricingClientProps) => {
  const [items, setItems] = useState(initialItems);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handlePriceChange = (style: string, newPrice: string) => {
    const price = parseInt(newPrice) || 0;
    setItems(prev =>
      prev.map(item =>
        item.style === style ? { ...item, cost: price } : item
      )
    );
  };

  const handleStatusToggle = async (style: string, isActive: boolean) => {
    setIsSaving(style);
    try {
      await toggleAvatarItemStatus(style, isActive);
      setItems(prev =>
        prev.map(item =>
          item.style === style ? { ...item, isActive } : item
        )
      );
      toast.success(`Avatar ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setIsSaving(null);
    }
  };

  const handleSavePrice = async (style: string, cost: number) => {
    setIsSaving(style);
    try {
      await updateAvatarPrice(style, cost);
      toast.success(`Price updated for ${style}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update price");
    } finally {
      setIsSaving(null);
    }
  };

  const handleResetAll = async () => {
    if (!confirm("Are you sure you want to reset all avatar prices to defaults? This cannot be undone.")) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetAvatarPricesToDefaults();
      if (result.success) {
        setItems(prev =>
          prev.map(item => ({
            ...item,
            cost: result.reset.find((r: any) => r.style === item.style)?.cost || item.cost,
            isActive: true
          }))
        );
        toast.success("All avatar prices reset to defaults!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset prices");
    } finally {
      setIsResetting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "basic": return "bg-green-100 text-green-800 border-green-200";
      case "standard": return "bg-blue-100 text-blue-800 border-blue-200";
      case "premium": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const categories = ["basic", "standard", "premium"];

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Avatar Pricing</h1>
            <p className="text-muted-foreground">Manage avatar shop prices and availability</p>
          </div>
          <Button
            variant="outline"
            onClick={handleResetAll}
            disabled={isResetting}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isResetting ? "Resetting..." : "Reset All to Defaults"}
          </Button>
        </div>

        {categories.map(category => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="capitalize">{category} Avatars</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items
                  .filter(item => item.category === category)
                  .map(item => (
                    <div key={item.style} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                          <img
                            src={`https://api.dicebear.com/7.x/${item.style}/svg?seed=${item.previewSeed}&size=64`}
                            alt={item.name}
                            className="w-12 h-12"
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.style}</p>
                          <Badge className={getCategoryColor(item.category)}>
                            {item.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`price-${item.style}`} className="text-sm">
                            Price (gecX):
                          </Label>
                          <Input
                            id={`price-${item.style}`}
                            type="number"
                            value={item.cost}
                            onChange={(e) => handlePriceChange(item.style, e.target.value)}
                            className="w-24"
                            min="0"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${item.style}`} className="text-sm">
                            Active:
                          </Label>
                          <Switch
                            id={`active-${item.style}`}
                            checked={item.isActive}
                            onCheckedChange={(checked) => handleStatusToggle(item.style, checked)}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSavePrice(item.style, item.cost)}
                            disabled={isSaving === item.style}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            {isSaving === item.style ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AvatarPricingClient;
