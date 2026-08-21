"use client";

import { useState } from "react";
import { Plus, Settings, Trash2, GripVertical, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createServerRole,
  updateServerRole,
  deleteServerRole,
  reorderServerRoles,
} from "@/actions/role.actions";
import { ROLE_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/role-permissions";
import { cn } from "@/lib/utils";
import RoleEditor from "./RoleEditor";
import RolePermissionsEditor from "./RolePermissionsEditor";

interface CustomRole {
  id: string;
  name: string;
  color?: string | null;
  iconUrl?: string | null;
  position: number;
  permissions: bigint;
  hoist: boolean;
  mentionable: boolean;
  memberCount?: number;
}

interface RoleManagerProps {
  serverId: string;
  roles: CustomRole[];
  isAdmin: boolean;
}

export default function RoleManager({ serverId, roles: initialRoles, isAdmin }: RoleManagerProps) {
  const [roles, setRoles] = useState<CustomRole[]>(initialRoles);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<CustomRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedRoles = [...roles].sort((a, b) => b.position - a.position);

  const handleCreateRole = async (data: {
    name: string;
    color?: string;
    iconUrl?: string;
    permissions?: bigint;
    hoist?: boolean;
    mentionable?: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      const newRole = await createServerRole(serverId, data);
      setRoles((prev) => [...prev, { ...newRole, memberCount: 0 }]);
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Failed to create role:", error);
      alert("Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (roleId: string, data: {
    name?: string;
    color?: string;
    iconUrl?: string;
    permissions?: bigint;
    hoist?: boolean;
    mentionable?: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      const updated = await updateServerRole(roleId, data);
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? { ...r, ...updated } : r))
      );
      setEditingRole(null);
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role? This cannot be undone.")) {
      return;
    }
    try {
      await deleteServerRole(roleId);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    } catch (error) {
      console.error("Failed to delete role:", error);
      alert("Failed to delete role");
    }
  };

  const handleReorder = async (roleId: string, newPosition: number) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const otherRoles = roles.filter((r) => r.id !== roleId);
    const updatedRoles = [...otherRoles, { ...role, position: newPosition }];

    const sorted = updatedRoles.sort((a, b) => b.position - a.position);
    const roleOrders = sorted.map((r, index) => ({
      id: r.id,
      position: sorted.length - index,
    }));

    try {
      await reorderServerRoles(serverId, roleOrders);
      setRoles((prev) =>
        prev.map((r) => {
          const order = roleOrders.find((o) => o.id === r.id);
          return order ? { ...r, position: order.position } : r;
        })
      );
    } catch (error) {
      console.error("Failed to reorder roles:", error);
    }
  };

  const moveRole = (roleId: string, direction: "up" | "down") => {
    const roleIndex = sortedRoles.findIndex((r) => r.id === roleId);
    if (roleIndex === -1) return;

    const role = sortedRoles[roleIndex];
    let newPosition: number;

    if (direction === "up" && roleIndex > 0) {

      const aboveRole = sortedRoles[roleIndex - 1];
      newPosition = aboveRole.position + 1;
    } else if (direction === "down" && roleIndex < sortedRoles.length - 1) {

      const belowRole = sortedRoles[roleIndex + 1];
      newPosition = belowRole.position - 1;
    } else {
      return;
    }

    handleReorder(roleId, newPosition);
  };

  if (!isAdmin) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Only server admins can manage roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Server Roles</h3>
          <p className="text-sm text-muted-foreground">
            Manage roles, permissions, and hierarchy
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <RoleEditor
              onSubmit={handleCreateRole}
              isSubmitting={isSubmitting}
              submitLabel="Create Role"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {sortedRoles.map((role, index) => (
          <div
            key={role.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              "bg-card hover:bg-accent/50 transition-colors"
            )}
          >
            <div className="text-muted-foreground/50 cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4" />
            </div>

            <div
              className="w-4 h-4 rounded-full shrink-0"
              style={{ backgroundColor: role.color || "#808080" }}
            />

            {role.iconUrl ? (
              <img
                src={role.iconUrl}
                alt=""
                className="w-5 h-5 rounded shrink-0"
              />
            ) : (
              <Shield className="w-5 h-5 text-muted-foreground shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{role.name}</span>
                {role.hoist && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Hoisted
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{role.memberCount || 0} members</span>
                <span>•</span>
                <span>Position: {role.position}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <button
                onClick={() => moveRole(role.id, "up")}
                disabled={index === 0}
                className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↑
              </button>
              <button
                onClick={() => moveRole(role.id, "down")}
                disabled={index === sortedRoles.length - 1}
                className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ↓
              </button>
            </div>

            <div className="flex items-center gap-1">
              <Dialog
                open={editingPermissions?.id === role.id}
                onOpenChange={(open) =>
                  setEditingPermissions(open ? role : null)
                }
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Permissions</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Role Permissions</DialogTitle>
                  </DialogHeader>
                  <RolePermissionsEditor
                    role={role}
                    onSubmit={(permissions) =>
                      handleUpdateRole(role.id, { permissions })
                    }
                    isSubmitting={isSubmitting}
                  />
                </DialogContent>
              </Dialog>

              <Dialog
                open={editingRole?.id === role.id}
                onOpenChange={(open) => setEditingRole(open ? role : null)}
              >
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Edit Role</DialogTitle>
                  </DialogHeader>
                  <RoleEditor
                    role={role}
                    onSubmit={(data) => handleUpdateRole(role.id, data)}
                    isSubmitting={isSubmitting}
                    submitLabel="Save Changes"
                  />
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleDeleteRole(role.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        {sortedRoles.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No custom roles yet.</p>
            <p className="text-sm">Create roles to organize your server members.</p>
          </div>
        )}
      </div>

      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
        <p className="font-medium mb-1">Role Hierarchy:</p>
        <p>
          Higher position roles have more power. Roles can manage roles below them
          in the hierarchy. Drag or use arrows to reorder.
        </p>
      </div>
    </div>
  );
}
