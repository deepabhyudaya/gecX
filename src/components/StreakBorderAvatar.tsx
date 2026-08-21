"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getStreakTierDef, getStreakRingStyle, getStreakTooltipText } from "@/lib/streaks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreakBorderAvatarProps {
  src: string | null | undefined;
  alt: string;
  streak?: number;
  karmaPoints?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;

  useRawImg?: boolean;

  onClick?: () => void;

  showTooltip?: boolean;

  fallback?: string;
}

const sizeMap = {
  xs: { container: "w-6 h-6", img: "w-6 h-6", ring: 1.5 },
  sm: { container: "w-8 h-8", img: "w-8 h-8", ring: 2 },
  md: { container: "w-10 h-10", img: "w-10 h-10", ring: 2.5 },
  lg: { container: "w-20 h-20", img: "w-20 h-20", ring: 3.5 },
  xl: { container: "w-28 h-28", img: "w-28 h-28", ring: 4.5 },
};

export function StreakBorderAvatar({
  src,
  alt,
  streak = 0,
  karmaPoints = 0,
  size = "md",
  className,
  useRawImg = false,
  onClick,
  showTooltip = true,
  fallback,
}: StreakBorderAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const tierDef = getStreakTierDef(streak);
  const hasStreak = tierDef.name !== "none";
  const dim = sizeMap[size];

  const ringStyle: React.CSSProperties = getStreakRingStyle(streak, karmaPoints, size as "sm" | "md" | "lg");

  const showFallback = imgError || !src;

  const avatarContent = (
    <div
      className={cn(
        "relative rounded-full shrink-0",
        hasStreak && "",
        onClick && "cursor-pointer",
        className
      )}
      style={hasStreak ? ringStyle : undefined}
      onClick={onClick}
    >
      <div
        className={cn(
          "rounded-full overflow-hidden bg-muted",
          dim.container
        )}
      >
        {showFallback ? (
          <span className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
            {(fallback || alt || "?")[0]?.toUpperCase()}
          </span>
        ) : useRawImg ? (
          <img
            src={src}
            alt={alt}
            className={cn("object-cover rounded-full", dim.img)}
            onError={() => setImgError(true)}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={size === "xl" ? 112 : size === "lg" ? 80 : size === "md" ? 40 : size === "sm" ? 32 : 24}
            height={size === "xl" ? 112 : size === "lg" ? 80 : size === "md" ? 40 : size === "sm" ? 32 : 24}
            className="object-cover rounded-full w-full h-full"
            onError={() => setImgError(true)}
          />
        )}
      </div>
    </div>
  );

  if (!hasStreak || !showTooltip) {
    return avatarContent;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {avatarContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{getStreakTooltipText(streak)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
