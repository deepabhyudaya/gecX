"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Check, Eye, Shuffle, User, Users } from "lucide-react";

interface AvatarCardProps {
  item: {
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
  };
  onPreview: () => void;
  onPurchase: () => void;
  onEquipAcademic: () => void;
  onEquipCommunity: () => void;
  onRandomize: () => void;
  isPurchasing: boolean;
  balance: number;
}

const AvatarCard = ({
  item,
  onPreview,
  onPurchase,
  onEquipAcademic,
  onEquipCommunity,
  onRandomize,
  isPurchasing,
  balance,
}: AvatarCardProps) => {
  const canAfford = balance >= item.cost;
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "basic": return "bg-green-100 text-green-800 border-green-200";
      case "standard": return "bg-blue-100 text-blue-800 border-blue-200";
      case "premium": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge className={getCategoryColor(item.category)}>
            {item.category}
          </Badge>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Coins className="w-4 h-4 text-yellow-600" />
            {item.cost}
          </div>
        </div>
        <h3 className="font-semibold text-lg">{item.name}</h3>
        <p className="text-sm text-muted-foreground">{item.style}</p>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <div className="relative">
          <div className="aspect-square rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            <img
              src={item.previewUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="absolute top-2 right-2 flex gap-1">
            {item.equippedAcademic && (
              <Badge variant="secondary" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                Academic
              </Badge>
            )}
            {item.equippedCommunity && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Community
              </Badge>
            )}
            {item.owned && !item.equippedAcademic && !item.equippedCommunity && (
              <Badge variant="outline" className="text-xs">
                <Check className="w-3 h-3 mr-1" />
                Owned
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="w-full"
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </Button>

        {item.owned ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={item.equippedAcademic ? "default" : "outline"}
              size="sm"
              onClick={onEquipAcademic}
              disabled={item.equippedAcademic}
              className="text-xs"
            >
              <User className="w-3 h-3 mr-1" />
              Academic
            </Button>
            <Button
              variant={item.equippedCommunity ? "default" : "outline"}
              size="sm"
              onClick={onEquipCommunity}
              disabled={item.equippedCommunity}
              className="text-xs"
            >
              <Users className="w-3 h-3 mr-1" />
              Community
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={onPurchase}
            disabled={!canAfford || isPurchasing}
            className="w-full"
          >
            <Coins className="w-4 h-4 mr-2" />
            {isPurchasing ? "Purchasing..." : `Buy for ${item.cost} gecX`}
          </Button>
        )}

        {item.owned && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRandomize}
            className="w-full text-xs"
          >
            <Shuffle className="w-3 h-3 mr-1" />
            Randomize Style
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export { AvatarCard };
