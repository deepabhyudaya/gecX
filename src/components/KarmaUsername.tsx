"use client";

import { getKarmaTierColor } from "@/lib/karma-tiers";
import Link from "next/link";

interface KarmaUsernameProps {
  karmaPoints: number;
  username: string;
  href?: string;
  className?: string;
  prefix?: string;
}

export function KarmaUsername({
  karmaPoints,
  username,
  href,
  className = "",
  prefix = ""
}: KarmaUsernameProps) {
  const color = getKarmaTierColor(karmaPoints);
  const style = color ? { color } : undefined;

  const content = (
    <span
      style={style}
      className={`font-medium transition-colors ${className}`}
    >
      {prefix}{username}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export function KarmaUsernameText({
  karmaPoints,
  children,
  className = ""
}: {
  karmaPoints: number;
  children: React.ReactNode;
  className?: string;
}) {
  const color = getKarmaTierColor(karmaPoints);

  return (
    <span
      style={color ? { color } : undefined}
      className={`font-medium ${className}`}
    >
      {children}
    </span>
  );
}
