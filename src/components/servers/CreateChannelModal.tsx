"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createChannel } from "@/actions/server.actions";
import { getServerRoles } from "@/actions/role.actions";
import { getServerCategories } from "@/actions/server.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Hash, Lock, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
}

export default function CreateChannelModal({
  open,
  onOpenChange,
  serverId,
}: CreateChannelModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const channel = await createChannel(serverId, name.trim(), {
        isPrivate,
        allowedRoleIds: isPrivate ? selectedRoleIds : undefined,
        categoryId: selectedCategoryId || undefined,
      });
      onOpenChange(false);
      setName("");
      setIsPrivate(false);
      setSelectedRoleIds([]);
      setSelectedCategoryId(null);
      router.push(`/servers?serverId=${serverId}&channelId=${channel.id}`);
    } catch (error) {
      console.error("Failed to create channel:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoadingRoles(true);
    setLoadingCategories(true);
    try {
      const [serverRoles, serverCategories] = await Promise.all([
        getServerRoles(serverId),
        getServerCategories(serverId),
      ]);
      setRoles(serverRoles);
      setCategories(serverCategories);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoadingRoles(false);
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, serverId]);

  const handleClose = () => {
    onOpenChange(false);
    setName("");
    setIsPrivate(false);
    setSelectedRoleIds([]);
    setSelectedCategoryId(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Channel</DialogTitle>
          <DialogDescription>
            Add a new text channel to your server.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Channel Name</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                placeholder="new-channel"
                className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Channel names must be lowercase and use hyphens instead of spaces.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Category (Optional)</Label>
            {loadingCategories ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedCategoryId || "none"} onValueChange={(value) => setSelectedCategoryId(value === "none" ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-3 p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPrivate ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
                <Label htmlFor="private-channel" className="text-sm font-medium cursor-pointer">
                  Private Channel
                </Label>
              </div>
              <Switch
                id="private-channel"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isPrivate
                ? "Only selected roles can view and access this channel."
                : "Everyone in the server can view this channel."}
            </p>

            {isPrivate && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium">Select roles that can access this channel:</p>
                {loadingRoles ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : roles.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No custom roles found. Create roles in Server Settings first.</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {roles.map((role) => (
                      <label
                        key={role.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRoleIds.includes(role.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoleIds((prev) => [...prev, role.id]);
                            } else {
                              setSelectedRoleIds((prev) => prev.filter((id) => id !== role.id));
                            }
                          }}
                          className="rounded border-border"
                        />
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color || "#808080" }}
                        />
                        <span className="text-sm">{role.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {isPrivate && selectedRoleIds.length === 0 && roles.length > 0 && (
                  <p className="text-xs text-yellow-600">
                    ⚠️ No roles selected. Only admins will be able to see this channel.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
