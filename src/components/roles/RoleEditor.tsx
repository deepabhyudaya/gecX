"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import RolePermissionsEditor from "./RolePermissionsEditor";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/role-permissions";

interface RoleEditorProps {
  role?: {
    id?: string;
    name: string;
    color?: string | null;
    iconUrl?: string | null;
    hoist?: boolean;
    mentionable?: boolean;
  };
  onSubmit: (data: {
    name: string;
    color?: string;
    iconUrl?: string;
    permissions?: bigint;
    hoist?: boolean;
    mentionable?: boolean;
  }) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#6B7280",
  "#FFD700",
];

export default function RoleEditor({
  role,
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
}: RoleEditorProps) {
  const [name, setName] = useState(role?.name || "");
  const [color, setColor] = useState(role?.color || "#6B7280");
  const [iconUrl, setIconUrl] = useState(role?.iconUrl || "");
  const [hoist, setHoist] = useState(role?.hoist ?? false);
  const [mentionable, setMentionable] = useState(role?.mentionable ?? true);
  const [permissions, setPermissions] = useState<bigint>(role?.permissions ?? DEFAULT_ROLE_PERMISSIONS.MEMBER);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      color: color || undefined,
      iconUrl: iconUrl.trim() || undefined,
      permissions,
      hoist,
      mentionable,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="roleName">Role Name</Label>
        <Input
          id="roleName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., VIP, Streamer, Event Host"
          required
          maxLength={32}
        />
      </div>

      <div className="space-y-2">
        <Label>Role Color</Label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-10 h-10 rounded-lg border-2 border-border shadow-sm transition-transform hover:scale-105"
            style={{ backgroundColor: color || "#6B7280" }}
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#6B7280"
            className="font-mono uppercase"
            maxLength={7}
          />
        </div>

        {showColorPicker && (
          <div className="p-3 rounded-lg border bg-card">
            <div className="grid grid-cols-9 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    "w-6 h-6 rounded-full transition-transform hover:scale-110",
                    color === c && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="roleIcon">Role Icon URL (Optional)</Label>
        <Input
          id="roleIcon"
          value={iconUrl}
          onChange={(e) => setIconUrl(e.target.value)}
          placeholder="https://example.com/icon.png"
          type="url"
        />
        <p className="text-xs text-muted-foreground">
          32x32px recommended. Will be displayed next to role badges.
        </p>
        {iconUrl && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Preview:</span>
            <img
              src={iconUrl}
              alt="Role icon preview"
              className="w-5 h-5 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="hoist">Display Separately</Label>
            <p className="text-xs text-muted-foreground">
              Show members with this role in their own section
            </p>
          </div>
          <Switch
            id="hoist"
            checked={hoist}
            onCheckedChange={setHoist}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="mentionable">Mentionable</Label>
            <p className="text-xs text-muted-foreground">
              Allow anyone to @mention this role
            </p>
          </div>
          <Switch
            id="mentionable"
            checked={mentionable}
            onCheckedChange={setMentionable}
          />
        </div>
      </div>

      <div className="space-y-2 border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPermissions(!showPermissions)}
          className="flex items-center justify-between w-full p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex flex-col items-start text-left">
            <span className="font-medium text-sm">Role Permissions</span>
            <span className="text-xs text-muted-foreground">Configure what this role can do</span>
          </div>
          {showPermissions ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showPermissions && (
          <div className="p-4 border-t bg-card">
            <RolePermissionsEditor
              value={permissions}
              onChange={setPermissions}
              hideActions={true}
            />
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg border bg-muted/50">
        <p className="text-xs text-muted-foreground mb-2">Preview:</p>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border"
            style={{
              color: color || "#808080",
              borderColor: `${color || "#808080"}33`,
              backgroundColor: `${color || "#808080"}1a`,
            }}
          >
            {iconUrl && (
              <img src={iconUrl} alt="" className="w-3 h-3 rounded-sm" />
            )}
            {name || "Role Name"}
          </span>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !name.trim()}
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
