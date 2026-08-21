export interface StreakTierDef {
  name: string;
  threshold: number;
  color: string | null;
  label: string;
  emoji: string;
}

export const STREAK_TIERS: StreakTierDef[] = [
  { name: "none", threshold: 0, color: null, label: "Default", emoji: "" },
  { name: "bronze", threshold: 3, color: "#CD7F32", label: "Bronze", emoji: "🔥" },
  { name: "silver", threshold: 7, color: "#C0C0C0", label: "Silver", emoji: "🔥🔥" },
  { name: "gold", threshold: 14, color: "#FFD700", label: "Gold", emoji: "🔥🔥🔥" },
  { name: "emerald", threshold: 30, color: "#22C55E", label: "Emerald", emoji: "✨" },
  { name: "ruby", threshold: 60, color: "#EF4444", label: "Ruby", emoji: "💎" },
  { name: "royal", threshold: 100, color: "#4169E1", label: "Royal", emoji: "👑" },
  { name: "mystic", threshold: 180, color: "#A855F7", label: "Mystic", emoji: "🔮" },
  { name: "cosmic", threshold: 365, color: "cosmic", label: "Cosmic", emoji: "🌌" },
];

export type StreakTier = (typeof STREAK_TIERS)[number]["name"];

export function getStreakTier(streak: number): StreakTier {
  let matched: StreakTier = "none";
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.threshold) matched = tier.name;
    else break;
  }
  return matched;
}

export function getStreakTierDef(streak: number): StreakTierDef {
  const tierName = getStreakTier(streak);
  return STREAK_TIERS.find((t) => t.name === tierName) || STREAK_TIERS[0];
}

export function getStreakBorderClass(streak: number, size: "sm" | "md" | "lg" = "md"): string {
  const tier = getStreakTierDef(streak);
  const width = size === "sm" ? "2px" : size === "md" ? "3px" : "4px";
  if (!tier.color || tier.color === "cosmic") return "";
  return `border-[${width}]`;
}

export function getStreakBorderStyle(
  streak: number,
  _karmaPoints: number = 0,
  size: "sm" | "md" | "lg" = "md"
): React.CSSProperties {
  const tier = getStreakTierDef(streak);
  const width = size === "sm" ? "2px" : size === "md" ? "3px" : "4px";

  if (!tier.color) {
    return {};
  }

  if (tier.color === "cosmic") {
    return {
      border: `${width} solid transparent`,
      background: `linear-gradient(var(--tw-gradient-stops)) padding-box, linear-gradient(135deg, #22d3ee, #a855f7) border-box`,
      borderRadius: "50%",
      boxShadow: `0 0 8px rgba(168,85,247,0.5), 0 0 16px rgba(168,85,247,0.3)`,
    };
  }

  return {
    border: `${width} solid ${tier.color}`,
    borderRadius: "50%",
  };
}

export function getStreakRingStyle(
  streak: number,
  _karmaPoints: number = 0,
  size: "sm" | "md" | "lg" = "md"
): React.CSSProperties {
  const tier = getStreakTierDef(streak);
  const width = size === "sm" ? 2 : size === "md" ? 3 : 4;

  if (!tier.color) {
    return {};
  }

  if (tier.color === "cosmic") {
    return {
      background: `conic-gradient(from 0deg, #22d3ee, #a855f7, #22d3ee)`,
      borderRadius: "50%",
      padding: `${width}px`,
      boxShadow: `0 0 8px rgba(168,85,247,0.5), 0 0 16px rgba(168,85,247,0.3)`,
    };
  }

  return {
    background: tier.color,
    borderRadius: "50%",
    padding: `${width}px`,
  };
}

export function getStreakTooltipText(streak: number): string {
  const tier = getStreakTierDef(streak);
  if (tier.name === "none") return "";
  return `${streak} day ${tier.label} streak`;
}
