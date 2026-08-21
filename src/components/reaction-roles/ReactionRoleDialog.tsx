"use client";

import { useState, useEffect } from "react";
import { Hash, Plus, Trash2, AlertCircle, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import EmojiPicker from "@/components/messages/LazyEmojiPicker";
import { useRef } from "react";
import { createReactionRolesBatch } from "@/actions/reaction-role.actions";
import { getServerRoles } from "@/actions/role.actions";
import { getServerEmojis } from "@/actions/emoji-sticker.actions";
import { sendServerMessage } from "@/actions/server.actions";
import EmojiRenderer, { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { Textarea } from "@/components/ui/textarea";

interface ReactionRoleDialogProps {
  serverId: string;
  channelId: string;
  messageId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ReactionRoleEntry {
  id: string;
  emoji: string;
  roleId: string;
  maxUses?: number;
}

interface CustomRole {
  id: string;
  name: string;
  color?: string | null;
  iconUrl?: string | null;
  position: number;
}

export default function ReactionRoleDialog({
  serverId,
  channelId,
  messageId,
  isOpen,
  onClose,
  onSuccess,
}: ReactionRoleDialogProps) {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [entries, setEntries] = useState<ReactionRoleEntry[]>([
    { id: "1", emoji: "", roleId: "", maxUses: undefined },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverEmojisList, setServerEmojisList] = useState<any[]>([]);
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [pickerTab, setPickerTab] = useState<'unicode' | 'custom'>('unicode');
  const [messageContent, setMessageContent] = useState("");
  const [messageEmojiOpen, setMessageEmojiOpen] = useState(false);
  const [messageEmojiTab, setMessageEmojiTab] = useState<'unicode' | 'custom'>('unicode');
  const messageEmojiRef = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, serverId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [serverRoles, emojis] = await Promise.all([
        getServerRoles(serverId),
        getServerEmojis(serverId),
      ]);
      setRoles(serverRoles);
      setServerEmojisList(emojis.emojis || []);
      setEmojiMap(buildEmojiMap(emojis.emojis, []));
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: Date.now().toString(), emoji: "", roleId: "" },
    ]);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, updates: Partial<ReactionRoleEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const validateEntries = (): boolean => {
    if (!messageId && !messageContent.trim()) {
      setError("Please enter a message for the reaction roles.");
      return false;
    }

    if (entries.length === 0) {
      setError("Add at least one reaction role");
      return false;
    }

    for (const entry of entries) {
      if (!entry.emoji.trim()) {
        setError("All entries must have an emoji");
        return false;
      }
      if (!entry.roleId) {
        setError("All entries must have a role selected");
        return false;
      }
    }

    const emojis = entries.map((e) => e.emoji);
    if (new Set(emojis).size !== emojis.length) {
      setError("Each emoji can only be used once");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!validateEntries()) return;

    setIsSubmitting(true);
    try {
      let targetMessageId = messageId;

      if (!targetMessageId) {
        const newMsg = await sendServerMessage(channelId, messageContent.trim());
        targetMessageId = newMsg.id;
      }

      await createReactionRolesBatch(
        serverId,
        channelId,
        targetMessageId!,
        entries.map((e) => ({
          emoji: e.emoji,
          roleId: e.roleId,
          maxUses: e.maxUses,
        }))
      );

      onSuccess?.();
      onClose();
      setEntries([{ id: "1", emoji: "", roleId: "" }]);
      setMessageContent("");
    } catch (err: any) {
      setError(err.message || "Failed to create reaction roles");
    } finally {
      setIsSubmitting(false);
    }
  };

  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setActivePickerId(null);
      }
      if (messageEmojiRef.current && !messageEmojiRef.current.contains(event.target as Node)) {
        setMessageEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smile className="w-5 h-5" />
            Create Reaction Roles
          </DialogTitle>
          <DialogDescription>
            Set up emoji reactions that automatically assign roles to members.
            {!messageId && " Since no message is selected, a new one will be created."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 py-2">
          {!messageId && (
            <div className="space-y-1.5 p-3 rounded-lg border bg-card/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Message Content</Label>
                <div className="relative" ref={messageEmojiRef}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setMessageEmojiOpen((v) => !v)}
                  >
                    <Smile className="w-4 h-4 mr-1" />
                    Emoji
                  </Button>
                  {messageEmojiOpen && (
                    <div className="absolute right-0 top-full mt-1 z-[100] bg-background border rounded-md shadow-xl w-80 p-0 overflow-hidden">
                      <div className="flex border-b border-border">
                        <button
                          type="button"
                          onClick={() => setMessageEmojiTab('unicode')}
                          className={cn(
                            "flex-1 py-2 text-xs font-medium transition-colors",
                            messageEmojiTab === 'unicode' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                          )}
                        >
                          Standard
                        </button>
                        {serverEmojisList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMessageEmojiTab('custom')}
                            className={cn(
                              "flex-1 py-2 text-xs font-medium transition-colors",
                              messageEmojiTab === 'custom' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                            )}
                          >
                            Server ({serverEmojisList.length})
                          </button>
                        )}
                      </div>
                      {messageEmojiTab === 'unicode' && (
                        <EmojiPicker
                          onEmojiClick={(data) => {
                            setMessageContent((prev) => prev + data.emoji);
                            setMessageEmojiOpen(false);
                          }}
                          width="100%"
                          height={300}
                          theme={theme === 'dark' ? "dark" : "light"}
                        />
                      )}
                      {messageEmojiTab === 'custom' && (
                        <div className="p-3 h-[300px] overflow-y-auto">
                          <div className="grid grid-cols-6 gap-1">
                            {serverEmojisList.map((emoji) => (
                              <button
                                key={emoji.id}
                                type="button"
                                onClick={() => {
                                  setMessageContent((prev) => prev + `:${emoji.name}:`);
                                  setMessageEmojiOpen(false);
                                }}
                                className="aspect-square rounded hover:bg-accent p-1 transition-colors flex items-center justify-center"
                                title={emoji.name}
                              >
                                <img
                                  src={emoji.imageUrl}
                                  alt={emoji.name}
                                  className="w-6 h-6 object-contain"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="e.g. React to this message to get your roles!"
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                This message will be posted to the channel with the reaction roles attached.
              </p>
            </div>
          )}

          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={cn(
                "p-3 rounded-lg border bg-card space-y-3",
                entries.length > 1 && "relative"
              )}
            >
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="text-xs font-medium text-muted-foreground">
                Reaction {index + 1}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 relative">
                  <Label className="text-xs">Emoji</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isLoading}
                    onClick={() => setActivePickerId(activePickerId === entry.id ? null : entry.id)}
                  >
                    {entry.emoji ? (
                      <div className="flex items-center gap-2">
                        <EmojiRenderer content={entry.emoji} emojiMap={emojiMap} />
                        <span className="truncate">{entry.emoji}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Smile className="w-4 h-4" /> Select emoji...
                      </span>
                    )}
                  </Button>

                  {activePickerId === entry.id && (
                    <div ref={emojiPickerRef} className="absolute z-[100] left-0 top-full mt-1 bg-background border rounded-md shadow-xl w-80 p-0 overflow-hidden">
                      <div className="flex border-b border-border">
                        <button
                          type="button"
                          onClick={() => setPickerTab('unicode')}
                          className={cn(
                            "flex-1 py-2 text-xs font-medium transition-colors",
                            pickerTab === 'unicode' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                          )}
                        >
                          Standard
                        </button>
                        {serverEmojisList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setPickerTab('custom')}
                            className={cn(
                              "flex-1 py-2 text-xs font-medium transition-colors",
                              pickerTab === 'custom' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                            )}
                          >
                            Server ({serverEmojisList.length})
                          </button>
                        )}
                      </div>

                      {pickerTab === 'unicode' && (
                        <EmojiPicker
                          onEmojiClick={(data) => {
                            updateEntry(entry.id, { emoji: data.emoji });
                            setActivePickerId(null);
                          }}
                          width="100%"
                          height={300}
                          theme={theme === 'dark' ? "dark" : "light"}
                        />
                      )}

                      {pickerTab === 'custom' && (
                        <div className="p-3 h-[300px] overflow-y-auto">
                          <div className="grid grid-cols-6 gap-1">
                            {serverEmojisList.map((emoji) => (
                              <button
                                key={emoji.id}
                                type="button"
                                onClick={() => {
                                  updateEntry(entry.id, { emoji: `:${emoji.name}:` });
                                  setActivePickerId(null);
                                }}
                                className="aspect-square rounded hover:bg-accent p-1 transition-colors flex items-center justify-center"
                                title={emoji.name}
                              >
                                <img
                                  src={emoji.imageUrl}
                                  alt={emoji.name}
                                  className="w-6 h-6 object-contain"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={entry.roleId}
                    onValueChange={(value) =>
                      updateEntry(entry.id, { roleId: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: role.color || "#808080" }}
                            />
                            {role.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Max Uses (Optional)</Label>
                <Input
                  type="number"
                  value={entry.maxUses || ""}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      maxUses: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="Unlimited"
                  min={1}
                />
                <p className="text-[10px] text-muted-foreground">
                  Maximum number of users that can obtain this role via reaction
                </p>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEntry}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Reaction
          </Button>

          {entries.some((e) => e.emoji && e.roleId) && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs font-medium mb-2">Preview:</p>
              <div className="flex flex-wrap gap-2">
                {entries
                  .filter((e) => e.emoji && e.roleId)
                  .map((entry) => {
                    const role = roles.find((r) => r.id === entry.roleId);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-card border text-sm"
                      >
                        <EmojiRenderer content={entry.emoji} emojiMap={emojiMap} />
                        <span
                          className="font-medium"
                          style={{ color: role?.color || "inherit" }}
                        >
                          {role?.name || "Unknown Role"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Users react to get the role, unreact to remove it</p>
            <p>• Use custom server emojis with :emoji_name: format (e.g., :blue_fire:)</p>
            <p>• Changes take effect immediately</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || entries.some((e) => !e.emoji || !e.roleId)}
            >
              {isSubmitting ? "Creating..." : "Create Reaction Roles"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
