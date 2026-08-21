
import Image from "next/image";
import Link from "next/link";
import { getKarmaTierColor, getKarmaTierTextGradientStyle } from "@/lib/karma-tiers";
import { UserCardTrigger } from "@/components/user";
import { StreakBorderAvatar } from "@/components/StreakBorderAvatar";

interface ChatRoleBadge {
  name: string;
  color?: string | null;
  iconUrl?: string | null;
}

interface ChatMessageHeaderProps {
  username: string;
  userId?: string;
  displayName?: string | null;
  avatar?: string | null;
  customAvatar?: string | null;

  equippedColor?: string | null;

  equippedNameplate?: string | null;

  karmaPoints?: number;

  streak?: number;

  roleBadge?: string | null;

  customRoleBadges?: ChatRoleBadge[];

  timestamp?: string;

  profileHref?: string;

  children?: React.ReactNode;
}

export function ChatMessageHeader({
  username,
  userId,
  displayName,
  avatar,
  customAvatar,
  equippedColor,
  equippedNameplate,
  karmaPoints = 0,
  streak = 0,
  roleBadge,
  customRoleBadges = [],
  timestamp,
  profileHref,
  children,
}: ChatMessageHeaderProps) {
  const href = profileHref ?? `/${username}`;

  const AvatarWrapper = userId
    ? ({ children }: { children: React.ReactNode }) => <UserCardTrigger userId={userId}>{children}</UserCardTrigger>
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  const UsernameWrapper = userId
    ? ({ children }: { children: React.ReactNode }) => <UserCardTrigger userId={userId}>{children}</UserCardTrigger>
    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

  const nameColorStyle = equippedColor
    ? { color: equippedColor }
    : getKarmaTierTextGradientStyle(karmaPoints) ||
      (getKarmaTierColor(karmaPoints) ? { color: getKarmaTierColor(karmaPoints)! } : undefined);

  return (
    <div className="flex gap-4 w-full">
      <AvatarWrapper>
        <StreakBorderAvatar
          src={customAvatar || avatar}
          alt={username}
          streak={streak}
          karmaPoints={karmaPoints}
          size="md"
          useRawImg={!!customAvatar}
          fallback={username.substring(0, 2).toUpperCase()}
        />
      </AvatarWrapper>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-baseline gap-2 flex-wrap">
          <div
            className="inline-flex items-center gap-2 rounded px-1 max-w-full -ml-1"
            style={
              equippedNameplate
                ? { background: equippedNameplate, textShadow: "0 1px 2px rgba(0,0,0,0.4)", padding: "2px 6px" }
                : undefined
            }
          >
            <UsernameWrapper>
              <span
                className="text-[15px] font-semibold hover:underline truncate max-w-[200px] cursor-pointer"
                style={nameColorStyle}
              >
                {displayName || username}
              </span>
            </UsernameWrapper>
            {roleBadge && roleBadge !== "MEMBER" && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 dark:bg-muted/80 text-foreground/80 dark:text-muted-foreground font-bold uppercase tracking-wider shrink-0">
                {roleBadge}
              </span>
            )}
            {customRoleBadges.map((badge) => (
              <span
                key={badge.name}
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider shrink-0 border"
                style={badge.color ? {
                  color: badge.color,
                  borderColor: `${badge.color}40`,
                  backgroundColor: `${badge.color}15`,
                } : undefined}
              >
                {badge.iconUrl && (
                  <img src={badge.iconUrl} alt="" className="w-3 h-3 rounded-sm object-contain" />
                )}
                {badge.name}
              </span>
            ))}
          </div>
          {timestamp && (
            <span className="text-xs text-muted-foreground font-medium ml-1">{timestamp}</span>
          )}
        </div>

        {children && (
          <div className="text-[15px] text-foreground leading-relaxed mt-0.5">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

