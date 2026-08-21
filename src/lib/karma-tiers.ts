export interface KarmaTier {
  name: string;
  threshold: number;
  gradientClass: string;
  colorHex: string;
  textGradient?: string;
}

const tiers: KarmaTier[] = [
  {
    name: "Bronze",
    threshold: 500_000,
    gradientClass: "bg-gradient-to-br from-amber-600/80 via-amber-500/70 to-amber-700/80",
    colorHex: "#CD7F32",
    textGradient: "bg-gradient-to-r from-amber-500 via-orange-600 to-amber-700 bg-clip-text text-transparent",
  },
  {
    name: "Silver",
    threshold: 1_000_000,
    gradientClass: "bg-gradient-to-br from-gray-300/80 via-gray-400/70 to-gray-500/80",
    colorHex: "#C0C0C0",
    textGradient: "bg-gradient-to-r from-gray-300 via-gray-400 to-slate-500 bg-clip-text text-transparent",
  },
  {
    name: "Gold",
    threshold: 5_000_000,
    gradientClass: "bg-gradient-to-br from-yellow-400/80 via-amber-400/70 to-yellow-500/80",
    colorHex: "#FFD700",
    textGradient: "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent",
  },
  {
    name: "Royal Blue",
    threshold: 20_000_000,
    gradientClass: "bg-gradient-to-br from-blue-500/80 via-blue-600/70 to-blue-700/80",
    colorHex: "#4169E1",
    textGradient: "bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent",
  },
  {
    name: "Purple",
    threshold: 50_000_000,
    gradientClass: "bg-gradient-to-br from-purple-500/80 via-purple-600/70 to-purple-700/80",
    colorHex: "#A855F7",
    textGradient: "bg-gradient-to-r from-purple-400 via-purple-500 to-violet-600 bg-clip-text text-transparent",
  },
  {
    name: "Green",
    threshold: 100_000_000,
    gradientClass: "bg-gradient-to-br from-green-500/80 via-emerald-500/70 to-green-600/80",
    colorHex: "#22C55E",
    textGradient: "bg-gradient-to-r from-emerald-400 via-green-500 to-teal-600 bg-clip-text text-transparent",
  },
  {
    name: "Red",
    threshold: 500_000_000,
    gradientClass: "bg-gradient-to-br from-red-500/80 via-red-600/70 to-red-700/80",
    colorHex: "#EF4444",
    textGradient: "bg-gradient-to-r from-rose-400 via-red-500 to-red-700 bg-clip-text text-transparent",
  },
  {
    name: "Cosmic",
    threshold: 1_000_000_000,
    gradientClass: "bg-gradient-to-br from-cyan-300/90 via-fuchsia-400/80 to-purple-600/90",
    colorHex: "#22d3ee",
    textGradient: "bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-purple-500 bg-clip-text text-transparent",
  },
];

export function getKarmaTier(karmaPoints: number): KarmaTier | null {

  const sortedTiers = [...tiers].sort((a, b) => b.threshold - a.threshold);

  for (const tier of sortedTiers) {
    if (karmaPoints >= tier.threshold) {
      return tier;
    }
  }

  return null;
}

export function getKarmaTierGradient(karmaPoints: number): string {
  const tier = getKarmaTier(karmaPoints);
  return tier?.gradientClass || "";
}

export function getKarmaTierColor(karmaPoints: number): string {
  const tier = getKarmaTier(karmaPoints);
  return tier?.colorHex || "";
}

export function getKarmaTierName(karmaPoints: number): string {
  const tier = getKarmaTier(karmaPoints);
  return tier?.name || "";
}

export function hasKarmaTier(karmaPoints: number): boolean {
  return getKarmaTier(karmaPoints) !== null;
}

export function getKarmaTierTextGradientStyle(karmaPoints: number): React.CSSProperties | undefined {
  const tier = getKarmaTier(karmaPoints);
  if (tier && tier.textGradient) {

    const gradients: Record<string, string> = {
      "Bronze": "linear-gradient(90deg, #F59E0B, #EA580C, #B45309)",
      "Silver": "linear-gradient(90deg, #D1D5DB, #9CA3AF, #64748B)",
      "Gold": "linear-gradient(90deg, #FACC15, #F59E0B, #CA8A04)",
      "Royal Blue": "linear-gradient(90deg, #60A5FA, #3B82F6, #4F46E5)",
      "Purple": "linear-gradient(90deg, #C084FC, #A855F7, #7C3AED)",
      "Green": "linear-gradient(90deg, #34D399, #22C55E, #0D9488)",
      "Red": "linear-gradient(90deg, #FB7185, #EF4444, #B91C1C)",
      "Cosmic": "linear-gradient(90deg, #22d3ee, #c084fc, #a855f7)",
    };
    const style: React.CSSProperties = {
      background: gradients[tier.name] || tier.colorHex,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: "transparent",
    };
    if (tier.name === "Cosmic") {
      style.textShadow = "0 0 10px rgba(168,85,247,0.7), 0 0 20px rgba(168,85,247,0.5), 0 0 30px rgba(168,85,247,0.3)";
    }
    return style;
  }
  return undefined;
}
