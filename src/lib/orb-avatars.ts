

export interface OrbVariant {
  seed: string;
  name: string;
  hue: number;
  sat: number;
  light: number;
  cost: number;
}

type HSL = { h: number; s: number; l: number };

export const ORB_VARIANTS: OrbVariant[] = [
  { seed: "Sol", name: "Orb Sol", hue: 38, sat: 92, light: 60, cost: 75 },
  { seed: "Mercury", name: "Orb Mercury", hue: 210, sat: 18, light: 68, cost: 75 },
  { seed: "Venus", name: "Orb Venus", hue: 40, sat: 62, light: 74, cost: 75 },
  { seed: "Terra", name: "Orb Terra", hue: 145, sat: 62, light: 54, cost: 75 },
  { seed: "Mars", name: "Orb Mars", hue: 15, sat: 86, light: 54, cost: 75 },
  { seed: "Jupiter", name: "Orb Jupiter", hue: 30, sat: 74, light: 60, cost: 75 },
  { seed: "Saturn", name: "Orb Saturn", hue: 43, sat: 70, light: 72, cost: 75 },
  { seed: "Uranus", name: "Orb Uranus", hue: 185, sat: 80, light: 66, cost: 75 },
  { seed: "Neptune", name: "Orb Neptune", hue: 215, sat: 86, light: 46, cost: 75 },
  { seed: "Pluto", name: "Orb Pluto", hue: 340, sat: 52, light: 54, cost: 75 },
  { seed: "Luna", name: "Orb Luna", hue: 220, sat: 14, light: 80, cost: 75 },
  { seed: "Ceres", name: "Orb Ceres", hue: 32, sat: 26, light: 70, cost: 75 },
  { seed: "Eris", name: "Orb Eris", hue: 350, sat: 46, light: 70, cost: 75 },
  { seed: "Makemake", name: "Orb Makemake", hue: 24, sat: 60, light: 56, cost: 75 },
  { seed: "Haumea", name: "Orb Haumea", hue: 200, sat: 36, light: 70, cost: 75 },
  { seed: "Comet", name: "Orb Comet", hue: 200, sat: 90, light: 68, cost: 75 },
  { seed: "Asteroid", name: "Orb Asteroid", hue: 35, sat: 18, light: 60, cost: 75 },
  { seed: "Meteor", name: "Orb Meteor", hue: 24, sat: 80, light: 60, cost: 75 },
  { seed: "Nebula", name: "Orb Nebula", hue: 280, sat: 70, light: 60, cost: 75 },
  { seed: "Galaxy", name: "Orb Galaxy", hue: 260, sat: 80, light: 55, cost: 75 },
  { seed: "Aurora", name: "Orb Aurora", hue: 150, sat: 70, light: 65, cost: 75 },
  { seed: "Eclipse", name: "Orb Eclipse", hue: 24, sat: 90, light: 54, cost: 75 },
  { seed: "Nova", name: "Orb Nova", hue: 0, sat: 86, light: 62, cost: 75 },
  { seed: "Supernova", name: "Orb Supernova", hue: 48, sat: 90, light: 70, cost: 75 },
  { seed: "Pulsar", name: "Orb Pulsar", hue: 180, sat: 86, light: 66, cost: 75 },
  { seed: "Quasar", name: "Orb Quasar", hue: 18, sat: 90, light: 58, cost: 75 },
  { seed: "Blackhole", name: "Orb Blackhole", hue: 260, sat: 30, light: 16, cost: 75 },
  { seed: "Wormhole", name: "Orb Wormhole", hue: 270, sat: 60, light: 46, cost: 75 },
  { seed: "Star", name: "Orb Star", hue: 52, sat: 96, light: 80, cost: 75 },
  { seed: "Constellation", name: "Orb Constellation", hue: 225, sat: 52, light: 55, cost: 75 },
  { seed: "Solstice", name: "Orb Solstice", hue: 35, sat: 86, light: 66, cost: 75 },
  { seed: "Equinox", name: "Orb Equinox", hue: 160, sat: 60, light: 60, cost: 75 },
];

const ORB_MAP = new Map(ORB_VARIANTS.map((v) => [v.seed.toLowerCase(), v]));

export function getOrbConfig(seed: string): OrbVariant {
  const lookup = ORB_MAP.get(seed.toLowerCase());
  if (lookup) return lookup;

  const hue = hashString(seed) % 360;
  const sat = 35 + (hashString(seed + "s") % 55);
  const light = 25 + (hashString(seed + "l") % 50);
  return {
    seed,
    name: `Orb ${seed.slice(0, 12)}`,
    hue,
    sat,
    light,
    cost: 75,
  };
}

export function getOrbName(seed: string): string {
  return getOrbConfig(seed).name;
}

function hashString(str: string): number {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return (h1 ^ h2 ^ h3 ^ h4) >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function modHue(h: number) {
  return ((h % 360) + 360) % 360;
}

function hsl(h: number, s: number, l: number): HSL {
  return { h: modHue(h), s: clamp(s, 0, 100), l: clamp(l, 0, 100) };
}

function hslToHex({ h, s, l }: HSL): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) =>
    l / 100 -
    a *
      Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to255 = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to255(f(0))}${to255(f(8))}${to255(f(4))}`;
}

function adjustL({ h, s, l }: HSL, dL: number): HSL {
  return hsl(h, s, clamp(l + dL, 0, 100));
}

function paletteFor({ hue, sat, light }: OrbVariant): HSL[] {
  const primary = hsl(hue, sat, light);
  const secondary = hsl(
    hue + 18,
    clamp(sat * 0.95, 0, 100),
    clamp(light * 1.12, 10, 92)
  );
  const accent = hsl(
    hue - 25,
    clamp(sat * 0.85, 0, 100),
    clamp(light * 0.9, 5, 85)
  );
  const highlight = hsl(
    hue + 8,
    clamp(sat * 0.4, 0, 70),
    clamp(Math.max(85, light + 40), 75, 97)
  );
  return [primary, secondary, accent, highlight];
}

type Point = { x: number; y: number };

function smoothClosedPath(points: Point[]): string {
  const n = points.length;
  if (n < 3) return "";
  const t = 0.25;
  const get = (i: number) => points[(i + n) % n];

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const cp1x = p1.x + (p2.x - p0.x) * t;
    const cp1y = p1.y + (p2.y - p0.y) * t;
    const cp2x = p2.x - (p3.x - p1.x) * t;
    const cp2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  d += " Z";
  return d;
}

function buildOrbSvg(seed: string, size = 128): string {
  const rand = mulberry32(hashString(seed));
  const config = getOrbConfig(seed);
  const colors = paletteFor(config);

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 1;

  const emphasisAngle = rand() * Math.PI * 2;
  const emphasisDir = {
    x: Math.cos(emphasisAngle),
    y: Math.sin(emphasisAngle),
  };

  const shapeCount = 5 + Math.floor(rand() * 2);
  const defs: string[] = [];
  const paths: string[] = [];

  const uid = `${hashString(seed).toString(36)}`;

  for (let i = 0; i < shapeCount; i++) {
    const isBase = i === 0;
    const isCounter = i === 1;

    const radiusFactor = isBase
      ? 0.55 + rand() * 0.08
      : 0.36 + rand() * 0.22;
    const baseRadius = size * radiusFactor;

    const pointCount = 6 + Math.floor(rand() * 3);
    const lobeCount = 2 + Math.floor(rand() * 3);
    const amplitude = isBase
      ? 0.08 + rand() * 0.1
      : 0.12 + rand() * 0.16;
    const wavePhase = rand() * Math.PI * 2;
    const rotation = rand() * Math.PI * 2;
    const stretchAngle = rand() * Math.PI * 2;
    const stretchFactor = isBase ? 0.9 + rand() * 0.5 : 1.1 + rand() * 0.9;

    let angleOffset = emphasisAngle;
    if (isCounter) {
      angleOffset = emphasisAngle + Math.PI + (rand() - 0.5) * 0.8;
    } else if (!isBase) {
      angleOffset = emphasisAngle + (rand() - 0.5) * 1.4;
    } else {
      angleOffset = emphasisAngle + (rand() - 0.5) * 0.6;
    }
    const distance = baseRadius * (isBase ? 0.12 : 0.25 + rand() * 0.4);
    const centerOffset = {
      x: Math.cos(angleOffset) * distance,
      y: Math.sin(angleOffset) * distance,
    };

    let colorIndex = 0;
    if (isBase) colorIndex = 0;
    else if (i === 1) colorIndex = 1;
    else if (i === 2) colorIndex = 2;
    else if (i === 3) colorIndex = 3;
    else colorIndex = Math.floor(rand() * 3);
    const baseColor = colors[colorIndex];

    const darker = adjustL(baseColor, -16);
    const lighter = adjustL(baseColor, 18);

    const gradientAngle = stretchAngle + (rand() - 0.5) * 0.6;
    const x1 = 0.5 - 0.5 * Math.cos(gradientAngle);
    const y1 = 0.5 - 0.5 * Math.sin(gradientAngle);
    const x2 = 0.5 + 0.5 * Math.cos(gradientAngle);
    const y2 = 0.5 + 0.5 * Math.sin(gradientAngle);
    const gradId = `g-${uid}-${i}`;

    defs.push(
      `<linearGradient id="${gradId}" x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}">` +
        `<stop offset="0%" stop-color="${hslToHex(darker)}" />` +
        `<stop offset="55%" stop-color="${hslToHex(baseColor)}" />` +
        `<stop offset="100%" stop-color="${hslToHex(lighter)}" />` +
        `</linearGradient>`
    );

    const pts: Point[] = [];
    const axis = { x: Math.cos(stretchAngle), y: Math.sin(stretchAngle) };

    for (let j = 0; j < pointCount; j++) {
      const a = (j / pointCount) * Math.PI * 2;
      const wave =
        Math.cos(lobeCount * a + wavePhase) * amplitude + (rand() - 0.5) * 0.04;
      let r = baseRadius * (1 + wave);
      if (r < baseRadius * 0.2) r = baseRadius * 0.2;

      const la = a + rotation;
      let vx = Math.cos(la) * r;
      let vy = Math.sin(la) * r;

      const parallel = vx * axis.x + vy * axis.y;
      const perpX = vx - parallel * axis.x;
      const perpY = vy - parallel * axis.y;
      vx = parallel * stretchFactor * axis.x + perpX;
      vy = parallel * stretchFactor * axis.y + perpY;

      const dist = Math.sqrt(vx * vx + vy * vy);
      if (dist > R) {
        const scale = R / dist;
        vx *= scale;
        vy *= scale;
      }

      pts.push({
        x: cx + centerOffset.x + vx,
        y: cy + centerOffset.y + vy,
      });
    }

    const d = smoothClosedPath(pts);
    const opacity = isBase ? 1 : 0.92 - i * 0.03;
    paths.push(
      `<path d="${d}" fill="url(#${gradId})" opacity="${opacity.toFixed(2)}" />`
    );
  }

  const clipId = `c-${uid}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${config.name}">` +
    `<defs>` +
    `<clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${R}" /></clipPath>` +
    defs.join("") +
    `</defs>` +
    `<g clip-path="url(#${clipId})">` +
    paths.join("") +
    `</g>` +
    `</svg>`;

  return svg;
}

export function getOrbAvatarSvg(seed: string, size?: number): string {
  return buildOrbSvg(seed, size);
}

export function getOrbAvatarUrl(seed: string, size = 128): string {
  const svg = buildOrbSvg(seed, size);
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

export function isOrbStyle(style: string): boolean {
  return style.toLowerCase() === "orb";
}
