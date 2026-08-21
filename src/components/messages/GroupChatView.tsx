"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { User as UserIcon, SmilePlus, Smile, Hash, Users, Info, MoreVertical, Trash2 } from "lucide-react";
import EmojiPicker from "./LazyEmojiPicker";
import { useTheme } from "next-themes";
import { sendGroupMessage, sendGroupPoll, sendGroupCommandMessage, toggleGroupMessageReaction, deleteGroupMessage, getGroupMessages } from "@/actions/group.actions";
import { markGroupMessagesAsRead } from "@/actions/notification.actions";
import { getAllEmojiPickerData, getAllEmojisForRendering } from "@/actions/emoji-sticker.actions";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-toastify";
import { useAbly, type ChatEvent } from "@/hooks/useAbly";
import Link from "next/link";
import { getKarmaTierColor } from "@/lib/karma-tiers";
import PollMessage from "./PollMessage";
import { defaultIcons } from "./SlashCommandMenu";
import RichMessageInput from "./RichMessageInput";
import MarkdownMessage from "./MarkdownMessage";
import EmojiReaction from "./EmojiReaction";
import { buildEmojiMap } from "./EmojiRenderer";
import { ChatMessageHeader } from "./ChatMessageHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GroupMembersPanel from "./GroupMembersPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const AVAILABLE_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

interface GroupChatViewProps {
  group: any;
  currentUserId: string;
  currentUserProfile?: any;
}

export default function GroupChatView({ group, currentUserId, currentUserProfile }: GroupChatViewProps) {
  const [isSending, setIsSending] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<number | null>(null);
  const [reactionTab, setReactionTab] = useState<'unicode' | 'custom'>('unicode');
  const router = useRouter();
  const [isNearBottom, setIsNearBottom] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reactionEmojiRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { user } = useUser();
  const [showMembers, setShowMembers] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isSendingPoll, setIsSendingPoll] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);

  const [localMessages, setLocalMessages] = useState<any[]>(group.messages ?? []);
  const [serverEmojis, setServerEmojis] = useState<any[]>([]);
  const [serverStickers, setServerStickers] = useState<any[]>([]);
  const [renderEmojis, setRenderEmojis] = useState<any[]>([]);
  const [renderStickers, setRenderStickers] = useState<any[]>([]);
  const lastMsgTimeRef = useRef<string>(
    group.messages?.length
      ? new Date((group.messages as any[]).at(-1).createdAt).toISOString()
      : new Date().toISOString()
  );

  const [members, setMembers] = useState<any[]>(group.members ?? []);

  useEffect(() => {
    setLocalMessages(group.messages ?? []);
    setMembers(group.members ?? []);
    lastMsgTimeRef.current = group.messages?.length
      ? new Date((group.messages as any[]).at(-1).createdAt).toISOString()
      : new Date().toISOString();
  }, [group.id]);

  const me = members.find((m: any) => m.userId === currentUserId);
  const isMuted = me?.isMuted || false;

  useEffect(() => {
    getAllEmojiPickerData()
      .then(({ emojis, stickers }) => {
        setServerEmojis(emojis);
        setServerStickers(stickers);
      })
      .catch(() => {});
    getAllEmojisForRendering()
      .then(({ emojis, stickers }) => {
        setRenderEmojis(emojis);
        setRenderStickers(stickers);
      })
      .catch(() => {});
  }, []);

  const emojiMap = useMemo(() => buildEmojiMap(renderEmojis, []), [renderEmojis]);

  useEffect(() => {
    markGroupMessagesAsRead(group.id);
  }, [group.id]);

  const ablyChannelName = useMemo(() => `group:${group.id}`, [group.id]);
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
      } else if (event.type === "member:muted") {
        setMembers((prev) =>
          prev.map((m: any) =>
            m.userId === event.userId ? { ...m, isMuted: event.isMuted } : m
          )
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
          `/api/messages/poll?convId=${group.id}&type=group&since=${since}`,
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const newMsgs: any[] = await res.json();
        if (newMsgs.length > 0 && !cancelled) {
          lastMsgTimeRef.current = new Date(
            newMsgs[newMsgs.length - 1].createdAt
          ).toISOString();
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
  }, [group.id, isConnected]);

  const updateIsNearBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distanceFromBottom < 120);
  }, []);

  useEffect(() => {
    updateIsNearBottom();
  }, [updateIsNearBottom]);

  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!isNearBottom) {
      hasScrolledRef.current = false;
      return;
    }
    if (hasScrolledRef.current) return;

    const scroller = scrollerRef.current;
    if (scroller) {
      hasScrolledRef.current = true;
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [localMessages.length, isNearBottom]);

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
    if (isMuted) {
      toast.error("You are muted in this group.");
      return;
    }
    if (content.trim().startsWith("/")) return;

    const tempId = `pending-${Date.now()}`;
    const capturedReply = replyToMessage;
    const replyTo = capturedReply
      ? { id: capturedReply.id, content: capturedReply.content, senderId: capturedReply.senderId }
      : null;
    const member = members.find((m: any) => m.userId === currentUserId);

    const optimistic: any = {
      id: tempId,
      content,
      senderId: currentUserId,
      groupId: group.id,
      createdAt: new Date().toISOString(),
      messageType: "TEXT",
      commandKey: null, commandLabel: null, commandUrl: null,
      senderUsername: member?.username ?? "",
      senderRole: member?.userRole ?? "",
      replyToId: capturedReply?.id ?? null,
      replyTo,
      reactions: [],
      poll: null,
    };

    setLocalMessages((prev) => [...prev, optimistic]);
    setReplyToMessage(null);
    setIsSending(true);

    try {
      const saved = await sendGroupMessage(group.id, content, capturedReply?.id);
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...saved, reactions: [], poll: null, replyTo } : m
        )
      );
      lastMsgTimeRef.current = new Date(saved.createdAt).toISOString();
    } catch (e: any) {
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
      if (e?.message?.includes("muted")) {
        toast.error("You are muted in this group.");
      } else {
        toast.error(e?.message || "Failed to send message");
      }
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
    if (isMuted) {
      toast.error("You are muted in this group.");
      return;
    }
    setIsSendingPoll(true);
    try {
      await sendGroupPoll(group.id, pollQuestion, pollOptions, replyToMessage?.id);
      setShowPollDialog(false);
      setReplyToMessage(null);
      router.refresh();
    } catch (e: any) {
      if (e?.message?.includes("muted")) {
        toast.error("You are muted in this group.");
      } else {
        toast.error(e?.message || "Failed to send poll");
      }
    } finally {
      setIsSendingPoll(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    setLocalMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteGroupMessage(messageId);
    } catch {}
  };

  const handleReaction = async (messageId: number, emoji: string) => {

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
    setReactionMessageId(null);
    try {
      await toggleGroupMessageReaction(messageId, emoji);
      const refreshed = await getGroupMessages(group.id, Math.max(localMessages.length, 50));
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

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {group.bannerUrl && (
        <div className="shrink-0 w-full h-20 relative overflow-hidden">
          <img
            src={group.bannerUrl}
            alt="Group banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/60" />
        </div>
      )}
      <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex justify-between items-center bg-background z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0 shadow-sm border border-border/50">
            <Hash className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[16px] md:text-[18px] font-semibold tracking-tight text-foreground truncate">
              {group.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] md:text-[12px] text-muted-foreground truncate max-w-[200px]">
                {group.description || "Group chat"}
              </p>
              <span className="text-[10px] text-muted-foreground/30"></span>
              <button
                onClick={() => setShowMembers(true)}
                className="flex items-center gap-1 text-[11px] md:text-[12px] text-blue-500 hover:underline font-medium"
              >
                <Users className="size-3" />
                {members.length || 0} members
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMembers(true)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
          >
            <Info className="size-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={updateIsNearBottom}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-background no-scrollbar"
      >
        {localMessages.map((msg: any) => {
          const isMe = msg.senderId === currentUserId;
          const reactionsByEmoji = (msg.reactions || []).reduce((acc: any, r: any) => {
            if (!acc[r.emoji]) acc[r.emoji] = [];
            acc[r.emoji].push(r);
            return acc;
          }, {});

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
                {(msg.senderId === currentUserId || members.find((m: any) => m.userId === currentUserId)?.isOwner) && (
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
                avatar={(msg as any).senderAvatar || (isMe ? user?.imageUrl : undefined)}
                customAvatar={(msg as any).senderCustomAvatar || (isMe ? currentUserProfile?.customAvatar : undefined)}
                equippedColor={(msg as any).senderColor || (isMe ? currentUserProfile?.equippedUsernameColor : undefined)}
                equippedNameplate={(msg as any).senderNameplate || (isMe ? currentUserProfile?.equippedNameplate : undefined)}
                karmaPoints={(msg as any).senderKarma || (isMe ? currentUserProfile?.karmaPoints : 0)}
                streak={(msg as any).senderStreak || 0}
                roleBadge={msg.senderRole && msg.senderRole !== "student" ? msg.senderRole : null}
                timestamp={new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              >
                <div className="flex flex-col gap-1 w-full mt-1">
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
                      getVoterLabel={(uid) => members.find((m: any) => m.userId === uid)?.displayName || uid}
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
                      stickerUrls={[...serverStickers, ...renderStickers].map(s => s.imageUrl)}
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
                                    const member = members.find((m: any) => m.userId === r.userId);
                                    return (
                                      <div key={r.id} className="text-xs font-medium py-0.5">
                                        {member ? member.displayName : "Unknown Member"}
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
          <div className="mb-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-[12px] text-muted-foreground flex items-center justify-between gap-2 max-w-4xl mx-auto">
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
            placeholder={isMuted ? "You are muted in this group." : "Message this group..."}
            onSubmit={handleSendMessage}
            disabled={isSending || isMuted}
            serverEmojis={serverEmojis.filter((e) => !e.packId)}
            serverStickers={serverStickers.filter((s) => !s.packId)}
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
                  await sendGroupCommandMessage(group.id, "Open Support Tickets", "/support", replyToMessage?.id);
                  router.refresh();
                  setReplyToMessage(null);
                },
              },
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
            <DialogDescription className="pt-2">
              Add a question and at least two options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest">
                Question
              </label>
              <input
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full h-10 px-3 rounded-md text-[14px] text-foreground bg-background outline-none shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest">
                Options
              </label>
              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) =>
                        setPollOptions((prev) =>
                          prev.map((p, i) => (i === idx ? e.target.value : p))
                        )
                      }
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 h-10 px-3 rounded-md text-[14px] text-foreground bg-background outline-none shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px]"
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
          </div>

          <DialogFooter className="pt-2">
            <button
              onClick={() => setShowPollDialog(false)}
              className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendPoll}
              disabled={isSendingPoll}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSendingPoll ? "Sending..." : "Send poll"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showMembers} onOpenChange={setShowMembers}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col border-none shadow-2xl bg-background/95 backdrop-blur-md">
          <SheetHeader className="p-6 border-b border-border/30 text-left">
            <SheetTitle className="text-[18px] font-semibold flex items-center gap-2">
              <Users className="size-5" />
              Group Members
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <GroupMembersPanel group={group} currentUserId={currentUserId} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
