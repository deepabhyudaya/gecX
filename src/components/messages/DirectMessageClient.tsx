"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-toastify";
import { useAbly, type ChatEvent } from "@/hooks/useAbly";
import Link from "next/link";
import {
  sendDirectMessage,
  toggleDMReaction,
  startConversation,
  toggleConversationStatus,
  verifyAccessCode,
  deleteConversation,
  blockUser,
  unblockUser,
  sendDirectPoll,
  sendDirectCommandMessage,
  deleteDirectMessage,
  getConversationMessages,
} from "@/actions/message.actions";
import { markDirectMessagesAsRead, markGroupMessagesAsRead } from "@/actions/notification.actions";
import { getAllEmojiPickerData, getAllEmojisForRendering } from "@/actions/emoji-sticker.actions";
import { getKarmaTierColor } from "@/lib/karma-tiers";
import { PlusCircle, User as UserIcon, X, Lock, CheckCircle, Unlock, Trash2, SmilePlus, Smile, Hash, Users, Inbox, Ban, ExternalLink } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";
import JoinGroupModal from "./JoinGroupModal";
import GroupChatView from "./GroupChatView";
import PollMessage from "./PollMessage";
import RichMessageInput from "./RichMessageInput";
import MarkdownMessage from "./MarkdownMessage";
import EmojiReaction from "./EmojiReaction";
import { buildEmojiMap } from "./EmojiRenderer";
import { ChatMessageHeader } from "./ChatMessageHeader";
import { defaultIcons } from "./SlashCommandMenu";
import EmojiPicker from "./LazyEmojiPicker";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { UserCardTrigger } from "@/components/user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface DirectMessageClientProps {
  conversations: any[];
  groups: any[];
  selectedData: any | null;
  currentUserId: string;
  defaultLayout?: number[];
  currentUserProfile?: any;
}

export default function DirectMessageClient({
  conversations,
  groups,
  selectedData,
  currentUserId,
  defaultLayout,
  currentUserProfile,
}: DirectMessageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [reactionMessageId, setReactionMessageId] = useState<number | null>(null);
  const [reactionTab, setReactionTab] = useState<'unicode' | 'custom'>('unicode');
  const reactionEmojiRef = useRef<HTMLDivElement>(null);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isSendingPoll, setIsSendingPoll] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);

  const [localMessages, setLocalMessages] = useState<any[]>(selectedData?.messages ?? []);
  const [serverEmojis, setServerEmojis] = useState<any[]>([]);
  const [serverStickers, setServerStickers] = useState<any[]>([]);
  const [renderEmojis, setRenderEmojis] = useState<any[]>([]);
  const [renderStickers, setRenderStickers] = useState<any[]>([]);

  const lastMsgTimeRef = useRef<string>(
    selectedData?.messages?.length
      ? new Date((selectedData.messages as any[]).at(-1).createdAt).toISOString()
      : new Date().toISOString()
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (reactionEmojiRef.current && !reactionEmojiRef.current.contains(event.target as Node)) {
        setReactionMessageId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const updateIsNearBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsNearBottom(distanceFromBottom < 120);
  }, []);

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
    const msgs = selectedData?.messages ?? [];
    setLocalMessages(msgs);
    lastMsgTimeRef.current = msgs.length
      ? new Date((msgs as any[]).at(-1).createdAt).toISOString()
      : new Date().toISOString();
  }, [selectedData?.id, selectedData?.isGroup]);

  useEffect(() => {
    if (selectedData) {
      if (selectedData.isGroup) {
        markGroupMessagesAsRead(selectedData.id);
      } else {
        markDirectMessagesAsRead(selectedData.id);
      }
    }
  }, [selectedData?.id, selectedData?.isGroup]);

  const ablyChannelName = useMemo(() => {
    if (!selectedData || selectedData.isGroup) return null;
    return `dm:${selectedData.id}`;
  }, [selectedData?.id, selectedData?.isGroup]);

  const { isConnected, subscribe } = useAbly(ablyChannelName);

  useEffect(() => {
    if (!ablyChannelName) return;
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
    if (!selectedData || selectedData.isGroup || isConnected) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const since = encodeURIComponent(lastMsgTimeRef.current);
        const res = await fetch(
          `/api/messages/poll?convId=${selectedData.id}&type=direct&since=${since}`,
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
  }, [selectedData?.id, selectedData?.isGroup, isConnected]);

  const handleConversationClick = (id: number) => {
    router.push(`/messages?convId=${id}&type=direct`);
  };

  const handleGroupClick = (id: number) => {
    router.push(`/messages?convId=${id}&type=group`);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifying(true);
    try {
      const user = await verifyAccessCode(accessCode);
      if (user) {
        setFoundUser(user);
      } else {
        setError("Invalid access code.");
      }
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setVerifying(false);
    }
  };

  const handleStartChat = async () => {
    if (!foundUser) return;
    const convId = await startConversation(foundUser.id);
    setIsCreating(false);
    setAccessCode("");
    setFoundUser(null);
    router.push(`/messages?convId=${convId}`);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !selectedData || selectedData.isGroup) return;
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
      conversationId: selectedData.id,
      createdAt: new Date().toISOString(),
      messageType: "TEXT",
      commandKey: null, commandLabel: null, commandUrl: null,
      isRead: false,
      replyToId: capturedReply?.id ?? null,
      replyTo,
      reactions: [],
      poll: null,
    };

    setLocalMessages((prev) => [...prev, optimistic]);
    setReplyToMessage(null);

    try {
      const saved = await sendDirectMessage(selectedData.id, content, capturedReply?.id);

      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...saved, reactions: [], poll: null, replyTo } : m
        )
      );

      lastMsgTimeRef.current = new Date(saved.createdAt).toISOString();
    } catch {

      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const openPoll = () => {
    setShowPollDialog(true);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  const handleSendPoll = async () => {
    if (!selectedData || selectedData.isGroup) return;
    setIsSendingPoll(true);
    try {
      await sendDirectPoll(selectedData.id, pollQuestion, pollOptions, replyToMessage?.id);
      setShowPollDialog(false);
      setReplyToMessage(null);
      router.refresh();
    } finally {
      setIsSendingPoll(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {

    setLocalMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await deleteDirectMessage(messageId);
    } catch {

    }
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
      await toggleDMReaction(messageId, emoji);
      if (selectedData?.id) {
        const refreshed = await getConversationMessages(selectedData.id, Math.max(localMessages.length, 30));
        setLocalMessages(refreshed);
      }
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

  const handleToggleStatus = async () => {
    if (!selectedData || selectedData.isGroup) return;
    await toggleConversationStatus(selectedData.id);
  };

  const handleDeleteConversation = async () => {
    if (!selectedData || selectedData.isGroup) return;
    setIsDeleting(true);
    await deleteConversation(selectedData.id);
    setIsDeleting(false);
    setShowDeleteDialog(false);
    router.push('/messages');
  };

  const handleBlockUser = async () => {
    if (!selectedData || selectedData.isGroup) return;
    const otherId = selectedData?.otherUser?.id;
    if (!otherId) return;
    setIsBlocking(true);
    try {
      await blockUser(otherId, selectedData.id);
      setShowBlockDialog(false);
      router.push('/messages');
      router.refresh();
    } finally {
      setIsBlocking(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedData || selectedData.isGroup) return;
    const otherId = selectedData?.otherUser?.id;
    if (!otherId) return;
    setIsUnblocking(true);
    try {
      await unblockUser(otherId);
      setShowUnblockDialog(false);
      router.refresh();
    } finally {
      setIsUnblocking(false);
    }
  };

  const AVAILABLE_EMOJIS = ["👍", "♥️", "🎉", "😭", "🙏"];

  const shadowBorder = "shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px]";
  const shadowCard = "shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px,rgba(0,0,0,0.2)_0px_2px_2px]";

  const onLayout = (sizes: number[]) => {

    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768) return;
    document.cookie = `react-resizable-panels:messages-layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  return (
    <>
      <ResizablePanelGroup
        direction="horizontal"
        className={`w-full h-full rounded-lg ${shadowBorder} bg-background overflow-hidden flex flex-col md:flex-row`}
        onLayout={onLayout}
        style={{ height: '100%', overflow: 'hidden' }}
      >
        <ResizablePanel
          defaultSize={defaultLayout?.[0] ?? 30}
          minSize={20}
          maxSize={45}
          className={`flex-col ${shadowBorder} z-10 bg-background ${selectedData ? 'hidden md:flex' : 'flex'} h-full`}
        >
          <div className="p-4 border-b border-border bg-background shrink-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[16px] font-semibold tracking-[-0.32px] text-foreground">Messages</h2>
              <button
                onClick={() => setIsCreating(true)}
                className={`p-1.5 rounded-md ${shadowBorder} bg-background hover:bg-muted transition-colors`}
                title="New DM"
              >
                <PlusCircle className="size-4 text-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <CreateGroupModal />
              <div className="w-[1px] h-4 bg-border" />
              <JoinGroupModal />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-6">
            <div className="space-y-1.5">
              <div className="px-2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                <Inbox className="w-3 h-3" />
                Direct Messages
              </div>
              {conversations.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-2 py-1 ">No DMs yet.</p>
              )}
              {conversations.map((c) => {
                const hasNameplate = !!c.otherUser.equippedNameplate;
                return (
                <div
                  key={c.id}
                  onClick={() => handleConversationClick(c.id)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${selectedData?.id === c.id && !selectedData?.isGroup
                    ? "bg-background shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] dark:shadow-[0px_0px_0px_1px_rgba(255,255,255,0.1)]"
                    : hasNameplate ? "opacity-90 hover:opacity-100" : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                  style={hasNameplate ? { background: c.otherUser.equippedNameplate, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' } : {}}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={cn("font-medium text-[13px] line-clamp-1 flex-1 pr-2 flex items-center", hasNameplate ? "text-white" : "text-foreground")}>
                      <UserCardTrigger userId={c.otherUser.id}>
                        <span className="truncate cursor-pointer hover:opacity-80" style={!hasNameplate ? { color: c.otherUser.equippedUsernameColor || getKarmaTierColor(c.otherUser.karmaPoints) || undefined } : {}}>
                          {c.otherUser.username}
                        </span>
                      </UserCardTrigger>
                      <Link
                        href={`/${c.otherUser.username}`}
                        onClick={(e) => e.stopPropagation()}
                        className={cn("ml-1.5 p-0.5 rounded transition-colors", hasNameplate ? "text-white/80 hover:text-white hover:bg-white/10" : "hover:bg-muted text-muted-foreground hover:text-primary")}
                        title="View profile"
                      >
                        <ExternalLink className="size-3" />
                      </Link>
                      {c.unreadCount > 0 && (!selectedData || selectedData.id !== c.id || selectedData.isGroup) && (
                        <span className={cn("ml-2 inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold rounded-full shrink-0", hasNameplate ? "bg-white text-black text-shadow-none" : "text-white bg-blue-500")} style={hasNameplate ? { textShadow: 'none' } : {}}>
                          {c.unreadCount}
                        </span>
                      )}
                    </h3>
                    {c.isClosed && (
                      <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap", hasNameplate ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                        Closed
                      </span>
                    )}
                  </div>
                  <p className={cn("text-[11px] line-clamp-1", hasNameplate ? "text-white/90" : "text-muted-foreground")}>
                    {c.messages[0]?.content || "No messages yet"}
                  </p>
                </div>
              )})}
            </div>

            <div className="space-y-1.5 pb-4">
              <div className="px-2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                <Users className="w-3 h-3" />
                Groups
              </div>
              {groups.length === 0 && (
                <p className="text-[11px] text-muted-foreground px-2 py-1">No groups yet.</p>
              )}
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleGroupClick(g.id)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${selectedData?.id === g.id && selectedData?.isGroup
                    ? "bg-background shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] dark:shadow-[0px_0px_0px_1px_rgba(255,255,255,0.1)]"
                    : "hover:bg-accent hover:text-accent-foreground"
                    }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-[13px] text-foreground line-clamp-1 flex-1 pr-2 flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{g.name}</span>
                      {g.unreadCount > 0 && (!selectedData || selectedData.id !== g.id || !selectedData.isGroup) && (
                        <span className="ml-auto inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-white bg-blue-500 rounded-full shrink-0">
                          {g.unreadCount}
                        </span>
                      )}
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {g.messages[0]?.content || "No messages yet"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="hidden md:flex" />

        <ResizablePanel
          defaultSize={defaultLayout?.[1] ?? 70}
          className={`flex-1 flex-col bg-background h-full relative ${selectedData ? 'flex' : 'hidden md:flex'}`}
        >
          {selectedData ? (
            selectedData.isGroup ? (
              <GroupChatView group={selectedData} currentUserId={currentUserId} currentUserProfile={currentUserProfile} />
            ) : (
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex justify-between items-center bg-background z-10 shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push('/messages')}
                      className="md:hidden p-1.5 -ml-2 rounded-md hover:bg-accent text-muted-foreground"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div>
                      <UserCardTrigger userId={selectedData.otherUser.id}>
                        <div className="group cursor-pointer">
                          <h2
                            className="text-[18px] md:text-[20px] font-medium tracking-[-0.32px] transition-colors hover:opacity-80"
                            style={{ color: selectedData.otherUser.equippedUsernameColor || 'inherit' }}
                          >
                            {selectedData.otherUser.name} {selectedData.otherUser.surname}
                          </h2>
                          <p className="text-[11px] md:text-[12px] mt-0.5 tracking-wider transition-colors text-muted-foreground">
                            @<span style={{ color: selectedData.otherUser.equippedUsernameColor || getKarmaTierColor(selectedData.otherUser.karmaPoints) || undefined }}>{selectedData.otherUser.username}</span>
                            <b className="ml-1" style={{ color: selectedData.otherUser.equippedUsernameColor || '#3b82f6' }}> {selectedData.otherUser.role.toUpperCase()} </b>
                          </p>
                        </div>
                      </UserCardTrigger>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedData?.otherUser?.isBlockedByMe ? (
                      <button
                        onClick={() => setShowUnblockDialog(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${shadowBorder} bg-background text-[13px] font-medium text-foreground hover:bg-accent transition-colors`}
                        title="Unblock user"
                      >
                        <Ban className="size-3.5" />
                        Unblock
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBlockDialog(true)}
                        disabled={!!selectedData?.otherUser?.hasBlockedMe}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${shadowBorder} bg-background text-[13px] font-medium ${
                          selectedData?.otherUser?.hasBlockedMe ? "text-muted-foreground opacity-70 cursor-not-allowed" : "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        } transition-colors`}
                        title={selectedData?.otherUser?.hasBlockedMe ? "You can't block/unblock from here (they blocked you)" : "Block user"}
                      >
                        <Ban className="size-3.5" />
                        Block
                      </button>
                    )}
                    <button
                      onClick={handleToggleStatus}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${shadowBorder} bg-background text-[13px] font-medium text-foreground hover:bg-accent transition-colors`}
                    >
                      {selectedData.isClosed ? (
                        <>
                          <Unlock className="size-3.5" />
                          Reopen Chat
                        </>
                      ) : (
                        <>
                          <Lock className="size-3.5" />
                          Close Chat
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className={`p-1.5 rounded-md ${shadowBorder} bg-background text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors`}
                      title="Delete Conversation"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Block {selectedData.otherUser.name}?</DialogTitle>
                      <DialogDescription className="pt-2">
                        They won’t be able to message you, and you won’t be able to message them. You can’t undo this from the chat screen right now.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                      <button
                        onClick={() => setShowBlockDialog(false)}
                        className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBlockUser}
                        disabled={isBlocking}
                        className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isBlocking ? "Blocking..." : "Block user"}
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Unblock {selectedData.otherUser.name}?</DialogTitle>
                      <DialogDescription className="pt-2">
                        You’ll be able to message each other again (unless the conversation is still closed).
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                      <button
                        onClick={() => setShowUnblockDialog(false)}
                        className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUnblockUser}
                        disabled={isUnblocking}
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isUnblocking ? "Unblocking..." : "Unblock user"}
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Delete Conversation?</DialogTitle>
                      <DialogDescription className="pt-2">
                        This will permanently remove the chat history with {selectedData.otherUser.name}. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                      <button
                        onClick={() => setShowDeleteDialog(false)}
                        className="px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteConversation}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? "Deleting..." : "Delete Permanently"}
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div
                  ref={scrollerRef}
                  onScroll={updateIsNearBottom}
                  className="flex-1 overflow-y-auto p-6 space-y-6 bg-background flex flex-col no-scrollbar"
                >
                  {(selectedData.otherUser?.isBlockedByMe || selectedData.otherUser?.hasBlockedMe) && (
                    <div className="rounded-lg border border-border bg-background p-4 text-[13px] text-muted-foreground">
                      {selectedData.otherUser?.isBlockedByMe
                        ? "You blocked this user. Messaging is disabled."
                        : "You can’t message this user. Messaging is disabled."}
                    </div>
                  )}
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
                          {msg.senderId === currentUserId && (
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
                          username={isMe ? (user?.username || currentUserId) : (selectedData.otherUser?.username || msg.senderId)}
                          userId={isMe ? currentUserId : selectedData.otherUser?.id}
                          displayName={isMe ? `${user?.firstName} ${user?.lastName}`.trim() : `${selectedData.otherUser?.name} ${selectedData.otherUser?.surname}`.trim()}
                          avatar={isMe ? user?.imageUrl : selectedData.otherUser?.avatar}
                          customAvatar={isMe ? currentUserProfile?.customAvatar : selectedData.otherUser?.customAvatar}
                          equippedColor={isMe ? currentUserProfile?.equippedUsernameColor : selectedData.otherUser?.equippedUsernameColor}
                          equippedNameplate={isMe ? currentUserProfile?.equippedNameplate : selectedData.otherUser?.equippedNameplate}
                          karmaPoints={isMe ? 0 : (selectedData.otherUser?.karmaPoints || 0)}
                          streak={isMe ? 0 : (selectedData.otherUser?.currentStreak || 0)}
                          roleBadge={isMe ? null : (selectedData.otherUser?.role && selectedData.otherUser?.role !== "student" ? selectedData.otherUser?.role : null)}
                          timestamp={new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        >
                          <div className="flex flex-col gap-1 w-full mt-1">
                            {msg.replyTo && (() => {
                              const isReplyFromMe = msg.replyTo.senderId === currentUserId;
                              const replyUsername = isReplyFromMe
                                ? (user?.username ?? "you")
                                : (selectedData.otherUser?.username ?? "?");
                              const replyAvatar = isReplyFromMe
                                ? user?.imageUrl
                                : selectedData.otherUser?.avatar;
                              return (
                                <div className="flex items-center gap-1 mb-1 min-w-0">
                                  <div className="shrink-0 flex items-center" style={{ width: 32, marginLeft: -2 }}>
                                    <svg width="32" height="18" viewBox="0 0 32 18" fill="none" aria-hidden>
                                      <path
                                        d="M4 0 C4 9 4 14 28 14"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        fill="none"
                                        className="text-muted-foreground/40"
                                      />
                                    </svg>
                                  </div>
                                  <div className="relative w-4 h-4 rounded-full overflow-hidden bg-muted shrink-0">
                                    {replyAvatar
                                      ? <img src={replyAvatar} alt={replyUsername} className="w-full h-full object-cover" />
                                      : <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-muted-foreground">{replyUsername[0]?.toUpperCase()}</span>
                                    }
                                  </div>
                                  <span className="text-[11px] font-semibold text-foreground/60 shrink-0 hover:text-foreground/90 cursor-pointer">
                                    @{replyUsername}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate max-w-[240px] cursor-pointer hover:text-foreground/80">
                                    {msg.replyTo.content}
                                  </span>
                                </div>
                              );
                            })()}
                            {msg.poll ? (
                              <PollMessage
                                poll={msg.poll}
                                currentUserId={currentUserId}
                                isOwnMessage={isMe}
                                getVoterLabel={(uid) => {
                                  if (uid === currentUserId) return "You";
                                  return selectedData.otherUser?.username || uid;
                                }}
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
                                {Object.entries(reactionsByEmoji).map(([emoji, reacts]: [string, any]) => {
                                  const hasReacted = reacts.some((r: any) => r.userId === currentUserId);
                                  return (
                                    <button
                                      key={emoji}
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
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </ChatMessageHeader>
                      </div>

                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {!selectedData.isClosed && !selectedData.otherUser?.isBlockedByMe && !selectedData.otherUser?.hasBlockedMe ? (
                  <div className="p-2 bg-background border-t border-border shrink-0 relative">
                    {replyToMessage && (
                      <div className="mb-0 flex items-stretch gap-2 px-3 pt-2 pb-1.5 rounded-t-md bg-muted/50 border border-border border-b-0">
                        <div className="w-[3px] rounded-full bg-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-blue-400 mb-0.5">
                            Replying to <span className="font-bold">@{replyToMessage.senderId === currentUserId ? user?.username : selectedData.otherUser?.username}</span>
                          </p>
                          <p className="text-[12px] text-muted-foreground truncate">{replyToMessage.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyToMessage(null)}
                          className="self-start mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <RichMessageInput
                      placeholder="Type a message..."
                      onSubmit={handleSendMessage}
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
                            if (!selectedData?.id) return;
                            await sendDirectCommandMessage(
                              selectedData.id,
                              "Open Support Tickets",
                              "/support",
                              replyToMessage?.id
                            );
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
                ) : (
                  <div className="p-4 bg-background border-t border-border shrink-0 text-center">
                    <p className="text-[13px] text-muted-foreground">
                      {selectedData.isClosed
                        ? `This conversation was closed by ${selectedData.closedBy === currentUserId ? "you" : "the other user"}.`
                        : "Messaging is disabled."}
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <p className="text-[14px] text-muted-foreground">Select a conversation or group to start chatting.</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      <Sheet open={isCreating} onOpenChange={setIsCreating}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-none shadow-2xl">
          <SheetHeader className="p-6 text-left">
            <SheetTitle className="text-[20px] font-semibold tracking-tight">New Conversation</SheetTitle>
          </SheetHeader>

          <div className="flex-1 p-6 space-y-6">
            {!foundUser ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest">Access Code</label>
                  <input
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter user's access code..."
                    className="w-full h-11 px-4 rounded-md text-[14px] text-foreground bg-background outline-none shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] focus:shadow-[0_0_0_2px_#171717] dark:focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8)] transition-shadow"
                  />
                  {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
                </div>
                <button
                  type="submit"
                  disabled={verifying || !accessCode}
                  className="w-full h-11 bg-primary text-primary-foreground rounded-md text-[14px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "Verify Code"}
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="size-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="size-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-foreground" style={{ color: foundUser.equippedUsernameColor || 'inherit' }}>{foundUser.name} {foundUser.surname}</h3>
                  <p className="text-[14px] text-muted-foreground mt-1">
                    @<span style={{ color: foundUser.equippedUsernameColor || getKarmaTierColor(foundUser.karmaPoints) || undefined }}>{foundUser.username}</span>
                    <b className="ml-1" style={{ color: foundUser.equippedUsernameColor || '#3b82f6' }}>  {foundUser.role.toUpperCase()}</b>
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setFoundUser(null)}
                    className={`flex-1 h-11 rounded-md text-[14px] font-medium ${shadowBorder} bg-background hover:bg-muted transition-colors`}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleStartChat}
                    className="flex-1 h-11 text-primary-foreground rounded-md text-[14px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    style={{ backgroundColor: foundUser.equippedUsernameColor || 'hsl(var(--primary))' }}
                  >
                    <CheckCircle className="size-4" />
                    Start Chatting
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-muted/40 border border-border">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                To start a new chat, you must have the unique access code of the person you want to talk to. You can find your own code in Settings.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
    </>
  );
}
