"use client";

import { useState, useEffect, useRef } from "react";
import { createPublicTicket, getPublicTicketByCode, guestReplyToPublicTicket, togglePublicTicketMessageReaction, deletePublicTicketMessage } from "@/actions/public-ticket.actions";
import { markPublicTicketMessagesAsRead } from "@/actions/notification.actions";
import { CheckCircle, Search, Send, AlertCircle, UserPlus, KeyRound, AtSign, HelpCircle, Copy, Check, SmilePlus, Smile, Trash2 } from "lucide-react";
import EmojiPicker from "@/components/messages/LazyEmojiPicker";
import { useTheme } from "next-themes";
import RichMessageInput from "@/components/messages/RichMessageInput";
import MarkdownMessage from "@/components/messages/MarkdownMessage";

const TICKET_TYPES = [
  { value: "new_account", label: "Request New Account", icon: UserPlus, description: "Ask admin to create an account for you" },
  { value: "password_reset", label: "Forgot Password / Reset", icon: KeyRound, description: "Can't sign in to your account" },
  { value: "username_change", label: "Username Change", icon: AtSign, description: "Request a username update" },
  { value: "other", label: "Other / General", icon: HelpCircle, description: "Any other support request" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
  RESOLVED: { label: "Resolved", color: "text-green-600 dark:text-green-400 bg-green-500/10" },
  CLOSED: { label: "Closed", color: "text-muted-foreground bg-muted" },
};

const ROLES = ["student", "teacher", "parent"];

type Ticket = {
  id: number;
  code: string;
  type: string;
  subject: string;
  status: string;
  createdAt: Date;
  submitterUserId: string | null;
  messages: {
    id: number;
    content: string;
    createdAt: Date;
    isAdminReply: boolean;
    reactions: { id: number; emoji: string; userId: string }[];
    replyTo?: { id: number; content: string } | null;
  }[];
} | null;

export default function PublicTicketsPage() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<"submit" | "check">("submit");

  const [type, setType] = useState("other");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [desiredUsername, setDesiredUsername] = useState("");
  const [desiredRole, setDesiredRole] = useState("student");
  const [contactEmail, setContactEmail] = useState("");
  const [userAccessCode, setUserAccessCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [lookupCode, setLookupCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [ticket, setTicket] = useState<Ticket>(null);
  const [lookupError, setLookupError] = useState("");
  const [reactionMessageId, setReactionMessageId] = useState<number | null>(null);
  const reactionEmojiRef = useRef<HTMLDivElement>(null);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const inputEmojiRef = useRef<HTMLDivElement>(null);
  const [emojiToken, setEmojiToken] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<any | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await createPublicTicket({
        type,
        subject,
        description,
        desiredUsername: type === "new_account" ? desiredUsername : undefined,
        desiredRole: type === "new_account" ? desiredRole : undefined,
        contactEmail: contactEmail || undefined,
        userAccessCode: userAccessCode || undefined,
      });
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupCode.trim()) return;
    setChecking(true);
    setLookupError("");
    setTicket(null);
    try {
      const t = await getPublicTicketByCode(lookupCode.trim());
      if (!t) setLookupError("No ticket found with that code. Please double-check and try again.");
      else {
        setTicket(t as any);
        markPublicTicketMessagesAsRead(t.id);
      }
    } finally {
      setChecking(false);
    }
  }

  async function handleReaction(messageId: number, emoji: string) {
    if (!ticket) return;
    const currentUserId = ticket.submitterUserId || "guest";
    try {
      await togglePublicTicketMessageReaction(messageId, emoji, currentUserId);
      setReactionMessageId(null);
      const t = await getPublicTicketByCode(ticket.code);
      if (t) setTicket(t as any);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteMessage(messageId: number) {
    if (!ticket) return;
    await deletePublicTicketMessage(messageId, ticket.code);
    const t = await getPublicTicketByCode(ticket.code);
    if (t) setTicket(t as any);
  }

  const AVAILABLE_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮"];

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit a request or check your existing ticket status no account required.
        </p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("submit")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "submit" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Submit a Ticket
        </button>
        <button
          onClick={() => setTab("check")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "check" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Check Ticket Status
        </button>
      </div>

      {tab === "submit" && (
        <>
          {result ? (
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-5 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Ticket Submitted!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Save your reference code to check the status or receive admin replies.
                </p>
              </div>
              <div className="bg-muted rounded-xl px-6 py-4 flex flex-col gap-2 w-full">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Reference Code</p>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm font-mono font-bold text-foreground break-all">{result.code}</code>
                  <button onClick={() => copyCode(result.code)} className="shrink-0 p-1.5 rounded-md hover:bg-border transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setResult(null); setSubject(""); setDescription(""); setUserAccessCode(""); setDesiredUsername(""); setContactEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Submit another ticket
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
              <div>
                <label className="text-sm font-medium mb-3 block">Ticket Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TICKET_TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setType(t.value)}
                        className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${type === t.value ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card/50 hover:border-primary/40"}`}
                      >
                        <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${type === t.value ? "text-primary" : "text-muted-foreground"}`} />
                        <div>
                          <p className={`text-sm font-medium ${type === t.value ? "text-foreground" : "text-muted-foreground"}`}>{t.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {type === "new_account" && (
                <div className="bg-muted/50 border border-border rounded-xl p-4 flex flex-col gap-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">New Account Details</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Desired Username</label>
                    <input
                      type="text"
                      value={desiredUsername}
                      onChange={(e) => setDesiredUsername(e.target.value)}
                      placeholder="e.g. john_smith"
                      className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Role</label>
                    <select
                      value={desiredRole}
                      onChange={(e) => setDesiredRole(e.target.value)}
                      className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30 capitalize"
                    >
                      {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your request"
                  className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Description <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue or request in detail..."
                  className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-foreground/30 resize-none"
                />
              </div>

              <div className="border border-border rounded-xl p-4 flex flex-col gap-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Optional Link Your Account</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Your Access Code <span className="text-muted-foreground font-normal">(from Settings page if you have an account)</span></label>
                  <input
                    type="text"
                    value={userAccessCode}
                    onChange={(e) => setUserAccessCode(e.target.value)}
                    placeholder="e.g. ABC12345"
                    className="bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Contact Email <span className="text-muted-foreground font-normal">(so admin can reach you)</span></label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-card border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !subject.trim() || !description.trim()}
                className="flex items-center gap-2 self-start bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50 hover:opacity-90"
              >
                {submitting ? <span className="animate-spin w-4 h-4 border-2 border-background/40 border-t-background rounded-full" /> : <Send className="w-4 h-4" />}
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          )}
        </>
      )}

      {tab === "check" && (
        <div className="flex flex-col gap-6 max-w-2xl">
          <form onSubmit={handleCheck} className="flex gap-2">
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="Enter your reference code..."
              className="flex-1 bg-card border border-border rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:ring-1 focus:ring-foreground/30"
            />
            <button
              type="submit"
              disabled={checking || !lookupCode.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            >
              {checking ? <span className="animate-spin w-4 h-4 border-2 border-background/40 border-t-background rounded-full" /> : <Search className="w-4 h-4" />}
              {checking ? "Searching..." : "Look Up"}
            </button>
          </form>

          {lookupError && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {lookupError}
            </div>
          )}

          {ticket && (
            <div className="flex flex-col gap-6 w-full">
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-bold text-lg tracking-tight">{ticket.subject}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {TICKET_TYPES.find((t) => t.value === ticket.type)?.label}  {new Date(ticket.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${STATUS_MAP[ticket.status]?.color}`}>
                    {STATUS_MAP[ticket.status]?.label}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Conversation Thread</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="flex flex-col gap-4">
                  {ticket.messages.map((msg) => {
                    const isAdmin = msg.isAdminReply;
                    const reactionsByEmoji = (msg.reactions || []).reduce((acc, r) => {
                      if (!acc[r.emoji]) acc[r.emoji] = [];
                      acc[r.emoji].push(r);
                      return acc;
                    }, {} as Record<string, typeof msg.reactions>);

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col gap-1.5 max-w-[85%] ${isAdmin ? "self-start items-start" : "self-end items-end"}`}
                      >
                        <div className={`flex items-center gap-2 px-1 ${isAdmin ? "" : "flex-row-reverse"}`}>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                            {isAdmin ? "Admin" : "You"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40"></span>
                          <span className="text-[10px] text-muted-foreground/40 font-medium">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          onDoubleClick={() => setReplyToMessage(msg)}
                          className={`group relative p-4 rounded-2xl text-[14px] leading-relaxed transition-all cursor-pointer ${isAdmin
                          ? "bg-muted/30 text-foreground rounded-tl-sm border border-border"
                          : "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
                          }`}
                        >
                          {msg.replyTo && (
                            <div className="mb-2 px-2 py-1 rounded-md border border-border/40 bg-background/40 text-[11px] text-muted-foreground">
                              Replying to: {msg.replyTo.content}
                            </div>
                          )}
                          <MarkdownMessage content={msg.content} />

                          <div className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 p-1 bg-card border border-border rounded-lg shadow-xl -mt-8 ${isAdmin ? "left-0" : "right-0"}`}>
                            {AVAILABLE_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg.id, emoji)}
                                className="hover:scale-125 transition-transform p-1 rounded hover:bg-muted text-[14px]"
                              >
                                {emoji}
                              </button>
                            ))}
                            <div className="w-[1px] h-4 bg-border mx-0.5" />
                            <button
                              onClick={() => setReactionMessageId(reactionMessageId === msg.id ? null : msg.id)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <SmilePlus className="w-4 h-4" />
                            </button>
                          {!isAdmin && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded hover:bg-red-50 text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          </div>

                          {reactionMessageId === msg.id && (
                            <div ref={reactionEmojiRef} className={`absolute z-50 ${isAdmin ? "left-0" : "right-0"} top-4`}>
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
                          <div className={`flex flex-wrap gap-1 mt-1 ${isAdmin ? "justify-start" : "justify-end"}`}>
                            {Object.entries(reactionsByEmoji).map(([emoji, reacts]) => {
                              const currentUserId = ticket.submitterUserId || "guest";
                              const hasReacted = reacts.some(r => r.userId === currentUserId);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] border transition-all ${hasReacted
                                    ? "bg-primary text-primary-foreground border-transparent"
                                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold">{reacts.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {ticket.status === "OPEN" ? (
                <div className="mt-4 pt-6 border-t border-border relative">
                  {showInputEmoji && (
                    <div ref={inputEmojiRef} className="absolute bottom-full mb-2 right-0 z-50">
                      <EmojiPicker
                        onEmojiClick={(emojiData) => setEmojiToken(emojiData.emoji)}
                        width={300}
                        height={400}
                        theme={theme === 'dark' ? "dark" : "light"}
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Send a reply</label>
                    {replyToMessage && (
                      <div className="px-3 py-2 rounded-md border border-border bg-muted/40 text-[12px] text-muted-foreground flex items-center justify-between gap-2">
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
                    <div className="p-4 bg-background border border-border rounded-2xl shrink-0 relative">
                      <div className="mb-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowInputEmoji(!showInputEmoji)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Smile className="size-5" />
                        </button>
                      </div>
                      <RichMessageInput
                        placeholder="Type a message..."
                        appendTextToken={emojiToken}
                        onSubmit={async (content) => {
                          if (!ticket || !content.trim()) return;
                          await guestReplyToPublicTicket(ticket.code, content, replyToMessage?.id);
                          setReplyToMessage(null);
                          const updated = await getPublicTicketByCode(ticket.code);
                          if (updated) setTicket(updated as any);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 p-8 rounded-3xl bg-muted/20 border border-dashed border-border/50 text-center">
                  <p className="text-sm text-muted-foreground font-medium">This ticket has been resolved or closed. Thank you!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
