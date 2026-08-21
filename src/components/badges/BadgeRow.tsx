"use client";

import { useEffect, useState } from 'react';
import BadgeIcon from './BadgeIcon';
import { BadgeTooltip } from './BadgeTooltip';

export default function BadgeRow({ userId, isSelf }: { userId: string, isSelf?: boolean }) {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/badges/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.badges) {

          const sorted = data.badges.sort((a: any, b: any) => b.tier - a.tier);
          setBadges(sorted);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div className="h-[18px] w-[40px] animate-pulse bg-muted/30 rounded" />;

  if (badges.length === 0) {
    if (isSelf) return <div className="bg-black/40 rounded-lg px-2 py-1.5 border border-white/5"><span className="text-[10px] text-white/50 whitespace-nowrap">Earn your first badge!</span></div>;
    return null;
  }

  return (
    <div className="flex flex-row items-center gap-[2px]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {badges.map((badge, idx) => (
        <BadgeTooltip key={badge.category + idx} badge={badge}>
          <div>
            <BadgeIcon badge={badge} size={18} />
          </div>
        </BadgeTooltip>
      ))}
    </div>
  );
}
