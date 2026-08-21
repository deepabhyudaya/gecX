"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { sendMessage, toggleReaction, createTicket, closeTicket, deleteTicketMessage, getTicketMessages } from "@/actions/support.actions";
import { markSupportTicketMessagesAsRead } from "@/actions/notification.actions";
import { Send, CheckCircle, PlusCircle, User as UserIcon, X, SmilePlus, Smile, Trash2, Calendar, AlertCircle, BookOpen, Clock, HelpCircle } from "lucide-react";
import EmojiPicker from "@/components/messages/LazyEmojiPicker";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";
import RichMessageInput from "@/components/messages/RichMessageInput";
import MarkdownMessage from "@/components/messages/MarkdownMessage";
import { ChatMessageHeader } from "@/components/messages/ChatMessageHeader";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type Ticket = any;
type TicketMessage = any;

const TICKET_CATEGORIES = [
  { value: "leave_request", label: "Leave Request", icon: Calendar, description: "Request time off or leave" },
  { value: "technical_issue", label: "Technical Issue", icon: AlertCircle, description: "Report a technical problem" },
  { value: "grade_dispute", label: "Grade/Marks Issues", icon: BookOpen, description: "Discuss exam grade or marks concerns" },
  { value: "schedule_change", label: "Schedule Change", icon: Clock, description: "Request schedule modifications" },
  { value: "other", label: "Other / General", icon: HelpCircle, description: "Any other support request" },
];

interface SupportChatClientProps {
  tickets: Ticket[];
  selectedTicketData: Ticket | null;
  currentUserId: string;
  currentUserRole: string;
  defaultLayout?: number[];
}

export default function SupportChatClient({
  tickets,
  selectedTicketData,
  currentUserId,
  currentUserRole,
  defaultLayout,
}: SupportChatClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [newCategory, setNewCategory] = useState("other");
  const [newSubject, setNewSubject] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [reactionMessageId, setReactionMessageId] = useState<number | null>(null);
  const reactionEmojiRef = useRef<HTMLDivElement>(null);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
  const [localMessages, setLocalMessages] = useState<any[]>(selectedTicketData?.messages ?? []);

  const onLayout = (sizes: number[]) => {
    document.cookie = `react-resizable-panels:support-layout=${JSON.stringify(sizes)}; path=/; max-age=31536000`;
  };

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  useEffect(() => {
    setLocalMessages(selectedTicketData?.messages ?? []);
  }, [selectedTicketData?.id]);

  useEffect(() => {
    if (selectedTicketData?.id) {
      markSupportTicketMessagesAsRead(selectedTicketData.id).then(() => router.refresh());
    }
  }, [selectedTicketData?.id, router]);

  const handleTicketClick = (id: number) => {
    setIsCreating(false);
    router.push(`/support?ticketId=${id}`);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDesc.trim()) return;
    await createTicket(newSubject, newDesc, newCategory);
    setIsCreating(false);
    setNewCategory("other");
    setNewSubject("");
    setNewDesc("");
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !selectedTicketData) return;

    const tempId = `pending-${Date.now()}`;
    const capturedReply = replyToMessage;
    const replyTo = capturedReply
      ? { id: capturedReply.id, content: capturedReply.content, senderId: capturedReply.senderId }
      : null;

    const optimistic: any = {
      id: tempId,
      content,
      senderId: currentUserId,
      senderRole: currentUserRole,
      ticketId: selectedTicketData.id,
      createdAt: new Date().toISOString(),
      messageType: "TEXT",
      commandKey: null,
      commandLabel: null,
      commandUrl: null,
      isRead: false,
      replyToId: capturedReply?.id ?? null,
      replyTo,
      reactions: [],
    };

    setLocalMessages((prev) => [...prev, optimistic]);
    setReplyToMessage(null);

    try {
      const saved = await sendMessage(selectedTicketData.id, content, capturedReply?.id);

      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...saved, reactions: [], replyTo } : m
        )
      );
    } catch (error) {

      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
      console.error("Failed to send message:", error);
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
      await toggleReaction(messageId, emoji);
      if (selectedTicketData?.id) {
        const refreshed = await getTicketMessages(selectedTicketData.id);
        setLocalMessages((refreshed as any).messages ?? []);
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

  const handleDeleteMessage = async (messageId: number) => {
    await deleteTicketMessage(messageId);
    router.refresh();
  };

  const AVAILABLE_EMOJIS = ["👍", "♥️", "🎉", "😭", "🙏"];

  const handleCloseTicket = async () => {
    if (!selectedTicketData) return;
    await closeTicket(selectedTicketData.id);
  };

  const shadowBorder = "shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px]";
  const shadowCard = "shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px,rgba(0,0,0,0.04)_0px_2px_2px,#fafafa_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px,rgba(0,0,0,0.2)_0px_2px_2px]";

  const getCreatorName = (t: any) => {
    if (t.student) return t.student.username;
    if (t.teacher) return t.teacher.username;
    if (t.parent) return t.parent.username;
    return null;
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className={`w-full h-full rounded-lg ${shadowBorder} bg-background overflow-hidden flex flex-col md:flex-row`}
      onLayout={onLayout}
    >
      <ResizablePanel
        defaultSize={defaultLayout?.[0] ?? 33}
        minSize={20}
        maxSize={45}
        className={`flex-col ${shadowBorder} z-10 bg-background ${(selectedTicketData || isCreating) ? 'hidden md:flex' : 'flex'} h-full`}
      >
        <div className="p-4 border-b border-border flex justify-between items-center bg-background shrink-0">
          <h2 className="text-[16px] font-semibold tracking-[-0.32px] text-foreground">Tickets</h2>
          {currentUserRole !== "admin" && (
            <button
              onClick={() => setIsCreating(true)}
              className={`p-1.5 rounded-md ${shadowBorder} bg-background hover:bg-muted transition-colors`}
            >
              <PlusCircle className="size-4 text-foreground" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-2">
          {tickets.length === 0 && (
            <p className="text-muted-foreground text-sm p-4 text-center">No tickets found.</p>
          )}
          {tickets.map((t) => {
            const category = TICKET_CATEGORIES.find(c => c.value === t.category) || TICKET_CATEGORIES[4];
            const Icon = category.icon;
            return (
              <div
                key={t.id}
                onClick={() => handleTicketClick(t.id)}
                className={`p-3 rounded-md cursor-pointer transition-colors ${selectedTicketData?.id === t.id
                  ? "bg-background shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08)] dark:shadow-[0px_0px_0px_1px_rgba(255,255,255,0.1)]"
                  : "hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
                      <span className="opacity-70"><Icon className="w-3.5 h-3.5" /></span>
                      <span>{category.label}</span>
                    </div>
                    <h3 className="font-medium text-[13px] text-foreground line-clamp-1">
                      {t.subject}
                    </h3>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${t.status === "OPEN" ? "text-blue-600 dark:text-blue-400 bg-blue-500/10" :
                    t.status === "CLOSED" ? "text-muted-foreground bg-muted" : "text-green-600 dark:text-green-400 bg-green-500/10"
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {t.messages?.[0]?.content || t.description}
                </p>
              </div>
            );
          })}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="hidden md:flex" />

      <ResizablePanel
        defaultSize={defaultLayout?.[1] ?? 67}
        className={`flex-1 flex-col bg-background h-full relative ${(selectedTicketData || isCreating) ? 'flex' : 'hidden md:flex'}`}
      >
        {isCreating ? (
          <div className="flex-1 flex flex-col p-8 items-center justify-center overflow-y-auto">
            <div className={`w-full max-w-md p-6 rounded-xl bg-card ${shadowCard}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">New Support Ticket</h2>
                <button onClick={() => setIsCreating(false)}>
                  <X className="size-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest">Ticket Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TICKET_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setNewCategory(cat.value)}
                          className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${newCategory === cat.value ? "border-foreground bg-card shadow-sm" : "border-border bg-card/50 hover:border-foreground/40"}`}
                        >
                          <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${newCategory === cat.value ? "text-foreground" : "text-muted-foreground"}`} />
                          <div>
                            <p className={`text-sm font-medium ${newCategory === cat.value ? "text-foreground" : "text-muted-foreground"}`}>{cat.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest">Subject</label>
                  <input
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full h-10 px-3 rounded-md text-[14px] text-foreground bg-background outline-none shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] focus:shadow-[0_0_0_2px_#171717] dark:focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8)] transition-shadow"
                    placeholder="Brief summary of issue"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-widest">Description</label>
                  <textarea
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-md text-[14px] text-foreground bg-background outline-none shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px] focus:shadow-[0_0_0_2px_#171717] dark:focus:shadow-[0_0_0_2px_rgba(255,255,255,0.8)] transition-shadow resize-none"
                    placeholder="Please detail your issue..."
                  />
                </div>
                <button type="submit" className="w-full h-10 bg-primary text-primary-foreground rounded-md text-[14px] font-medium hover:opacity-90 transition-opacity">
                  Submit Ticket
                </button>
              </form>
            </div>
          </div>
        ) : selectedTicketData ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border flex justify-between items-center bg-background z-10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => router.push('/support')}
                  className="md:hidden p-1.5 -ml-2 rounded-md hover:bg-accent text-muted-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <div className="min-w-0">
                  <h2 className="text-[18px] md:text-[20px] font-semibold tracking-[-0.32px] text-foreground truncate">{selectedTicketData.subject}</h2>
                  <p className="text-[11px] md:text-[12px] text-muted-foreground mt-0.5">
                    {currentUserRole === "admin" ? `${getCreatorName(selectedTicketData)}  ` : ""}
                    Ticket #{selectedTicketData.id}  {new Date(selectedTicketData.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
              </div>
              {currentUserRole === "admin" && selectedTicketData.status !== "CLOSED" && (
                <button
                  onClick={handleCloseTicket}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${shadowBorder} bg-background text-[13px] font-medium text-foreground hover:bg-accent transition-colors`}
                >
                  <CheckCircle className="size-3.5" />
                  Close Ticket
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background flex flex-col no-scrollbar">
              {localMessages.map((msg: TicketMessage) => {
                const isMe = msg.senderId === currentUserId;
                const isAdmin = msg.senderRole === "admin";

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
                      {(isMe || currentUserRole === "admin") && (
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
                        <EmojiPicker
                          onEmojiClick={(emojiData) => handleReaction(msg.id, emojiData.emoji)}
                          width={280}
                          height={350}
                          theme={theme === 'dark' ? "dark" : "light"}
                        />
                      </div>
                    )}

                    <ChatMessageHeader
                      username={isAdmin ? "Admin" : getCreatorName(selectedTicketData) || msg.senderId}
                      avatar={(msg as any).senderAvatar || (isMe ? user?.imageUrl : undefined)}
                      customAvatar={(msg as any).senderCustomAvatar || undefined}
                      equippedColor={(msg as any).senderColor}
                      equippedNameplate={(msg as any).senderNameplate}
                      karmaPoints={(msg as any).senderKarma || 0}
                      roleBadge={isAdmin ? "admin" : msg.senderRole}
                      timestamp={new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    >
                      <div className="flex flex-col gap-1 w-full mt-1">
                        {msg.replyTo && (
                          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-6 h-[1px] bg-border/60" />
                            <span className="truncate max-w-[200px]">Replying to: {msg.replyTo.content}</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>

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
                                  <span>{emoji}</span>
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

            {selectedTicketData.status !== "CLOSED" ? (
              <div className="p-2 bg-background border-t border-border shrink-0 relative">
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
                <RichMessageInput
                  placeholder="Type a message..."
                  onSubmit={handleSendMessage}
                  disabled={selectedTicketData.status === "CLOSED"}
                  onSlashCommands={[
                    {
                      id: "close",
                      title: "/close",
                      description: "Close this support ticket",
                      keywords: ["ticket", "resolve", "done"],
                      icon: <CheckCircle className="size-4" />,
                      onSelect: () => {
                        if (currentUserRole === "admin") {
                          void handleCloseTicket();
                        }
                      },
                    },
                  ]}
                />
              </div>
            ) : (
              <div className="p-4 bg-background border-t border-border shrink-0 text-center">
                <p className="text-[13px] text-muted-foreground">This ticket has been closed.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <p className="text-[14px] text-muted-foreground">Select a ticket from the sidebar to view the conversation.</p>
          </div>
        )}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
