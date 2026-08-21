"use client";

import Image from 'next/image';
import { FlameSVG, StarSVG, CrownSVG, CapSVG, ShieldTickSVG, CalendarStarSVG, LightningSVG, SunSVG } from './icons';

const ICON_MAP: Record<string, any> = {
  ATTENDANCE_STREAK: FlameSVG,
  RESULTS_90: StarSVG,
  LEADERBOARD_ALL_TIME: CrownSVG,
  LEADERBOARD_MONTH: CalendarStarSVG,
  LEADERBOARD_WEEK: LightningSVG,
  LEADERBOARD_TODAY: SunSVG,
  COURSES_COMPLETED: CapSVG,
  VERIFIED_ANSWERS: ShieldTickSVG,
};

const COLOR_HEX: Record<string, string> = {
  PINK: '#FF6B9D',
  PURPLE: '#9B59B6',
  GREEN: '#2ECC71',
  BLUE: '#3498DB',
  GOLD: '#F1C40F',
};

const TIER_COLOR_NAMES: Record<number, string> = {
  1: 'PINK',
  2: 'PURPLE',
  3: 'GREEN',
  4: 'BLUE',
  5: 'GOLD',
};

export default function BadgeIcon({ badge, size = 20 }: { badge: any, size?: number }) {

  const colorName = badge.color || TIER_COLOR_NAMES[badge.tier] || 'PINK';
  const hexColor = COLOR_HEX[colorName] || '#9CA3AF';
  const isGold = colorName === 'GOLD';

  const SvgComponent = ICON_MAP[badge.category];
  if (!SvgComponent) return null;

  return (
    <div
      className={`relative flex items-center justify-center ${isGold ? 'animate-gold-pulse' : ''}`}
      style={{ width: size, height: size, color: hexColor }}
    >
      <SvgComponent className="w-full h-full" style={{ color: hexColor }} />
    </div>
  );
}
