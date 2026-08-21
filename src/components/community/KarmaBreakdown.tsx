"use client";

import { useEffect, useState, useCallback } from "react";
import { Trophy, TrendingUp, Calendar, Clock, RefreshCw } from "lucide-react";

interface KarmaBreakdownData {
  today: number;
  week: number;
  month: number;
  total: number;
}

interface KarmaBreakdownProps {
  userId: string;
  initialData: KarmaBreakdownData;

  cardBgClass?: string;
  cardTextClass?: string;
  mutedClass?: string;
  borderClass?: string;
}

export function KarmaBreakdown({
  userId,
  initialData,
  cardBgClass = "bg-muted/50",
  cardTextClass = "",
  mutedClass = "text-muted-foreground",
  borderClass = "border-border",
}: KarmaBreakdownProps) {
  const [data, setData] = useState<KarmaBreakdownData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/karma/${userId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.breakdown) {
          setData({
            today: result.breakdown.today || 0,
            week: result.breakdown.week || 0,
            month: result.breakdown.month || 0,
            total: result.breakdown.total || 0,
          });
        }
      }
    } catch (error) {
      console.error("Failed to refresh karma:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { refreshData(); }, [refreshData]);

  useEffect(() => {
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "karmaUpdate") refreshData();
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refreshData]);

  const innerCardBg = cardBgClass.includes("white")
    ? "bg-white/80"
    : cardBgClass.includes("black")
    ? "bg-black/40"
    : "bg-background";

  return (
    <div className={`mt-4 p-3 ${cardBgClass} rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" />
          <span className={`text-xs font-medium ${mutedClass}`}>Karma Breakdown</span>
        </div>
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="p-1.5 rounded-md hover:bg-black/10 transition-colors disabled:opacity-50"
          title="Refresh now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${mutedClass} ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { icon: Clock, label: "Today", value: data.today },
          { icon: Calendar, label: "Week", value: data.week },
          { icon: TrendingUp, label: "Month", value: data.month },
          { icon: Trophy, label: "Total", value: data.total, isTotal: true },
        ].map(({ icon: Icon, label, value, isTotal }) => (
          <div
            key={label}
            className={`p-2 ${innerCardBg} rounded-md ${isTotal ? `border ${borderClass} border-yellow-500/20` : ""}`}
          >
            <div className={`flex items-center justify-center gap-1 mb-1 ${isTotal ? "text-yellow-500" : mutedClass}`}>
              <Icon size={10} />
              <span className="text-[10px] uppercase tracking-wider">{label}</span>
            </div>
            <p className={`font-semibold text-sm ${cardTextClass}`}>{value.toLocaleString("en-US")}</p>
          </div>
        ))}
      </div>

      <p className={`text-[10px] ${mutedClass} text-center mt-2`}>
        Auto-updates every 10 seconds
        {isRefreshing && <span className="ml-1 text-primary">• Updating...</span>}
      </p>
    </div>
  );
}
