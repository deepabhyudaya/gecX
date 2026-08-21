

export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.45;
}

type C = { name: string; colorValue: string; category: string; shade: string; cost: number };

function hue(
  cat: string,
  shades: [string, string, number][]
): C[] {
  return shades.map(([shade, colorValue, cost]) => ({
    name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} · ${shade.charAt(0).toUpperCase() + shade.slice(1)}`,
    colorValue,
    category: cat,
    shade,
    cost,
  }));
}

export const USERNAME_COLORS: C[] = [
  ...hue("red",     [["pastel","#FEE2E2",80],["light","#FCA5A5",100],["soft","#F87171",120],["normal","#EF4444",150],["vivid","#DC2626",150],["dark","#B91C1C",150],["deep","#7F1D1D",180],["neon","#FF0000",300]]),
  ...hue("orange",  [["pastel","#FFEDD5",80],["light","#FDBA74",100],["soft","#FB923C",120],["normal","#F97316",150],["vivid","#EA580C",150],["dark","#C2410C",150],["deep","#7C2D12",180],["neon","#FF6B00",300]]),
  ...hue("amber",   [["pastel","#FEF3C7",80],["light","#FCD34D",100],["soft","#FBBF24",120],["normal","#F59E0B",150],["vivid","#D97706",150],["dark","#B45309",150],["deep","#78350F",180],["neon","#FFB300",300]]),
  ...hue("yellow",  [["pastel","#FEF9C3",80],["light","#FDE047",100],["soft","#FACC15",120],["normal","#EAB308",150],["vivid","#CA8A04",150],["dark","#A16207",150],["deep","#713F12",180],["neon","#FFFF00",300]]),
  ...hue("lime",    [["pastel","#ECFCCB",80],["light","#BEF264",100],["soft","#A3E635",120],["normal","#84CC16",150],["vivid","#65A30D",150],["dark","#4D7C0F",150]]),
  ...hue("green",   [["pastel","#DCFCE7",80],["light","#86EFAC",100],["soft","#4ADE80",120],["normal","#22C55E",150],["vivid","#16A34A",150],["dark","#15803D",150],["deep","#14532D",180],["neon","#39FF14",300]]),
  ...hue("teal",    [["pastel","#CCFBF1",80],["light","#5EEAD4",100],["soft","#2DD4BF",120],["normal","#14B8A6",150],["dark","#0D9488",150],["deep","#134E4A",180]]),
  ...hue("cyan",    [["pastel","#CFFAFE",80],["light","#A5F3FC",100],["soft","#67E8F9",120],["normal","#22D3EE",150],["vivid","#06B6D4",150],["dark","#0891B2",150],["deep","#164E63",180],["neon","#00FFFF",300]]),
  ...hue("sky",     [["pastel","#E0F2FE",80],["light","#7DD3FC",100],["soft","#38BDF8",120],["normal","#0EA5E9",150],["dark","#0369A1",150],["deep","#0C4A6E",180]]),
  ...hue("blue",    [["pastel","#DBEAFE",80],["light","#93C5FD",100],["soft","#60A5FA",120],["normal","#3B82F6",150],["vivid","#2563EB",150],["dark","#1D4ED8",150],["deep","#1E3A8A",180],["neon","#0000FF",300]]),
  ...hue("indigo",  [["pastel","#E0E7FF",80],["light","#A5B4FC",100],["soft","#818CF8",120],["normal","#6366F1",150],["dark","#4338CA",150],["deep","#312E81",180]]),
  ...hue("violet",  [["pastel","#EDE9FE",80],["light","#C4B5FD",100],["soft","#A78BFA",120],["normal","#8B5CF6",150],["dark","#7C3AED",150],["deep","#4C1D95",180]]),
  ...hue("purple",  [["pastel","#F3E8FF",80],["light","#D8B4FE",100],["soft","#C084FC",120],["normal","#A855F7",150],["vivid","#9333EA",150],["dark","#7E22CE",150],["deep","#581C87",180],["neon","#BF00FF",300]]),
  ...hue("pink",    [["pastel","#FCE7F3",80],["light","#FBCFE8",100],["soft","#F9A8D4",120],["normal","#EC4899",150],["vivid","#DB2777",150],["dark","#BE185D",150],["deep","#831843",180],["neon","#FF1493",300]]),
  ...hue("rose",    [["pastel","#FFF1F2",80],["light","#FECDD3",100],["soft","#FDA4AF",120],["normal","#F43F5E",150],["dark","#E11D48",150],["deep","#9F1239",180]]),

  { name:"White",      colorValue:"#FFFFFF", category:"monochrome", shade:"white",  cost:200 },
  { name:"Snow",       colorValue:"#F1F5F9", category:"monochrome", shade:"snow",   cost:100 },
  { name:"Silver",     colorValue:"#CBD5E1", category:"monochrome", shade:"silver", cost:100 },
  { name:"Gray · Light",colorValue:"#94A3B8",category:"monochrome", shade:"light",  cost:100 },
  { name:"Gray · Mid", colorValue:"#64748B", category:"monochrome", shade:"mid",    cost:100 },
  { name:"Gray · Dark",colorValue:"#374151", category:"monochrome", shade:"dark",   cost:100 },
  { name:"Charcoal",   colorValue:"#1E293B", category:"monochrome", shade:"charcoal",cost:150},
  { name:"Black",      colorValue:"#000000", category:"monochrome", shade:"black",  cost:200 },
];

export const PROFILE_BG_COLORS: C[] = [
  ...hue("red",     [["whisper","#FFF5F5",150],["blush","#FEE2E2",180],["rose","#FECACA",200],["poppy","#FCA5A5",220],["ember","#450A0A",280],["garnet","#7F1D1D",280]]),
  ...hue("orange",  [["cream","#FFF7ED",150],["peach","#FFEDD5",180],["apricot","#FED7AA",200],["tangerine","#FDBA74",220],["rust","#431407",280],["mahogany","#7C2D12",280]]),
  ...hue("amber",   [["ivory","#FFFBEB",150],["lemon","#FEF3C7",180],["honey","#FDE68A",200],["gold","#FCD34D",220],["tobacco","#451A03",280],["bronze","#78350F",280]]),
  ...hue("yellow",  [["parchment","#FEFCE8",150],["butter","#FEF9C3",180],["canary","#FEF08A",200],["daffodil","#FDE047",220],["mustard","#713F12",280]]),
  ...hue("lime",    [["mint","#F7FEE7",150],["apple","#ECFCCB",180],["fern","#D9F99D",200],["chartreuse","#BEF264",220],["forest","#1A2E05",280]]),
  ...hue("green",   [["seafoam","#F0FDF4",150],["sage","#DCFCE7",180],["jade","#BBF7D0",200],["emerald","#86EFAC",220],["pine","#052E16",280],["bottle","#14532D",280]]),
  ...hue("teal",    [["aqua","#F0FDFA",150],["spearmint","#CCFBF1",180],["turquoise","#99F6E4",200],["teal","#5EEAD4",220],["deep","#042F2E",280]]),
  ...hue("cyan",    [["ice","#ECFEFF",150],["sky","#CFFAFE",180],["pool","#A5F3FC",200],["lagoon","#67E8F9",220],["abyss","#083344",280],["navy","#164E63",280]]),
  ...hue("sky",     [["mist","#F0F9FF",150],["powder","#E0F2FE",180],["cornflower","#BAE6FD",200],["azure","#7DD3FC",220],["twilight","#0C4A6E",280]]),
  ...hue("blue",    [["alice","#EFF6FF",150],["periwinkle","#DBEAFE",180],["chambray","#BFDBFE",200],["cobalt","#93C5FD",220],["midnight","#172554",280],["navy","#1E3A8A",280]]),
  ...hue("indigo",  [["lavender","#EEF2FF",150],["wisteria","#E0E7FF",180],["lilac","#C7D2FE",200],["iris","#A5B4FC",220],["dusk","#1E1B4B",280]]),
  ...hue("purple",  [["thistle","#FAF5FF",150],["orchid","#F3E8FF",180],["plum","#E9D5FF",200],["violet","#D8B4FE",220],["eggplant","#3B0764",280],["grape","#581C87",280]]),
  ...hue("pink",    [["blush","#FDF2F8",150],["rose","#FCE7F3",180],["flamingo","#FBCFE8",200],["candy","#F9A8D4",220],["berry","#500724",280],["wine","#831843",280]]),
  ...hue("rose",    [["petal","#FFF1F2",150],["blush","#FFE4E6",180],["ballet","#FECDD3",200],["carnation","#FDA4AF",220],["merlot","#4C0519",280]]),

  { name:"Bg · Fog",     colorValue:"#FAFAFA", category:"monochrome", shade:"fog",    cost:150 },
  { name:"Bg · Ash",     colorValue:"#F4F4F5", category:"monochrome", shade:"ash",    cost:150 },
  { name:"Bg · Cloud",   colorValue:"#E4E4E7", category:"monochrome", shade:"cloud",  cost:180 },
  { name:"Bg · Slate",   colorValue:"#27272A", category:"monochrome", shade:"slate",  cost:200 },
  { name:"Bg · Zinc",    colorValue:"#18181B", category:"monochrome", shade:"zinc",   cost:220 },
  { name:"Bg · Obsidian",colorValue:"#09090B", category:"monochrome", shade:"obsidian",cost:250},
  { name:"Bg · Void",    colorValue:"#000000", category:"monochrome", shade:"void",   cost:280 },
  { name:"Bg · Storm",   colorValue:"#0F172A", category:"monochrome", shade:"storm",  cost:250 },
  { name:"Bg · Espresso",colorValue:"#1C1917", category:"monochrome", shade:"espresso",cost:220},
  { name:"Bg · Graphite",colorValue:"#111827", category:"monochrome", shade:"graphite",cost:200},
];

function generateAppThemes(): C[] {
  const themes: C[] = [];

  const baseVariants = [
    { type: "Dark", bg: "240 10% 4%", fg: "0 0% 98%", card: "240 10% 6%", border: "240 10% 12%", muted: "240 10% 12%", mutedFg: "240 5% 65%" },
    { type: "Light", bg: "0 0% 100%", fg: "240 10% 4%", card: "0 0% 98%", border: "240 6% 90%", muted: "240 6% 94%", mutedFg: "240 4% 46%" },
    { type: "Midnight", bg: "220 30% 10%", fg: "0 0% 98%", card: "220 30% 13%", border: "220 30% 18%", muted: "220 30% 18%", mutedFg: "220 15% 70%" },
    { type: "Amoled", bg: "0 0% 0%", fg: "0 0% 100%", card: "0 0% 4%", border: "0 0% 12%", muted: "0 0% 12%", mutedFg: "0 0% 60%" },
    { type: "Sepia", bg: "40 50% 95%", fg: "40 50% 20%", card: "40 50% 92%", border: "40 30% 85%", muted: "40 30% 88%", mutedFg: "40 30% 50%" },
    { type: "Discord", bg: "220 13% 18%", fg: "0 0% 100%", card: "220 13% 22%", border: "220 13% 28%", muted: "220 13% 28%", mutedFg: "220 10% 70%" },
    { type: "Dim", bg: "210 20% 15%", fg: "0 0% 98%", card: "210 20% 18%", border: "210 20% 25%", muted: "210 20% 25%", mutedFg: "210 15% 75%" },
    { type: "Forest", bg: "140 30% 8%", fg: "140 10% 95%", card: "140 30% 12%", border: "140 30% 20%", muted: "140 30% 20%", mutedFg: "140 15% 70%" },
    { type: "Coffee", bg: "30 30% 10%", fg: "30 20% 95%", card: "30 30% 15%", border: "30 30% 22%", muted: "30 30% 22%", mutedFg: "30 15% 70%" },
    { type: "Plum", bg: "280 30% 12%", fg: "280 20% 95%", card: "280 30% 16%", border: "280 30% 24%", muted: "280 30% 24%", mutedFg: "280 15% 70%" },
  ];

  const accents = [
    { name: "Crimson", primary: "348 83% 47%", cat: "red" },
    { name: "Red", primary: "0 84% 60%", cat: "red" },
    { name: "Orange", primary: "24 95% 53%", cat: "orange" },
    { name: "Amber", primary: "38 92% 50%", cat: "amber" },
    { name: "Yellow", primary: "45 93% 47%", cat: "yellow" },
    { name: "Lime", primary: "84 81% 44%", cat: "lime" },
    { name: "Emerald", primary: "142 71% 45%", cat: "green" },
    { name: "Green", primary: "142 76% 36%", cat: "green" },
    { name: "Teal", primary: "173 80% 40%", cat: "teal" },
    { name: "Cyan", primary: "189 94% 43%", cat: "cyan" },
    { name: "Sky", primary: "199 89% 48%", cat: "sky" },
    { name: "Azure", primary: "200 98% 39%", cat: "blue" },
    { name: "Blue", primary: "221 83% 53%", cat: "blue" },
    { name: "Indigo", primary: "239 84% 67%", cat: "indigo" },
    { name: "Violet", primary: "262 83% 58%", cat: "violet" },
    { name: "Purple", primary: "271 91% 65%", cat: "purple" },
    { name: "Fuchsia", primary: "292 84% 61%", cat: "pink" },
    { name: "Pink", primary: "330 81% 60%", cat: "pink" },
    { name: "Rose", primary: "346 87% 60%", cat: "rose" },
    { name: "Slate", primary: "215 16% 47%", cat: "monochrome" },
  ];

  for (const base of baseVariants) {
    for (const accent of accents) {
      const isLight = base.type === "Light" || base.type === "Sepia";
      const vars = {
        "--background": base.bg,
        "--foreground": base.fg,
        "--card": base.card,
        "--card-foreground": base.fg,
        "--popover": base.card,
        "--popover-foreground": base.fg,
        "--primary": accent.primary,
        "--primary-foreground": isLight ? "0 0% 98%" : "0 0% 100%",
        "--secondary": base.muted,
        "--secondary-foreground": base.fg,
        "--muted": base.muted,
        "--muted-foreground": base.mutedFg,
        "--accent": base.muted,
        "--accent-foreground": base.fg,
        "--destructive": "0 84.2% 60.2%",
        "--destructive-foreground": "0 0% 98%",
        "--border": base.border,
        "--input": base.border,
        "--ring": accent.primary,
        "--sidebar-background": base.card,
        "--sidebar-foreground": base.fg,
        "--sidebar-primary": accent.primary,
        "--sidebar-primary-foreground": isLight ? "0 0% 98%" : "0 0% 100%",
        "--sidebar-accent": base.muted,
        "--sidebar-accent-foreground": base.fg,
        "--sidebar-border": base.border,
        "--sidebar-ring": accent.primary,
      };

      let cost = 1000;
      if (base.type === "Amoled" || base.type === "Midnight" || base.type === "Discord") cost = 1500;
      if (base.type === "Forest" || base.type === "Coffee" || base.type === "Plum") cost = 2000;

      themes.push({
        name: `${base.type} · ${accent.name}`,
        colorValue: JSON.stringify(vars),
        category: accent.cat,
        shade: base.type.toLowerCase(),
        cost,
      });
    }
  }

  const gradients = [
    { name: "Sunset Horizon", css: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)", cat: "orange" },
    { name: "Ocean Blue", css: "linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)", cat: "cyan" },
    { name: "Purple Dream", css: "linear-gradient(135deg, #9D50BB 0%, #6E48AA 100%)", cat: "purple" },
    { name: "Neon Glow", css: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)", cat: "blue" },
    { name: "Forest Canopy", css: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", cat: "green" },
    { name: "Cherry Blossom", css: "linear-gradient(135deg, #FBD3E9 0%, #BB377D 100%)", cat: "pink" },
    { name: "Dark Nebula", css: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)", cat: "monochrome" },
    { name: "Lava Flow", css: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)", cat: "red" },
    { name: "Cyber Neon", css: "linear-gradient(135deg, #FF0099 0%, #493240 100%)", cat: "pink" },
    { name: "Gold Dust", css: "linear-gradient(135deg, #BF953F 0%, #FCF6BA 100%)", cat: "amber" },
    { name: "Northern Lights", css: "linear-gradient(135deg, #00E1D9 0%, #6E00FF 100%)", cat: "cyan" },
    { name: "Abyss", css: "linear-gradient(135deg, #000000 0%, #434343 100%)", cat: "monochrome" },
  ];

  for (const grad of gradients) {

    const vars = {
      "--background": "0 0% 0% / 0.1",
      "--foreground": "0 0% 100%",
      "--card": "0 0% 0% / 0.25",
      "--card-foreground": "0 0% 100%",
      "--popover": "0 0% 0% / 0.45",
      "--popover-foreground": "0 0% 100%",
      "--primary": "0 0% 100%",
      "--primary-foreground": "0 0% 0%",
      "--secondary": "0 0% 0% / 0.35",
      "--secondary-foreground": "0 0% 100%",
      "--muted": "0 0% 0% / 0.4",
      "--muted-foreground": "0 0% 100% / 0.7",
      "--accent": "0 0% 0% / 0.5",
      "--accent-foreground": "0 0% 100%",
      "--destructive": "0 84.2% 60.2%",
      "--destructive-foreground": "0 0% 98%",
      "--border": "0 0% 100% / 0.15",
      "--input": "0 0% 100% / 0.2",
      "--ring": "0 0% 100%",
      "--sidebar-background": "0 0% 0% / 0.3",
      "--sidebar-foreground": "0 0% 100%",
      "--sidebar-primary": "0 0% 100%",
      "--sidebar-primary-foreground": "0 0% 0%",
      "--sidebar-accent": "0 0% 100% / 0.2",
      "--sidebar-accent-foreground": "0 0% 100%",
      "--sidebar-border": "0 0% 100% / 0.15",
      "--sidebar-ring": "0 0% 100%",
      "backgroundImage": grad.css,
    };
    themes.push({
      name: `Gradient · ${grad.name}`,
      colorValue: JSON.stringify(vars),
      category: grad.cat,
      shade: "gradient",
      cost: 5000,
    });
  }

  return themes;
}

export const APP_THEMES: C[] = generateAppThemes();

export const CUSTOM_MEDIA_ITEMS: C[] = [
  {
    name: "Custom Avatar",
    colorValue: "",
    category: "special",
    shade: "feature",
    cost: 5000,
  },
  {
    name: "Profile Banner",
    colorValue: "",
    category: "special",
    shade: "feature",
    cost: 8000,
  },
];

export const NAMEPLATES: C[] = [

  ...hue("red", [
    ["solid", "#DC2626", 200],
    ["banner · light", "linear-gradient(90deg, rgba(239,68,68,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #DC2626 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #991B1B 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #7F1D1D 0%, transparent 100%)", 600],
    ["banner · neon", "linear-gradient(90deg, #FF0000 0%, transparent 100%)", 800],
  ]),
  ...hue("rose", [
    ["solid", "#E11D48", 200],
    ["banner · light", "linear-gradient(90deg, rgba(244,63,94,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #E11D48 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #BE123C 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #881337 0%, transparent 100%)", 600],
  ]),

  ...hue("orange", [
    ["solid", "#EA580C", 200],
    ["banner · light", "linear-gradient(90deg, rgba(249,115,22,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #EA580C 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #C2410C 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #7C2D12 0%, transparent 100%)", 600],
  ]),
  ...hue("amber", [
    ["solid", "#D97706", 200],
    ["banner · light", "linear-gradient(90deg, rgba(245,158,11,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #D97706 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #B45309 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #78350F 0%, transparent 100%)", 600],
  ]),

  ...hue("yellow", [
    ["solid", "#CA8A04", 200],
    ["banner · light", "linear-gradient(90deg, rgba(234,179,8,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #CA8A04 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #A16207 0%, transparent 100%)", 500],
  ]),
  ...hue("lime", [
    ["solid", "#65A30D", 200],
    ["banner · light", "linear-gradient(90deg, rgba(132,204,22,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #65A30D 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #4D7C0F 0%, transparent 100%)", 500],
  ]),

  ...hue("green", [
    ["solid", "#16A34A", 200],
    ["banner · light", "linear-gradient(90deg, rgba(34,197,94,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #16A34A 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #15803D 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #14532D 0%, transparent 100%)", 600],
    ["banner · neon", "linear-gradient(90deg, #39FF14 0%, transparent 100%)", 800],
  ]),

  ...hue("teal", [
    ["solid", "#0D9488", 200],
    ["banner · light", "linear-gradient(90deg, rgba(20,184,166,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #0D9488 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #0F766E 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #115E59 0%, transparent 100%)", 600],
  ]),
  ...hue("cyan", [
    ["solid", "#0891B2", 200],
    ["banner · light", "linear-gradient(90deg, rgba(6,182,212,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #0891B2 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #0E7490 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #164E63 0%, transparent 100%)", 600],
    ["banner · neon", "linear-gradient(90deg, #00FFFF 0%, transparent 100%)", 800],
  ]),
  ...hue("sky", [
    ["solid", "#0284C7", 200],
    ["banner · light", "linear-gradient(90deg, rgba(14,165,233,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #0284C7 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #0369A1 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #075985 0%, transparent 100%)", 600],
  ]),

  ...hue("blue", [
    ["solid", "#2563EB", 200],
    ["banner · light", "linear-gradient(90deg, rgba(59,130,246,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #2563EB 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #1D4ED8 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #1E3A8A 0%, transparent 100%)", 600],
    ["banner · neon", "linear-gradient(90deg, #0000FF 0%, transparent 100%)", 800],
  ]),
  ...hue("indigo", [
    ["solid", "#4F46E5", 200],
    ["banner · light", "linear-gradient(90deg, rgba(99,102,241,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #4F46E5 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #4338CA 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #312E81 0%, transparent 100%)", 600],
  ]),

  ...hue("purple", [
    ["solid", "#9333EA", 200],
    ["banner · light", "linear-gradient(90deg, rgba(168,85,247,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #9333EA 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #7E22CE 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #581C87 0%, transparent 100%)", 600],
    ["banner · neon", "linear-gradient(90deg, #BF00FF 0%, transparent 100%)", 800],
  ]),

  ...hue("pink", [
    ["solid", "#DB2777", 200],
    ["banner · light", "linear-gradient(90deg, rgba(236,72,153,0.8) 0%, transparent 100%)", 300],
    ["banner · normal", "linear-gradient(90deg, #DB2777 0%, transparent 100%)", 400],
    ["banner · dark", "linear-gradient(90deg, #BE185D 0%, transparent 100%)", 500],
    ["banner · deep", "linear-gradient(90deg, #831843 0%, transparent 100%)", 600],
    ["banner · neon", "linear-gradient(90deg, #FF1493 0%, transparent 100%)", 800],
  ]),

  ...hue("monochrome", [
    ["solid · gray", "#475569", 200],
    ["solid · pitch", "#000000", 200],
    ["banner · silver", "linear-gradient(90deg, #94A3B8 0%, transparent 100%)", 300],
    ["banner · gray", "linear-gradient(90deg, #475569 0%, transparent 100%)", 400],
    ["banner · slate", "linear-gradient(90deg, #334155 0%, transparent 100%)", 500],
    ["banner · charcoal", "linear-gradient(90deg, #0F172A 0%, transparent 100%)", 600],
    ["banner · pitch", "linear-gradient(90deg, #000000 0%, transparent 100%)", 700],
    ["banner · snow", "linear-gradient(90deg, #FFFFFF 0%, transparent 100%)", 700],
  ]),

  { name: "Gradient · Fire", colorValue: "linear-gradient(90deg, #f12711 0%, rgba(245,175,25,0.1) 100%)", category: "orange", shade: "gradient", cost: 1000 },
  { name: "Gradient · Ice", colorValue: "linear-gradient(90deg, #00c6ff 0%, rgba(0,114,255,0.1) 100%)", category: "cyan", shade: "gradient", cost: 1000 },
  { name: "Gradient · Nature", colorValue: "linear-gradient(90deg, #11998e 0%, rgba(56,239,125,0.1) 100%)", category: "green", shade: "gradient", cost: 1000 },
  { name: "Gradient · Royal", colorValue: "linear-gradient(90deg, #141E30 0%, rgba(36,59,85,0.1) 100%)", category: "blue", shade: "gradient", cost: 1000 },
  { name: "Gradient · Cosmic", colorValue: "linear-gradient(90deg, #ff00cc 0%, rgba(51,51,153,0.1) 100%)", category: "purple", shade: "gradient", cost: 1000 },
  { name: "Gradient · Sunset", colorValue: "linear-gradient(90deg, #ff7e5f 0%, rgba(254,180,123,0.1) 100%)", category: "orange", shade: "gradient", cost: 1000 },
  { name: "Gradient · Neon", colorValue: "linear-gradient(90deg, #00F2FE 0%, rgba(79,172,254,0.1) 100%)", category: "cyan", shade: "gradient", cost: 1000 },
  { name: "Gradient · Cherry", colorValue: "linear-gradient(90deg, #FBD3E9 0%, rgba(187,55,125,0.1) 100%)", category: "pink", shade: "gradient", cost: 1000 },
  { name: "Gradient · Magma", colorValue: "linear-gradient(90deg, #FF416C 0%, rgba(255,75,43,0.1) 100%)", category: "red", shade: "gradient", cost: 1000 },
  { name: "Gradient · Forest", colorValue: "linear-gradient(90deg, #5A3F37 0%, rgba(44,119,68,0.1) 100%)", category: "green", shade: "gradient", cost: 1000 },
  { name: "Gradient · Ocean", colorValue: "linear-gradient(90deg, #2E3192 0%, rgba(27,255,255,0.1) 100%)", category: "cyan", shade: "gradient", cost: 1000 },
  { name: "Gradient · Violet", colorValue: "linear-gradient(90deg, #4776E6 0%, rgba(142,84,233,0.1) 100%)", category: "purple", shade: "gradient", cost: 1000 },
  { name: "Gradient · Amethyst", colorValue: "linear-gradient(90deg, #9D50BB 0%, rgba(110,72,170,0.1) 100%)", category: "purple", shade: "gradient", cost: 1000 },
  { name: "Gradient · Cyberpunk", colorValue: "linear-gradient(90deg, #212121 0%, rgba(41,255,198,0.1) 100%)", category: "monochrome", shade: "gradient", cost: 1200 },
  { name: "Gradient · Gold", colorValue: "linear-gradient(90deg, #BF953F 0%, rgba(252,246,186,0.1) 100%)", category: "amber", shade: "gradient", cost: 1500 },
  { name: "Gradient · Platinum", colorValue: "linear-gradient(90deg, #E5E5BE 0%, rgba(0,57,115,0.1) 100%)", category: "monochrome", shade: "gradient", cost: 1500 },
  { name: "Gradient · Holographic", colorValue: "linear-gradient(90deg, #FF0000 0%, #FF7F00 15%, #FFFF00 30%, #00FF00 50%, #0000FF 65%, #4B0082 85%, rgba(148,0,211,0.1) 100%)", category: "monochrome", shade: "rainbow", cost: 2500 },
  { name: "Gradient · Synthwave", colorValue: "linear-gradient(90deg, #ff0099 0%, rgba(73,50,64,0.1) 100%)", category: "pink", shade: "gradient", cost: 1500 },
  { name: "Gradient · Blood Moon", colorValue: "linear-gradient(90deg, #870000 0%, rgba(25,10,5,0.1) 100%)", category: "red", shade: "gradient", cost: 1500 },
  { name: "Gradient · Northern Lights", colorValue: "linear-gradient(90deg, #00E1D9 0%, rgba(110,0,255,0.1) 100%)", category: "cyan", shade: "gradient", cost: 1500 },
];
