"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { CustomAvatar } from "@/components/CustomAvatar";

interface UserButtonProps {
  communityAvatar: string;
  academicAvatar: string;
}

const AVATAR_SOURCE_KEY = "gecx-navbar-avatar-source";

export function UserButton({ communityAvatar, academicAvatar }: UserButtonProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [avatarSource, setAvatarSource] = useState<"community" | "academic">("community");

  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? window.localStorage.getItem(AVATAR_SOURCE_KEY)
      : null;
    if (saved === "community" || saved === "academic") {
      setAvatarSource(saved);
    }
  }, []);

  const username = user?.username || user?.firstName || "User";
  const displayedAvatar = avatarSource === "academic" ? academicAvatar : communityAvatar;

  const handleSourceChange = (value: string) => {
    const source = value as "community" | "academic";
    setAvatarSource(source);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AVATAR_SOURCE_KEY, source);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-1 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="User menu"
        >
          <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 overflow-hidden rounded-full bg-muted">
            <CustomAvatar
              src={displayedAvatar}
              alt={username}
              className="h-full w-full object-cover"
              fallbackSrc="/noAvatar.png"
            />
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-background border-border"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Show avatar as
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={avatarSource} onValueChange={handleSourceChange}>
          <DropdownMenuRadioItem value="community" className="cursor-pointer">
            <CustomAvatar
              src={communityAvatar}
              alt="Community"
              className="h-5 w-5 rounded-full object-cover"
            />
            <span className="ml-2">Community profile</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="academic" className="cursor-pointer">
            <CustomAvatar
              src={academicAvatar}
              alt="Academic"
              className="h-5 w-5 rounded-full object-cover"
            />
            <span className="ml-2">Academic profile</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/profile")}
          onMouseEnter={() => router.prefetch("/profile")}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          onMouseEnter={() => router.prefetch("/settings")}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
