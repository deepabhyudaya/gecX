"use client";

import { useState, useMemo } from "react";
import { Crown, Shield, User, MoreVertical, VolumeX, UserX, Crown as CrownIcon, GripVertical } from "lucide-react";
import {
  updateMemberRole,
  kickServerMember,
  toggleMuteServerMember,
  transferServerOwnership,
} from "@/actions/server.actions";
import {
  assignRoleToMember,
  removeRoleFromMember,
} from "@/actions/role.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getKarmaTierColor } from "@/lib/karma-tiers";
import { UserCard } from "@/components/user/UserCard";
import type { UserCardData } from "@/actions/user-card.actions";

type LegacyRole = "ADMIN" | "MODERATOR" | "MEMBER";

interface CustomRole {
  id: string;
  name: string;
  color?: string | null;
  iconUrl?: string | null;
  position: number;
}

interface MemberRole {
  id: string;
  role: CustomRole;
}

interface Member {
  id: string;
  userId: string;
  role: LegacyRole;
  roles: MemberRole[];
  username: string;
  displayName: string;
  isMuted: boolean;
  joinedAt: Date;
  sortOrder: number;
  karmaPoints?: number;
  equippedColor?: string | null;
  equippedNameplate?: string | null;
  userProfile?: UserCardData;
}

interface EnhancedServerMembersPanelProps {
  members: Member[];
  currentUserId: string;
  serverId: string;
  serverOwnerId: string;
  customRoles?: CustomRole[];
  sortOrder?: "hierarchy_desc" | "hierarchy_asc" | "custom";
  showRoleBadges?: boolean;
  allowReordering?: boolean;
}

const legacyRoleIcons: Record<LegacyRole, React.ReactNode> = {
  ADMIN: <Crown className="w-4 h-4 text-yellow-500" />,
  MODERATOR: <Shield className="w-4 h-4 text-blue-500" />,
  MEMBER: <User className="w-4 h-4 text-muted-foreground" />,
};

const legacyRoleLabels: Record<LegacyRole, string> = {
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  MEMBER: "Member",
};

function RoleBadge({ role, colorOverride }: { role: CustomRole; colorOverride?: string | null }) {
  const effectiveColor = colorOverride || role.color || "#808080";

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
      style={{
        color: effectiveColor,
        borderColor: `${effectiveColor}33`,
        backgroundColor: `${effectiveColor}1a`,
      }}
    >
      {role.iconUrl ? (
        <img src={role.iconUrl} alt="" className="w-3 h-3 rounded-sm" />
      ) : null}
      {role.name}
    </span>
  );
}

export default function EnhancedServerMembersPanel({
  members,
  currentUserId,
  serverId,
  serverOwnerId,
  customRoles = [],
  sortOrder = "hierarchy_desc",
  showRoleBadges = true,
  allowReordering = false,
}: EnhancedServerMembersPanelProps) {
  const [localMembers, setLocalMembers] = useState<Member[]>(members);

  const myMember = localMembers.find((m) => m.userId === currentUserId);
  const myRole = myMember?.role;
  const isAdmin = myRole === "ADMIN";
  const isMod = myRole === "MODERATOR";

  const getMemberHighestRole = (member: Member): CustomRole | null => {
    if (member.roles.length === 0) return null;
    return member.roles.reduce((highest, current) =>
      current.role.position > highest.role.position ? current : highest
    ).role;
  };

  const getMemberRoles = (member: Member): CustomRole[] => {
    return member.roles
      .map(r => r.role)
      .sort((a, b) => b.position - a.position);
  };

  const groupedMembers = useMemo(() => {

    const byLegacyRole = localMembers.reduce(
      (acc, member) => {
        acc[member.role].push(member);
        return acc;
      },
      { ADMIN: [] as Member[], MODERATOR: [] as Member[], MEMBER: [] as Member[] }
    );

    const sortMembers = (members: Member[]) => {
      if (sortOrder === "custom" && allowReordering) {
        return [...members].sort((a, b) => a.sortOrder - b.sortOrder);
      }

      return [...members].sort((a, b) => {

        const aHighest = getMemberHighestRole(a);
        const bHighest = getMemberHighestRole(b);

        if (aHighest && bHighest) {
          if (sortOrder === "hierarchy_desc") {
            if (bHighest.position !== aHighest.position) {
              return bHighest.position - aHighest.position;
            }
          } else {
            if (aHighest.position !== bHighest.position) {
              return aHighest.position - bHighest.position;
            }
          }
        } else if (aHighest && !bHighest) {
          return sortOrder === "hierarchy_desc" ? -1 : 1;
        } else if (!aHighest && bHighest) {
          return sortOrder === "hierarchy_desc" ? 1 : -1;
        }

        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });
    };

    return {
      ADMIN: sortMembers(byLegacyRole.ADMIN),
      MODERATOR: sortMembers(byLegacyRole.MODERATOR),
      MEMBER: sortMembers(byLegacyRole.MEMBER),
    };
  }, [localMembers, sortOrder, allowReordering]);

  const handleRoleChange = async (memberId: string, newRole: LegacyRole) => {
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
          if (m.userId === memberId) return { ...m, role: "ADMIN" as LegacyRole };
          if (m.userId === currentUserId) return { ...m, role: "MEMBER" as LegacyRole };
          return m;
        })
      );
    } catch (error) {
      console.error("Failed to transfer ownership:", error);
    }
  };

  const handleAssignCustomRole = async (memberId: string, roleId: string) => {
    try {
      await assignRoleToMember(serverId, memberId, roleId);
      const role = customRoles.find(r => r.id === roleId);
      if (role) {
        setLocalMembers((prev) =>
          prev.map((m) =>
            m.userId === memberId
              ? { ...m, roles: [...m.roles, { id: `${memberId}-${roleId}`, role }] }
              : m
          )
        );
      }
    } catch (error) {
      console.error("Failed to assign role:", error);
    }
  };

  const handleRemoveCustomRole = async (memberId: string, roleId: string) => {
    try {
      await removeRoleFromMember(serverId, memberId, roleId);
      setLocalMembers((prev) =>
        prev.map((m) =>
          m.userId === memberId
            ? { ...m, roles: m.roles.filter(r => r.role.id !== roleId) }
            : m
        )
      );
    } catch (error) {
      console.error("Failed to remove role:", error);
    }
  };

  const legacyRoleOrder: LegacyRole[] = ["ADMIN", "MODERATOR", "MEMBER"];

  return (
    <div className="space-y-6 p-4">
      {legacyRoleOrder.map((legacyRole) => {
        const roleMembers = groupedMembers[legacyRole];
        if (roleMembers.length === 0) return null;

        return (
          <div key={legacyRole} className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {legacyRoleLabels[legacyRole]} — {roleMembers.length}
            </h4>

            <div className="space-y-1">
              {roleMembers.map((member) => (
                <UserCard
                  key={member.userId}
                  user={member.userProfile || {
                    userId: member.userId,
                    userType: "student",
                    username: member.username,
                    displayName: member.displayName,
                    bio: null,
                    avatar: null,
                    customAvatar: null,
                    bannerUrl: null,
                    isPrivate: false,
                    requireFollowApproval: false,
                    showKarma: "everyone",
                    showAcademicProfile: "nobody",
                    karmaPoints: member.karmaPoints || 0,
                    postCount: 0,
                    followerCount: 0,
                    followingCount: 0,
                    isFollowing: false,
                    isOwnProfile: member.userId === currentUserId,
                    hasDMAccess: false,
                    hasPendingDMRequest: false,
                    equippedUsernameColor: member.equippedColor,
                    equippedNameplate: member.equippedNameplate,
                    profileBgColor: null,
                    mutualServers: [],
                    mutualGroups: [],
                  } as UserCardData}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md group",
                      member.userId === currentUserId && "bg-accent/50"
                    )}
                  >
                    {allowReordering && isAdmin && (
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground/50">
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}

                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">
                        {member.displayName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: member.equippedColor || 'inherit' }}
                        >
                          {member.displayName}
                        </p>

                        {showRoleBadges && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {legacyRole !== "MEMBER" && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                                style={member.equippedColor ? {
                                  color: member.equippedColor,
                                  borderColor: `${member.equippedColor}33`,
                                  backgroundColor: `${member.equippedColor}1a`,
                                } : undefined}
                              >
                                {legacyRoleIcons[legacyRole]}
                                {legacyRoleLabels[legacyRole]}
                              </span>
                            )}

                            {getMemberRoles(member).map((role) => (
                              <RoleBadge
                                key={role.id}
                                role={role}
                                colorOverride={member.equippedColor}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <p
                        className="text-xs text-muted-foreground truncate"
                        style={{ color: !member.equippedColor ? (getKarmaTierColor(member.karmaPoints || 0) || undefined) : undefined }}
                      >
                        @{member.username}
                      </p>
                    </div>

                    {member.isMuted && (
                      <div className="shrink-0" title="Muted">
                        <VolumeX className="w-4 h-4 text-red-500" />
                      </div>
                    )}

                    {member.userId !== currentUserId && (isAdmin || isMod) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-accent transition-colors">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {isAdmin && member.role === "MEMBER" && (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.userId, "MODERATOR")}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Promote to Moderator
                            </DropdownMenuItem>
                          )}
                          {isAdmin && member.role === "MODERATOR" && (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.userId, "MEMBER")}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Demote to Member
                            </DropdownMenuItem>
                          )}

                          {isAdmin && customRoles.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Assign Role
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-48">
                                  {customRoles.map((role) => {
                                    const hasRole = member.roles.some(r => r.role.id === role.id);
                                    return (
                                      <DropdownMenuItem
                                        key={role.id}
                                        disabled={hasRole}
                                        onClick={() => handleAssignCustomRole(member.userId, role.id)}
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full mr-2"
                                          style={{ backgroundColor: role.color || "#808080" }}
                                        />
                                        {role.name}
                                        {hasRole && <span className="ml-auto text-xs text-muted-foreground">Assigned</span>}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              {member.roles.length > 0 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Remove Role
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-48">
                                    {member.roles.map((memberRole) => (
                                      <DropdownMenuItem
                                        key={memberRole.id}
                                        onClick={() => handleRemoveCustomRole(member.userId, memberRole.role.id)}
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full mr-2"
                                          style={{ backgroundColor: memberRole.role.color || "#808080" }}
                                        />
                                        {memberRole.role.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                            </>
                          )}

                          <DropdownMenuSeparator />

                          {isAdmin && member.role !== "ADMIN" && (
                            <DropdownMenuItem
                              onClick={() => handleTransferOwnership(member.userId)}
                              className="text-yellow-500 focus:text-yellow-500"
                            >
                              <CrownIcon className="w-4 h-4 mr-2" />
                              Transfer Ownership
                            </DropdownMenuItem>
                          )}

                          {(isAdmin || isMod) && member.role !== "ADMIN" && (
                            <DropdownMenuItem
                              onClick={() => handleMuteToggle(member.userId, member.isMuted)}
                            >
                              <VolumeX className="w-4 h-4 mr-2" />
                              {member.isMuted ? "Unmute" : "Mute"}
                            </DropdownMenuItem>
                          )}

                          {(isAdmin || (isMod && member.role === "MEMBER")) && (
                            <DropdownMenuItem
                              onClick={() => handleKick(member.userId)}
                              className="text-red-500 focus:text-red-500"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Kick from Server
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </UserCard>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
