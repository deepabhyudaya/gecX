"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Coins, User, Users, Shuffle, X } from "lucide-react";

interface AvatarPreviewModalProps {
  avatar: {
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
  onClose: () => void;
  onPurchase: () => void;
  onEquipAcademic: () => void;
  onEquipCommunity: () => void;
  onRandomize: () => void;
  isPurchasing: boolean;
  balance: number;
}

const AvatarPreviewModal = ({
  avatar,
  onClose,
  onPurchase,
  onEquipAcademic,
  onEquipCommunity,
  onRandomize,
  isPurchasing,
  balance,
}: AvatarPreviewModalProps) => {
  const canAfford = balance >= avatar.cost;
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "basic": return "bg-green-100 text-green-800 border-green-200";
      case "standard": return "bg-blue-100 text-blue-800 border-blue-200";
      case "premium": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-lg">{avatar.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{avatar.style}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted">
              <img
                src={avatar.previewUrl}
                alt={avatar.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Badge className={getCategoryColor(avatar.category)}>
                {avatar.category}
              </Badge>
              <div className="flex items-center gap-1 text-lg font-semibold">
                <Coins className="w-5 h-5 text-yellow-600" />
                {avatar.cost}
              </div>
            </div>

            {avatar.description && (
              <p className="text-sm text-muted-foreground">
                {avatar.description}
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              {avatar.equippedAcademic && (
                <Badge variant="secondary">
                  <User className="w-3 h-3 mr-1" />
                  Academic
                </Badge>
              )}
              {avatar.equippedCommunity && (
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  Community
                </Badge>
              )}
              {avatar.owned && !avatar.equippedAcademic && !avatar.equippedCommunity && (
                <Badge variant="outline">Owned</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {avatar.owned ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={avatar.equippedAcademic ? "default" : "outline"}
                  onClick={onEquipAcademic}
                  disabled={avatar.equippedAcademic}
                >
                  <User className="w-4 h-4 mr-2" />
                  {avatar.equippedAcademic ? "Academic Active" : "Equip Academic"}
                </Button>
                <Button
                  variant={avatar.equippedCommunity ? "default" : "outline"}
                  onClick={onEquipCommunity}
                  disabled={avatar.equippedCommunity}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {avatar.equippedCommunity ? "Community Active" : "Equip Community"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={onPurchase}
                disabled={!canAfford || isPurchasing}
                className="w-full"
              >
                <Coins className="w-4 h-4 mr-2" />
                {isPurchasing
                  ? "Purchasing..."
                  : canAfford
                    ? `Purchase for ${avatar.cost} gecX`
                    : `Insufficient gecX (need ${avatar.cost})`
                }
              </Button>
            )}

            {avatar.owned && (
              <Button
                variant="outline"
                onClick={onRandomize}
                className="w-full"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Randomize Style
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { AvatarPreviewModal };
