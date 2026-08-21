"use client";

import { Coins, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface UserGecXBalanceProps {
  balance: number;
  totalEarned?: number;
  totalSpent?: number;
}

const UserGecXBalance = ({
  balance,
  totalEarned = 0,
  totalSpent = 0
}: UserGecXBalanceProps) => {
  return (
    <Card className="min-w-fit">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Coins className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">gecX Balance</p>
              <p className="text-2xl font-bold">{balance.toLocaleString()}</p>
            </div>
          </div>

          {(totalEarned > 0 || totalSpent > 0) && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>+{totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="w-4 h-4" />
                <span>-{totalSpent.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { UserGecXBalance };
