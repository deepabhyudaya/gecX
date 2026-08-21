"use client";

import { replyToPublicTicket, updatePublicTicketStatus, togglePublicTicketMessageReaction, deletePublicTicketMessage } from "@/actions/public-ticket.actions";
import { markPublicTicketMessagesAsRead } from "@/actions/notification.actions";
import { Send, CheckCircle, XCircle, User as UserIcon, ChevronRight, UserPlus, KeyRound, AtSign, HelpCircle, Copy, Check, SmilePlus, Smile, Hash, Trash2 } from "lucide-react";
import EmojiPicker from "@/components/messages/LazyEmojiPicker";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type PublicTicket = {
  id: number;
  code: string;
  type: string;
  subject: string;
  status: string;
  createdAt: Date;
  contactEmail?: string | null;
  desiredUsername?: string | null;
  desiredRole?: string | null;
  submitterRole?: string | null;
  messages: {
    id: number;
    content: string;
    createdAt: Date;
    isAdminReply: boolean;
    senderRole: string;
    reactions: { id: number; emoji: string; userId: string }[];
    replyTo?: { id: number; content: string } | null;
  }[];
};

const TICKET_TYPE_MAP: Record<string, { label: string; icon: React.ReactNode }> = {
  new_account: { label: "New Account", icon: <UserPlus className="w-3.5 h-3.5" /> },
  password_reset: { label: "Password Reset", icon: <KeyRound className="w-3.5 h-3.5" /> },
  username_change: { label: "Username Change", icon: <AtSign className="w-3.5 h-3.5" /> },
  other: { label: "Other", icon: <HelpCircle className="w-3.5 h-3.5" /> },
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  RESOLVED: "text-green-600 dark:text-green-400 bg-green-500/10",
  CLOSED: "text-muted-foreground bg-muted",
};

export function PublicTicketAdminView({
  tickets,
  currentUserId
}: {
  tickets: PublicTicket[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [localTickets, setLocalTickets] = useState<PublicTicket[]>(tickets);
  const [localSelected, setLocalSelected] = useState<PublicTicket | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [reactionMessageId, setReactionMessageId] = useState<number | null>(null);
  const reactionEmojiRef = useRef<HTMLDivElement>(null);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const inputEmojiRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputEmojiRef.current && !inputEmojiRef.current.contains(event.target as Node)) {
        setShowInputEmoji(false);
      }
      if (reactionEmojiRef.current && !reactionEmojiRef.current.contains(event.target as Node)) {
        setReactionMessageId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectTicket(t: PublicTicket) {
    setLocalSelected(localTickets.find((lt) => lt.id === t.id) || t);
    setReply("");
    markPublicTicketMessagesAsRead(t.id).then(() => router.refresh());
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!localSelected || !reply.trim()) return;
    setSending(true);
    try {
      await replyToPublicTicket(localSelected.id, reply.trim(), replyToMessage?.id);
      const newMsg = {
        id: Date.now(),
        content: reply.trim(),
        createdAt: new Date(),
        isAdminReply: true,
        senderRole: "admin",
        reactions: [],
        replyTo: replyToMessage ? { id: replyToMessage.id, content: replyToMessage.content } : undefined,
      };
      const updated = { ...localSelected, messages: [...localSelected.messages, newMsg] };
      setLocalSelected(updated);
      setLocalTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setReply("");
      setReplyToMessage(null);
      queueMicrotask(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }));
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: "OPEN" | "RESOLVED" | "CLOSED") {
    if (!localSelected) return;
    await updatePublicTicketStatus(localSelected.id, status);
    const updated = { ...localSelected, status };
    setLocalSelected(updated);
    setLocalTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleReaction(messageId: number, emoji: string) {
    try {
      await togglePublicTicketMessageReaction(messageId, emoji, currentUserId);
      setReactionMessageId(null);
      if (localSelected) {
        const updatedMessages = localSelected.messages.map(m => {
          if (m.id === messageId) {
            const existing = m.reactions.find(r => r.userId === currentUserId && r.emoji === emoji);
            if (existing) {
              return { ...m, reactions: m.reactions.filter(r => r.id !== existing.id) };
            } else {
              return { ...m, reactions: [...m.reactions, { id: Date.now(), emoji, userId: currentUserId }] };
            }
          }
          return m;
        });
        const updated = { ...localSelected, messages: updatedMessages };
        setLocalSelected(updated);
        setLocalTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteMessage(messageId: number) {
    await deletePublicTicketMessage(messageId);
    if (localSelected) {
      const updated = {
        ...localSelected,
        messages: localSelected.messages.filter((m) => m.id !== messageId),
      };
      setLocalSelected(updated);
      setLocalTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
  }

  const AVAILABLE_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮"];

  const shadowBorder = "shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px]";
  const shadowCard = "shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px,rgba(0,0,0,0.2)_0px_2px_2px]";

  const onLayout = (sizes: number[]) => {
    document.cookie = `react-resizable-panels:public-tickets-layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className={`w-full h-full rounded-lg ${shadowBorder} bg-background overflow-hidden flex flex-col md:flex-row`}
      onLayout={onLayout}
    >
      <ResizablePanel
        defaultSize={33}
        minSize={20}
        maxSize={45}
        className={`flex-col ${shadowBorder} z-10 bg-background ${localSelected ? 'hidden md:flex' : 'flex'} h-full`}
      >
        <div className="p-4 border-b border-border bg-background shrink-0">
          <h2 className="text-[16px] font-semibold tracking-[-0.32px] text-foreground">Public Tickets</h2>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
          {localTickets.length === 0 && (
            <p className="text-muted-foreground text-sm p-4 text-center">No public tickets yet.</p>
          )}
          {localTickets.map((t) => {
            const typeInfo = TICKET_TYPE_MAP[t.type] || TICKET_TYPE_MAP.other;
            const isActive = localSelected?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => selectTicket(t)}
                className={`p-3 rounded-md cursor-pointer transition-colors ${isActive
                  ? "bg-background shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] dark:shadow-[0px_0px_0px_1px_rgba(255,255,255,0.1)]"
                  : "hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                      <span className="opacity-70">{typeInfo.icon}</span>
                      <span>{typeInfo.label}</span>
                    </div>
                    <h3 className="font-medium text-[13px] text-foreground line-clamp-1">
                      {t.subject}
                    </h3>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[t.status]}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {t.messages?.[0]?.content || t.subject}
                </p>
              </div>
            );
          })}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="hidden md:flex" />

      <ResizablePanel
        defaultSize={67}
        className={`flex-1 flex-col bg-background h-full relative ${localSelected ? 'flex' : 'hidden md:flex'}`}
      >
        {!localSelected ? (
          <div className="flex-1 flex items-center justify-center bg-background">
            <p className="text-[14px] text-muted-foreground">Select a ticket from the sidebar to view the conversation.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex justify-between items-center bg-background z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setLocalSelected(null)}
                  className="md:hidden p-1.5 -ml-2 rounded-md hover:bg-accent text-muted-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <div className="min-w-0">
                  <h2 className="text-[18px] md:text-[20px] font-semibold tracking-[-0.32px] text-foreground truncate">{localSelected.subject}</h2>
                  <p className="text-[11px] md:text-[12px] text-muted-foreground mt-0.5">
                    Ticket #{localSelected.id}  {new Date(localSelected.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyCode(localSelected.code)}
                  className={`p-1.5 rounded-md ${shadowBorder} bg-background hover:bg-muted transition-colors`}
                  title="Copy reference code"
                >
                  {copied === localSelected.code ? <Check className="size-4 text-green-500" /> : <Copy className="size-4 text-muted-foreground" />}
                </button>
                <div className="flex items-center gap-1">
                  {localSelected.status !== "RESOLVED" && (
                    <button
                      onClick={() => handleStatusChange("RESOLVED")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${shadowBorder} bg-background text-[13px] font-medium text-foreground hover:bg-accent transition-colors`}
                      title="Resolve"
                    >
                      <CheckCircle className="size-3.5" />
                      Resolve
                    </button>
                  )}
                  {localSelected.status !== "CLOSED" && (
                    <button
                      onClick={() => handleStatusChange("CLOSED")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${shadowBorder} bg-background text-[13px] font-medium text-foreground hover:bg-accent transition-colors`}
                      title="Close"
                    >
                      <XCircle className="size-3.5" />
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background flex flex-col no-scrollbar">
              {localSelected.messages?.map((msg) => {
                const isMe = msg.isAdminReply;
                const reactionsByEmoji = (msg.reactions || []).reduce((acc: any, r: any) => {
                  if (!acc[r.emoji]) acc[r.emoji] = [];
                  acc[r.emoji].push(r);
                  return acc;
                }, {});

                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse self-end" : "flex-row self-start"} w-full max-w-[80%]`}>
                    {!isMe && (
                      <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <UserIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className={`flex-1 flex flex-col ${isMe ? "items-end" : "items-start"} min-w-0`}>
                      <div
                        onDoubleClick={() => setReplyToMessage(msg)}
                        className={`group relative p-3.5 rounded-xl text-[14px] cursor-pointer ${shadowCard} ${isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card text-card-foreground rounded-tl-sm"
                        }`}
                      >
                        {msg.replyTo && (
                          <div className="mb-2 px-2 py-1 rounded-md border border-border/40 bg-background/40 text-[11px] text-muted-foreground">
                            Replying to: {msg.replyTo.content}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>

                        <div className={`absolute top-[-16px] ${isMe ? "right-0" : "left-0"} flex items-center p-1 rounded-full bg-card shadow-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity z-10 gap-1`}>
                          {AVAILABLE_EMOJIS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="w-7 h-7 flex items-center justify-center text-[14px] hover:bg-muted rounded-full transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                          <div className="w-[1px] h-4 bg-border mx-0.5" />
                          <button
                            onClick={() => setReactionMessageId(reactionMessageId === msg.id ? null : msg.id)}
                            className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                          >
                            <SmilePlus className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        {reactionMessageId === msg.id && (
                          <div ref={reactionEmojiRef} className={`absolute z-50 ${isMe ? "right-0" : "left-0"} top-6`}>
                            <EmojiPicker
                              onEmojiClick={(emojiData) => handleReaction(msg.id, emojiData.emoji)}
                              width={280}
                              height={350}
                              theme={theme === 'dark' ? "dark" : "light"}
                            />
                          </div>
                        )}
                      </div>

                      {Object.keys(reactionsByEmoji).length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                          {Object.entries(reactionsByEmoji).map(([emoji, reacts]: [string, any]) => {
                            const hasReacted = reacts.some((r: any) => r.userId === currentUserId);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] border ${hasReacted
                                  ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                                  : "bg-card border-border text-muted-foreground hover:bg-muted"
                                  }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-medium">{reacts.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-1.5 text-[11px] text-muted-foreground font-mono px-1">
                        {isMe ? "Admin" : msg.senderRole}  {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {localSelected.status !== "CLOSED" ? (
              <div className="p-4 bg-background border-t border-border shrink-0 relative">
                {showInputEmoji && (
                  <div ref={inputEmojiRef} className="absolute bottom-full mb-2 right-4 z-50">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => setReply((prev) => prev + emojiData.emoji)}
                      width={300}
                      height={400}
                      theme={theme === 'dark' ? "dark" : "light"}
                    />
                  </div>
                )}
                {replyToMessage && (
                  <div className="mb-2 px-3 py-2 rounded-md border border-border bg-muted/40 text-[12px] text-muted-foreground flex items-center justify-between gap-2">
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
                <form onSubmit={handleReply} className="flex gap-2 relative">
                  <button
                    type="button"
                    onClick={() => setShowInputEmoji(!showInputEmoji)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Smile className="size-5" />
                  </button>
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={localSelected.status === "CLOSED" ? "This ticket is closed" : "Type a reply..."}
                    disabled={localSelected.status === "CLOSED"}
                    className="flex-1 h-11 pl-10 pr-4 rounded-md text-[14px] text-foreground bg-background outline-none shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] focus:shadow-[0_0_0_2px_#171717] dark:focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8)] transition-shadow disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={sending || !reply.trim() || localSelected.status === "CLOSED"}
                    className="h-11 w-11 flex items-center justify-center bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                  >
                    <Send className="size-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-4 bg-background border-t border-border shrink-0 text-center">
                <p className="text-[13px] text-muted-foreground">This ticket has been closed.</p>
              </div>
            )}
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
