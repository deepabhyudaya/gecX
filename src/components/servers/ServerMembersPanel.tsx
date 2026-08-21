"use client";

import { useState } from "react";
import { Crown, Shield, User, MoreVertical, VolumeX, UserX, Crown as CrownIcon, Ban } from "lucide-react";
import {
  updateMemberRole,
  kickServerMember,
  banServerMember,
  toggleMuteServerMember,
  transferServerOwnership,
} from "@/actions/server.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getKarmaTierColor } from "@/lib/karma-tiers";
import { ROLE_PERMISSIONS } from "@/lib/role-permissions";

type ServerRole = "ADMIN" | "MODERATOR" | "MEMBER";

interface CustomRole {
  id: string;
  name: string;
  color?: string | null;
  iconUrl?: string | null;
}

interface MemberRole {
  id: string;
  role: CustomRole;
}

interface Member {
  id: string;
  userId: string;
  role: "ADMIN" | "MODERATOR" | "MEMBER";
  roles?: MemberRole[];
  username: string;
  displayName: string;
  isMuted: boolean;
  joinedAt: Date;
  karmaPoints?: number;
  equippedColor?: string | null;
  equippedNameplate?: string | null;
}

interface ServerMembersPanelProps {
  members: Member[];
  currentUserId: string;
  serverId: string;
  serverOwnerId: string;
  myPermissions?: string;
}

const roleIcons: Record<ServerRole, React.ReactNode> = {
  ADMIN: <Crown className="w-4 h-4 text-yellow-500" />,
  MODERATOR: <Shield className="w-4 h-4 text-blue-500" />,
  MEMBER: <User className="w-4 h-4 text-muted-foreground" />,
};

const roleLabels: Record<ServerRole, string> = {
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  MEMBER: "Member",
};

const roleColors: Record<ServerRole, string> = {
  ADMIN: "text-yellow-500",
  MODERATOR: "text-blue-500",
  MEMBER: "text-muted-foreground",
};

function checkPerm(myPermissions: string | undefined, myRole: string, flag: bigint): boolean {
  if (myRole === "ADMIN") return true;
  if (!myPermissions) return false;
  const perms = BigInt(myPermissions);
  return (perms & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR || (perms & flag) === flag;
}

export default function ServerMembersPanel({
  members,
  currentUserId,
  serverId,
  serverOwnerId,
  myPermissions,
}: ServerMembersPanelProps) {
  const [localMembers, setLocalMembers] = useState<Member[]>(members);

  const myRole = localMembers.find((m) => m.userId === currentUserId)?.role;
  const isAdmin = myRole === "ADMIN";
  const isMod = myRole === "MODERATOR";

  const canManageRoles = checkPerm(myPermissions, myRole || "", ROLE_PERMISSIONS.MANAGE_ROLES);
  const canKick = checkPerm(myPermissions, myRole || "", ROLE_PERMISSIONS.KICK_MEMBERS);
  const canBan = checkPerm(myPermissions, myRole || "", ROLE_PERMISSIONS.BAN_MEMBERS);
  const canMute = checkPerm(myPermissions, myRole || "", ROLE_PERMISSIONS.MUTE_MEMBERS);

  const handleRoleChange = async (memberId: string, newRole: ServerRole) => {
    try {
      await updateMemberRole(serverId, memberId, newRole);
      setLocalMembers((prev) =>
        prev.map((m) => (m.userId === memberId ? { ...m, role: newRole } : m))
      );
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const handleKick = async (memberId: string) => {
    try {
      await kickServerMember(serverId, memberId);
      setLocalMembers((prev) => prev.filter((m) => m.userId !== memberId));
    } catch (error) {
      console.error("Failed to kick member:", error);
    }
  };

  const handleBan = async (memberId: string) => {
    try {
      await banServerMember(serverId, memberId);
      setLocalMembers((prev) => prev.filter((m) => m.userId !== memberId));
    } catch (error) {
      console.error("Failed to ban member:", error);
    }
  };

  const handleMuteToggle = async (memberId: string, isMuted: boolean) => {
    try {
      await toggleMuteServerMember(serverId, memberId);
      setLocalMembers((prev) =>
        prev.map((m) => (m.userId === memberId ? { ...m, isMuted: !isMuted } : m))
      );
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  };

  const handleTransferOwnership = async (memberId: string) => {
    try {
      await transferServerOwnership(serverId, memberId);
      setLocalMembers((prev) =>
        prev.map((m) => {
          if (m.userId === memberId) return { ...m, role: "ADMIN" as ServerRole };
          if (m.userId === currentUserId) return { ...m, role: "MEMBER" as ServerRole };
          return m;
        })
      );
    } catch (error) {
      console.error("Failed to transfer ownership:", error);
    }
  };

  const grouped = localMembers.reduce(
    (acc, member) => {
      acc[member.role].push(member);
      return acc;
    },
    { ADMIN: [] as Member[], MODERATOR: [] as Member[], MEMBER: [] as Member[] }
  );

  const roleOrder: ServerRole[] = ["ADMIN", "MODERATOR", "MEMBER"];

  return (
    <div className="space-y-6 p-4">
      {roleOrder.map((role) => {
        const roleMembers = grouped[role];
        if (roleMembers.length === 0) return null;

        return (
          <div key={role} className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {roleLabels[role]} — {roleMembers.length}
            </h4>

            <div className="space-y-1">
              {roleMembers.map((member) => (
                <div
                  key={member.userId}
                  className={cn(
                    "flex items-center gap-3 px-2 py-2 rounded-md",
                    member.userId === currentUserId && "bg-accent/50"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">
                      {member.displayName.substring(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: member.equippedColor || 'inherit' }}
                    >
                      {member.displayName}
                    </p>
                    <p
                      className="text-xs text-muted-foreground truncate"
                      style={{ color: !member.equippedColor ? (getKarmaTierColor(member.karmaPoints || 0) || undefined) : undefined }}
                    >
                      @{member.username}
                    </p>
                  </div>

                  {member.roles && member.roles.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {member.roles.map((mr) => (
                        <span
                          key={mr.role.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border inline-flex items-center gap-1"
                          style={{
                            backgroundColor: mr.role.color ? `${mr.role.color}20` : undefined,
                            borderColor: mr.role.color || 'currentColor',
                            color: mr.role.color || 'inherit',
                          }}
                        >
                          {mr.role.iconUrl && (
                            <img src={mr.role.iconUrl} alt="" className="w-3 h-3 rounded-sm object-contain" />
                          )}
                          {mr.role.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="shrink-0" title={roleLabels[member.role]}>
                    <span style={{ color: member.equippedColor || undefined }}>
                      {roleIcons[member.role]}
                    </span>
                  </div>

                  {member.isMuted && (
                    <div className="shrink-0" title="Muted">
                      <VolumeX className="w-4 h-4 text-red-500" />
                    </div>
                  )}

                  {member.userId !== currentUserId && (isAdmin || isMod || canManageRoles || canKick || canBan || canMute) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 rounded hover:bg-accent transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {(isAdmin || canManageRoles) && member.role === "MEMBER" && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.userId, "MODERATOR")}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Promote to Moderator
                          </DropdownMenuItem>
                        )}
                        {(isAdmin || canManageRoles) && member.role === "MODERATOR" && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.userId, "MEMBER")}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Demote to Member
                          </DropdownMenuItem>
                        )}

                        {isAdmin && member.role !== "ADMIN" && (
                          <DropdownMenuItem
                            onClick={() => handleTransferOwnership(member.userId)}
                            className="text-yellow-500 focus:text-yellow-500"
                          >
                            <CrownIcon className="w-4 h-4 mr-2" />
                            Transfer Ownership
                          </DropdownMenuItem>
                        )}

                        {(isAdmin || isMod || canMute) && member.role !== "ADMIN" && (
                          <DropdownMenuItem
                            onClick={() => handleMuteToggle(member.userId, member.isMuted)}
                          >
                            <VolumeX className="w-4 h-4 mr-2" />
                            {member.isMuted ? "Unmute" : "Mute"}
                          </DropdownMenuItem>
                        )}

                        {(isAdmin || (isMod && member.role === "MEMBER") || canKick) && (
                          <DropdownMenuItem
                            onClick={() => handleKick(member.userId)}
                            className="text-red-500 focus:text-red-500"
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Kick from Server
                          </DropdownMenuItem>
                        )}

                        {(isAdmin || (isMod && member.role === "MEMBER") || canBan) && (
                          <DropdownMenuItem
                            onClick={() => handleBan(member.userId)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Ban from Server
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
