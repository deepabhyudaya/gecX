"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, MessageSquare, Users, Settings, Hash, Eye, Bell, Lock, Smile, Crown } from "lucide-react";
import { ROLE_PERMISSIONS } from "@/lib/role-permissions";
import { cn } from "@/lib/utils";

interface RolePermissionsEditorProps {
  role?: {
    id: string;
    name: string;
    permissions: bigint;
    color?: string | null;
  };
  onSubmit?: (permissions: bigint) => void;
  isSubmitting?: boolean;
  value?: bigint;
  onChange?: (permissions: bigint) => void;
  hideActions?: boolean;
}

interface PermissionGroup {
  name: string;
  icon: React.ReactNode;
  permissions: {
    key: string;
    flag: bigint;
    label: string;
    description: string;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: "General",
    icon: <Settings className="w-4 h-4" />,
    permissions: [
      {
        key: "VIEW_CHANNELS",
        flag: ROLE_PERMISSIONS.VIEW_CHANNELS,
        label: "View Channels",
        description: "Allows members to view channels",
      },
      {
        key: "ADMINISTRATOR",
        flag: ROLE_PERMISSIONS.ADMINISTRATOR,
        label: "Administrator",
        description: "Grants all permissions and bypasses channel permissions",
      },
      {
        key: "MANAGE_SERVER",
        flag: ROLE_PERMISSIONS.MANAGE_SERVER,
        label: "Manage Server",
        description: "Allows changing server name, icon, and other settings",
      },
      {
        key: "VIEW_AUDIT_LOG",
        flag: ROLE_PERMISSIONS.VIEW_AUDIT_LOG,
        label: "View Audit Log",
        description: "Allows viewing the server's audit log",
      },
    ],
  },
  {
    name: "Members",
    icon: <Users className="w-4 h-4" />,
    permissions: [
      {
        key: "KICK_MEMBERS",
        flag: ROLE_PERMISSIONS.KICK_MEMBERS,
        label: "Kick Members",
        description: "Allows kicking members from the server",
      },
      {
        key: "BAN_MEMBERS",
        flag: ROLE_PERMISSIONS.BAN_MEMBERS,
        label: "Ban Members",
        description: "Allows banning members from the server",
      },
      {
        key: "MUTE_MEMBERS",
        flag: ROLE_PERMISSIONS.MUTE_MEMBERS,
        label: "Mute Members",
        description: "Allows muting members in text channels",
      },
      {
        key: "MANAGE_ROLES",
        flag: ROLE_PERMISSIONS.MANAGE_ROLES,
        label: "Manage Roles",
        description: "Allows creating, editing, and deleting roles",
      },
    ],
  },
  {
    name: "Channels",
    icon: <Hash className="w-4 h-4" />,
    permissions: [
      {
        key: "MANAGE_CHANNELS",
        flag: ROLE_PERMISSIONS.MANAGE_CHANNELS,
        label: "Manage Channels",
        description: "Allows creating, editing, and deleting channels",
      },
      {
        key: "SEND_MESSAGES",
        flag: ROLE_PERMISSIONS.SEND_MESSAGES,
        label: "Send Messages",
        description: "Allows sending messages in text channels",
      },
      {
        key: "MANAGE_MESSAGES",
        flag: ROLE_PERMISSIONS.MANAGE_MESSAGES,
        label: "Manage Messages",
        description: "Allows deleting and editing other members' messages",
      },
      {
        key: "MENTION_EVERYONE",
        flag: ROLE_PERMISSIONS.MENTION_EVERYONE,
        label: "Mention Everyone",
        description: "Allows mentioning @everyone and @here",
      },
    ],
  },
  {
    name: "Customization",
    icon: <Smile className="w-4 h-4" />,
    permissions: [
      {
        key: "MANAGE_EMOJIS",
        flag: ROLE_PERMISSIONS.MANAGE_EMOJIS,
        label: "Manage Emojis & Stickers",
        description: "Allows adding and removing custom emojis",
      },
      {
        key: "CREATE_REACTION_ROLES",
        flag: ROLE_PERMISSIONS.CREATE_REACTION_ROLES,
        label: "Create Reaction Roles",
        description: "Allows creating reaction role messages",
      },
    ],
  },
];

export default function RolePermissionsEditor({
  role,
  onSubmit,
  isSubmitting,
  value,
  onChange,
  hideActions = false,
}: RolePermissionsEditorProps) {
  const [internalPermissions, setInternalPermissions] = useState<bigint>(role?.permissions ?? 0n);
  const permissions = value !== undefined ? value : internalPermissions;

  const [activeGroup, setActiveGroup] = useState<string>("General");

  const hasPermission = useCallback((flag: bigint): boolean => {
    return (permissions & flag) === flag;
  }, [permissions]);

  const togglePermission = useCallback((flag: bigint) => {
    const newPermissions = (permissions & flag) === flag ? permissions & ~flag : permissions | flag;
    if (value === undefined) {
      setInternalPermissions(newPermissions);
    }
    onChange?.(newPermissions);
  }, [permissions, value, onChange]);

  const handleSubmit = () => {
    onSubmit?.(permissions);
  };

  const isAdminRole = (permissions & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR;

  return (
    <div className="space-y-6">
      {isAdminRole && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <Crown className="w-4 h-4" />
            Administrator Role
          </div>
          <p className="mt-1 text-yellow-600/80">
            This role has the Administrator permission, which grants all permissions
            and bypasses channel-specific permissions.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {PERMISSION_GROUPS.map((group) => (
          <button
            key={group.name}
            onClick={() => setActiveGroup(group.name)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              activeGroup === group.name
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {group.icon}
            {group.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {PERMISSION_GROUPS.filter((g) => g.name === activeGroup).map((group) => (
          <div key={group.name} className="space-y-3">
            <h4 className="font-medium flex items-center gap-2 text-muted-foreground">
              {group.icon}
              {group.name} Permissions
            </h4>

            <div className="space-y-3">
              {group.permissions.map((permission) => (
                <div
                  key={permission.key}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <Label
                      htmlFor={permission.key}
                      className="font-medium cursor-pointer"
                    >
                      {permission.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {permission.description}
                    </p>
                  </div>
                  <Switch
                    id={permission.key}
                    checked={hasPermission(permission.flag)}
                    onCheckedChange={() => togglePermission(permission.flag)}
                    disabled={isAdminRole && permission.key !== "ADMINISTRATOR"}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-muted text-sm">
        <p className="font-medium mb-1">Permission Summary</p>
        <p className="text-muted-foreground">
          {PERMISSION_GROUPS.flatMap((g) => g.permissions).filter((p) =>
            hasPermission(p.flag)
          ).length}{" "}
          of{" "}
          {PERMISSION_GROUPS.flatMap((g) => g.permissions).length} permissions
          enabled
        </p>
      </div>

      {!hideActions && (
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              const resetVal = role?.permissions ?? 0n;
              if (value === undefined) setInternalPermissions(resetVal);
              onChange?.(resetVal);
            }}
          >
            Reset
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Permissions"}
          </Button>
        </div>
      )}
    </div>
  );
}
