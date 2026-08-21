"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Hash, SmilePlus, Users, Info, MoreVertical, Trash2, Crown, Shield, User, ArrowLeft, Smile } from "lucide-react";
import EmojiPicker from "@/components/messages/LazyEmojiPicker";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAbly, type ChatEvent } from "@/hooks/useAbly";
import Link from "next/link";
import {
  sendServerMessage,
  sendServerPoll,
  sendServerCommandMessage,
  toggleServerMessageReaction,
  deleteServerMessage,
  markServerAsRead,
  bumpServer,
  getServerBumpCooldown,
  getServerMessages,
} from "@/actions/server.actions";
import {
  handleReactionAdd,
  handleReactionRemove,
} from "@/actions/reaction-role.actions";
import { ROLE_PERMISSIONS } from "@/lib/role-permissions";
import PollMessage from "@/components/messages/PollMessage";
import RichMessageInput from "@/components/messages/RichMessageInput";
import MarkdownMessage from "@/components/messages/MarkdownMessage";
import EmojiReaction from "@/components/messages/EmojiReaction";
import { buildEmojiMap } from "@/components/messages/EmojiRenderer";
import { getAllEmojisForRendering } from "@/actions/emoji-sticker.actions";
import { ChatMessageHeader } from "@/components/messages/ChatMessageHeader";
import ServerMembersPanel from "./ServerMembersPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { defaultIcons } from "@/components/messages/SlashCommandMenu";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { getKarmaTierColor } from "@/lib/karma-tiers";
import ReactionRoleDialog from "@/components/reaction-roles/ReactionRoleDialog";

const AVAILABLE_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface ServerChatViewProps {
  server: {
    id: string;
    name: string;
    description?: string | null;
    createdById: string;
    myRole: string;
    myPermissions?: string;
    isMuted: boolean;
    members: Array<{
      id: string;
      userId: string;
      role: "ADMIN" | "MODERATOR" | "MEMBER";
      username: string;
      displayName: string;
      isMuted: boolean;
      joinedAt: Date;
      karmaPoints?: number;
      equippedColor?: string | null;
      equippedNameplate?: string | null;
      avatar?: string | null;
      customAvatar?: string | null;
      currentStreak?: number;
      roles?: Array<{
        id: string;
        role: {
          id: string;
          name: string;
          color?: string | null;
          iconUrl?: string | null;
          position: number;
        };
      }>;
    }>;
    iconUrl?: string | null;
    bannerUrl?: string | null;
  };
  channel: {
    id: string;
    name: string;
  };
  messages: any[];
  currentUserId: string;
  selectedServerId?: string;
  currentUserProfile?: any;
  serverEmojis?: any[];
  serverStickers?: any[];
}

export default function ServerChatView({
  server,
  channel,
  messages,
  currentUserId,
  selectedServerId,
  currentUserProfile,
  serverEmojis = [],
  serverStickers = [],
}: ServerChatViewProps) {
  const [isSending, setIsSending] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isSendingPoll, setIsSendingPoll] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [reactionTab, setReactionTab] = useState<'unicode' | 'custom'>('unicode');
  const [localMessages, setLocalMessages] = useState<any[]>(messages);
  const [bumpCooldown, setBumpCooldown] = useState<{ canBump: boolean; remainingMinutes: number } | null>(null);
  const [showReactionRoleDialog, setShowReactionRoleDialog] = useState(false);
  const [allRenderEmojis, setAllRenderEmojis] = useState<any[]>([]);

  useEffect(() => {
    getAllEmojisForRendering()
      .then(({ emojis }) => setAllRenderEmojis(emojis))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchCooldown = async () => {
      try {
        const cooldown = await getServerBumpCooldown(server.id);
        setBumpCooldown(cooldown);
      } catch {
        setBumpCooldown({ canBump: true, remainingMinutes: 0 });
      }
    };
    fetchCooldown();

    const interval = setInterval(fetchCooldown, 60000);
    return () => clearInterval(interval);
  }, [server.id]);

  const emojiMap = useMemo(() => buildEmojiMap([...serverEmojis, ...allRenderEmojis], []), [serverEmojis, allRenderEmojis]);

  useEffect(() => {
    setLocalMessages(messages);
    lastMsgTimeRef.current = messages.length > 0
      ? new Date(messages[messages.length - 1].createdAt).toISOString()
      : new Date().toISOString();
    setReplyToMessage(null);
  }, [channel.id]);

  const { theme } = useTheme();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reactionEmojiRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgTimeRef = useRef<string>(
    messages.length > 0 ? new Date(messages[messages.length - 1].createdAt).toISOString() : new Date().toISOString()
  );

  const isMuted = server.isMuted;

  useEffect(() => {
    markServerAsRead(server.id);
  }, [server.id]);

  const ablyChannelName = useMemo(() => `server:${server.id}:channel:${channel.id}`, [server.id, channel.id]);
  const { isConnected, subscribe } = useAbly(ablyChannelName);

  useEffect(() => {
    const unsubscribe = subscribe((event: ChatEvent) => {
      if (event.type === "message:new") {
        const msg = event.message;
        setLocalMessages((prev) => {
          const exists = prev.some((m: any) => String(m.id) === String(msg.id));
          if (exists) return prev;
          lastMsgTimeRef.current = new Date(msg.createdAt).toISOString();
          return [...prev, msg];
        });
      } else if (event.type === "message:delete") {
        setLocalMessages((prev) => prev.filter((m: any) => String(m.id) !== String(event.messageId)));
      } else if (event.type === "reaction:add") {
        setLocalMessages((prev) =>
          prev.map((m: any) => {
            if (String(m.id) !== String(event.messageId)) return m;
            const reactions = m.reactions || [];
            const exists = reactions.some((r: any) => r.userId === event.userId && r.emoji === event.emoji);
            if (exists) return m;
            return { ...m, reactions: [...reactions, { id: -Date.now(), messageId: event.messageId, userId: event.userId, emoji: event.emoji }] };
          })
        );
      } else if (event.type === "reaction:remove") {
        setLocalMessages((prev) =>
          prev.map((m: any) => {
            if (String(m.id) !== String(event.messageId)) return m;
            return { ...m, reactions: (m.reactions || []).filter((r: any) => !(r.userId === event.userId && r.emoji === event.emoji)) };
          })
        );
      }
    });
    return unsubscribe;
  }, [ablyChannelName, subscribe]);

  useEffect(() => {
    if (isConnected) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const since = encodeURIComponent(lastMsgTimeRef.current);
        const res = await fetch(
          `/api/messages/poll?type=server&channelId=${channel.id}&since=${since}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const newMsgs: any[] = await res.json();
        if (newMsgs.length > 0 && !cancelled) {
          lastMsgTimeRef.current = new Date(newMsgs[newMsgs.length - 1].createdAt).toISOString();
          setLocalMessages((prev) => {
            const ids = new Set(prev.map((m: any) => String(m.id)));
            const toAdd = newMsgs.filter((m: any) => !ids.has(String(m.id)));
            return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
          });
        }
      } catch {}
    };

    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [channel.id, isConnected]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [localMessages.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reactionEmojiRef.current && !reactionEmojiRef.current.contains(event.target as Node)) {
        setReactionMessageId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;
    if (content.trim().startsWith("/")) return;

    const tempId = `pending-${Date.now()}`;
    const capturedReply = replyToMessage;
    const replyTo = capturedReply
      ? { id: capturedReply.id, content: capturedReply.content, senderId: capturedReply.senderId }
      : null;

    const optimistic: any = {
      id: tempId,
      content,
      senderId: currentUserId,
      channelId: channel.id,
      createdAt: new Date().toISOString(),
      messageType: "TEXT",
      commandKey: null,
      commandLabel: null,
      commandUrl: null,
      senderUsername: "You",
      senderRole: server.myRole,
      replyToId: capturedReply?.id ?? null,
      replyTo,
      reactions: [],
      poll: null,
    };

    setLocalMessages((prev) => [...prev, optimistic]);
    setReplyToMessage(null);
    setIsSending(true);

    try {
      const saved = await sendServerMessage(channel.id, content, capturedReply?.id);
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...saved, reactions: [], poll: null, replyTo } : m
        )
      );
      lastMsgTimeRef.current = new Date(saved.createdAt).toISOString();
    } catch {
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const openPoll = () => {
    setShowPollDialog(true);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const handleSendPoll = async () => {
    setIsSendingPoll(true);
    try {
      await sendServerPoll(channel.id, pollQuestion, pollOptions, replyToMessage?.id);
      setShowPollDialog(false);
      setReplyToMessage(null);
      router.refresh();
    } finally {
      setIsSendingPoll(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setLocalMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteServerMessage(messageId);
    } catch {}
  };

  const hasPermission = useCallback((flag: bigint): boolean => {
    if (!server.myPermissions) return server.myRole === "ADMIN";
    const perms = BigInt(server.myPermissions);
    return (perms & ROLE_PERMISSIONS.ADMINISTRATOR) === ROLE_PERMISSIONS.ADMINISTRATOR || (perms & flag) === flag;
  }, [server.myPermissions, server.myRole]);

  const handleReaction = async (messageId: string, emoji: string) => {
    setLocalMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions: any[] = msg.reactions ?? [];
        const existing = reactions.find(
          (r: any) => r.userId === currentUserId && r.emoji === emoji
        );
        const newReactions = existing
          ? reactions.filter((r: any) => !(r.userId === currentUserId && r.emoji === emoji))
          : [...reactions, { id: -Date.now(), messageId, userId: currentUserId, emoji }];
        return { ...msg, reactions: newReactions };
      })
    );
    setReactionMessageId(null);
    try {
      const reactions = localMessages.find((m) => m.id === messageId)?.reactions ?? [];
      const existing = reactions.find(
        (r: any) => r.userId === currentUserId && r.emoji === emoji
      );

      await toggleServerMessageReaction(messageId, emoji);

      if (existing) {
        await handleReactionRemove(server.id, messageId, emoji, currentUserId);
      } else {
        await handleReactionAdd(server.id, channel.id, messageId, emoji, currentUserId);
      }

      const refreshed = await getServerMessages(channel.id, Math.max(localMessages.length, 50));
      setLocalMessages(refreshed);
      router.refresh();
    } catch (e: any) {

      setLocalMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;
          const reactions: any[] = msg.reactions ?? [];
          const existing = reactions.find(
            (r: any) => r.userId === currentUserId && r.emoji === emoji
          );
          const newReactions = existing
            ? reactions.filter(
                (r: any) => !(r.userId === currentUserId && r.emoji === emoji)
              )
            : [...reactions, { id: -Date.now(), messageId, userId: currentUserId, emoji }];
          return { ...msg, reactions: newReactions };
        })
      );
      toast.error(e?.message || "Failed to toggle reaction");
    }
  };

  const canDelete = (msg: any) => {
    if (msg.senderId === currentUserId) return true;
    if (server.myRole === "ADMIN") return true;
    if (hasPermission(ROLE_PERMISSIONS.MANAGE_MESSAGES)) return true;
    if (server.myRole === "MODERATOR") {
      const senderMember = server.members.find((m) => m.userId === msg.senderId);
      if (senderMember?.role === "ADMIN") return false;
      return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="h-14 px-4 border-b border-border flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-2">
          {selectedServerId && (
            <Link
              href={`/servers?serverId=${selectedServerId}`}
              className="sm:hidden p-1.5 -ml-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <Hash className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">{channel.name}</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {server.description || `Welcome to #${channel.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">{server.members.length}</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-background"
      >
        {localMessages.map((msg: any) => {

          if (msg.messageType === "SYSTEM" || msg.senderId === "system") {
            return (
              <div key={msg.id} className="flex w-full justify-center py-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/30 text-xs text-muted-foreground">
                  <span className="font-medium text-primary">System</span>
                  <span className="text-border">|</span>
                  <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*/g, '') }} />
                </div>
              </div>
            );
          }

          const isMe = msg.senderId === currentUserId;
          const reactionsByEmoji = (msg.reactions || []).reduce((acc: any, r: any) => {
            if (!acc[r.emoji]) acc[r.emoji] = [];
            acc[r.emoji].push(r);
            return acc;
          }, {});

          const senderMember = server.members.find((m) => m.userId === msg.senderId);
          const senderRole = senderMember?.role || "MEMBER";
          const senderCustomRoles = (senderMember as any)?.roles?.map((mr: any) => ({
            name: mr.role?.name || "",
            color: mr.role?.color || null,
            iconUrl: mr.role?.iconUrl || null,
          })).filter((r: any) => r.name) || [];

          return (
            <div
              key={msg.id}
              className="group relative flex w-full hover:bg-muted/30 transition-colors px-4 py-2"
              onDoubleClick={() => setReplyToMessage(msg)}
            >
              <div className="absolute right-4 -top-3 hidden group-hover:flex items-center p-0.5 rounded-md bg-card shadow-sm border border-border/50 z-10">
                {AVAILABLE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(msg.id, emoji)}
                    className="w-7 h-7 flex items-center justify-center text-[14px] hover:bg-muted rounded-sm transition-colors active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
                <div className="w-[1px] h-4 bg-border mx-1" />
                <button
                  onClick={() => setReactionMessageId(reactionMessageId === msg.id ? null : msg.id)}
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors"
                >
                  <SmilePlus className="w-4 h-4" />
                </button>
                {canDelete(msg) && (
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {reactionMessageId === msg.id && (
                <div ref={reactionEmojiRef} className="absolute z-50 right-4 top-8 shadow-xl">
                  <div className="bg-background rounded-lg border border-border shadow-2xl overflow-hidden" style={{ width: 320 }}>
                    <div className="flex border-b border-border">
                      <button
                        onClick={() => setReactionTab('unicode')}
                        className={`flex-1 py-2 text-xs font-medium transition-colors ${
                          reactionTab === 'unicode' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                        }`}
                      >
                        Standard
                      </button>
                      {serverEmojis.filter((e: any) => !e.packId).length > 0 && (
                        <button
                          onClick={() => setReactionTab('custom')}
                          className={`flex-1 py-2 text-xs font-medium transition-colors ${
                            reactionTab === 'custom' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'
                          }`}
                        >
                          Server ({serverEmojis.filter((e: any) => !e.packId).length})
                        </button>
                      )}
                    </div>

                    {reactionTab === 'unicode' && (
                      <EmojiPicker
                        onEmojiClick={(emojiData) => handleReaction(msg.id, emojiData.emoji)}
                        width={320}
                        height={300}
                        theme={theme === 'dark' ? "dark" : "light"}
                      />
                    )}

                    {reactionTab === 'custom' && (
                      <div className="p-3 h-[300px] overflow-y-auto">
                        {serverEmojis.filter((e: any) => !e.packId).length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Smile className="w-8 h-8 mb-2 opacity-40" />
                            <p className="text-xs text-center">No custom emojis</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-6 gap-1">
                            {serverEmojis.filter((e: any) => !e.packId).map((emoji) => (
                              <button
                                key={emoji.id}
                                onClick={() => handleReaction(msg.id, `:${emoji.name}:`)}
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
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <ChatMessageHeader
                username={msg.senderUsername || ""}
                userId={msg.senderId}
                avatar={senderMember?.avatar || (msg as any).senderAvatar || (isMe ? currentUserProfile?.imageUrl : undefined)}
                customAvatar={senderMember?.customAvatar || (msg as any).senderCustomAvatar || (isMe ? currentUserProfile?.customAvatar : undefined)}
                equippedColor={senderMember?.equippedColor || (msg as any).senderColor || (isMe ? currentUserProfile?.equippedUsernameColor : undefined)}
                equippedNameplate={senderMember?.equippedNameplate || (msg as any).senderNameplate || (isMe ? currentUserProfile?.equippedNameplate : undefined)}
                karmaPoints={senderMember?.karmaPoints || (msg as any).senderKarma || (isMe ? currentUserProfile?.karmaPoints : 0)}
                streak={senderMember?.currentStreak ?? (msg as any).senderStreak ?? 0}
                roleBadge={senderRole !== "MEMBER" ? senderRole : null}
                customRoleBadges={senderCustomRoles}
                timestamp={new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              >
                <div className="flex flex-col gap-1 w-full max-w-[85%] mt-1">
                  {msg.replyTo && (
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-6 h-[1px] bg-border/60" />
                      <span className="truncate max-w-[200px]">Replying to: {msg.replyTo.content}</span>
                    </div>
                  )}
                  {msg.poll ? (
                    <PollMessage
                      poll={msg.poll}
                      currentUserId={currentUserId}
                      isOwnMessage={isMe}
                      getVoterLabel={(uid) =>
                        server.members?.find((m: any) => m.userId === uid)?.displayName || uid
                      }
                    />
                  ) : msg.messageType === "COMMAND" && msg.commandUrl ? (
                    <a
                      href={msg.commandUrl}
                      className="inline-block rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[13px] text-blue-600 dark:text-blue-300 hover:bg-blue-500/15"
                    >
                      {msg.commandLabel || msg.content}
                    </a>
                  ) : (
                    <MarkdownMessage
                      content={msg.content}
                      emojiMap={emojiMap}
                      stickerUrls={serverStickers.map(s => s.imageUrl)}
                    />
                  )}

                  {Object.keys(reactionsByEmoji).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <TooltipProvider delayDuration={100}>
                        {Object.entries(reactionsByEmoji).map(([emoji, reacts]: [string, any]) => {
                          const hasReacted = reacts.some((r: any) => r.userId === currentUserId);
                          return (
                            <Tooltip key={emoji}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border transition-all duration-200 ${
                                    hasReacted
                                      ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  <EmojiReaction emoji={emoji} emojiMap={emojiMap} />
                                  <span className="font-semibold">{reacts.length}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="p-2 min-w-[120px]">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-medium text-muted-foreground tracking-wider mb-1 flex items-center gap-1">
                                    Reacted with <EmojiReaction emoji={emoji} emojiMap={emojiMap} />
                                  </p>
                                  {reacts.map((r: any) => {
                                    const member = server.members?.find((m: any) => m.userId === r.userId);
                                    return (
                                      <div key={r.id} className="text-xs font-medium">
                                        {member ? member.displayName : "Unknown"}
                                      </div>
                                    );
                                  })}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              </ChatMessageHeader>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 bg-background border-t border-border shrink-0 relative">
        {replyToMessage && (
          <div className="mb-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground flex items-center justify-between gap-2 max-w-4xl mx-auto">
            <span className="truncate">Replying to: {replyToMessage.content}</span>
            <button
              type="button"
              onClick={() => setReplyToMessage(null)}
              className="text-xs font-medium hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
        <div className="max-w-4xl mx-auto">
          <RichMessageInput
            placeholder={isMuted ? "You are muted in this server." : `Message #${channel.name}`}
            onSubmit={handleSendMessage}
            disabled={isSending || isMuted}
            serverEmojis={serverEmojis}
            serverStickers={serverStickers}
            onSlashCommands={[
              {
                id: "poll",
                title: "/poll",
                description: "Create a poll with 2+ options",
                keywords: ["vote", "survey"],
                icon: defaultIcons.poll,
                onSelect: openPoll,
              },
              {
                id: "ticket",
                title: "/ticket",
                description: "Send support-ticket redirect message",
                keywords: ["support", "helpdesk"],
                icon: defaultIcons.ticket,
                onSelect: async () => {
                  await sendServerCommandMessage(channel.id, "Open Support Tickets", "/support", replyToMessage?.id);
                  router.refresh();
                  setReplyToMessage(null);
                },
              },
              {
                id: "bump",
                title: "/bump",
                description: bumpCooldown
                  ? bumpCooldown.canBump
                    ? "Bump this server to the top of discover (Ready!)"
                    : `Bump cooldown: ${bumpCooldown.remainingMinutes}m remaining`
                  : "Bump this server (checking cooldown...)",
                keywords: ["promote", "boost", "discoverable"],
                icon: <Rocket className={cn("size-4", bumpCooldown?.canBump === false && "text-muted-foreground")} />,
                onSelect: async () => {
                  if (bumpCooldown && !bumpCooldown.canBump) {

                    const systemMessage = {
                      id: `system-${Date.now()}`,
                      content: `⏰ Bump cooldown active. Please wait ${bumpCooldown.remainingMinutes} minutes before bumping again.`,
                      senderId: "system",
                      senderUsername: "System",
                      senderRole: "SYSTEM",
                      messageType: "SYSTEM",
                      createdAt: new Date(),
                      channelId: channel.id,
                      reactions: [],
                    };
                    setLocalMessages(prev => [...prev, systemMessage]);
                    return;
                  }

                  try {
                    setIsSending(true);
                    const result = await bumpServer(server.id, channel.id);
                    if (result.success) {

                      setBumpCooldown({ canBump: false, remainingMinutes: 120 });

                      router.refresh();
                    }
                  } catch (err: any) {

                    const errorMessage = {
                      id: `system-error-${Date.now()}`,
                      content: `❌ ${err.message || "Failed to bump server"}`,
                      senderId: "system",
                      senderUsername: "System",
                      senderRole: "SYSTEM",
                      messageType: "SYSTEM",
                      createdAt: new Date(),
                      channelId: channel.id,
                      reactions: [],
                    };
                    setLocalMessages(prev => [...prev, errorMessage]);
                  } finally {
                    setIsSending(false);
                  }
                },
              },
              ...(hasPermission(ROLE_PERMISSIONS.CREATE_REACTION_ROLES) ? [
                {
                  id: "reactionrole",
                  title: "/reactionrole",
                  description: "Create reaction roles",
                  keywords: ["role", "emoji", "assign"],
                  icon: defaultIcons.reactionrole,
                  onSelect: () => setShowReactionRoleDialog(true),
                },
              ] : []),
              {
                id: "help",
                title: "/help",
                description: "Show available commands",
                keywords: ["commands", "slash"],
                icon: defaultIcons.help,
                onSelect: () => undefined,
              },
            ]}
          />
        </div>
      </div>

      <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Poll</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Question
              </label>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full h-10 px-3 rounded-md text-sm text-foreground bg-background outline-none border border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Options
              </label>
              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) =>
                        setPollOptions((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))
                      }
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 h-10 px-3 rounded-md text-sm text-foreground bg-background outline-none border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={pollOptions.length <= 2}
                      className="h-10 px-3 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPollOptions((prev) => [...prev, ""])}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                Add option
              </button>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPollDialog(false)}
                className="flex-1 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPoll}
                disabled={isSendingPoll}
                className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSendingPoll ? "Sending..." : "Send poll"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={showMembers} onOpenChange={setShowMembers}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Server Members
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <ServerMembersPanel
              members={server.members}
              currentUserId={currentUserId}
              serverId={server.id}
              serverOwnerId={server.createdById}
              myPermissions={server.myPermissions}
            />
          </div>
        </SheetContent>
      </Sheet>

      <ReactionRoleDialog
        serverId={server.id}
        channelId={channel.id}
        isOpen={showReactionRoleDialog}
        onClose={() => setShowReactionRoleDialog(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

function RoleBadge({ role, colorOverride }: { role: string; colorOverride?: string | null }) {
  const configs: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    ADMIN: {
      icon: <Crown className="w-3 h-3" />,
      label: "ADMIN",
      color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20",
    },
    MODERATOR: {
      icon: <Shield className="w-3 h-3" />,
      label: "MOD",
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    },
    MEMBER: {
      icon: <User className="w-3 h-3" />,
      label: "MEMBER",
      color: "text-muted-foreground bg-muted border-border/50",
    },
  };

  const config = configs[role] || configs.MEMBER;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${colorOverride ? '' : config.color}`}
      style={colorOverride ? {
        color: colorOverride,
        borderColor: `${colorOverride}33`,
        backgroundColor: `${colorOverride}1a`,
      } : undefined}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
