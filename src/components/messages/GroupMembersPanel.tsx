"use client";

import { useState, useEffect } from "react";
import { getGroupMembers, kickMember, leaveGroup, toggleMuteMember, addMemberToGroup } from "@/actions/group.actions";
import { updateGroupBanner } from "@/actions/emoji-sticker.actions";
import { verifyAccessCode } from "@/actions/message.actions";
import { Users, Shield, LogOut, X, Copy, Check, MoreVertical, Trash2, MicOff, Mic, Key, PlusCircle, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Member = {
  id: number;
  userId: string;
  userRole: string;
  username: string;
  displayName: string;
  isOwner: boolean;
  isMuted: boolean;
};

export default function GroupMembersPanel({
  group,
  currentUserId
}: {
  group: any;
  currentUserId: string;
}) {
  const [members, setMembers] = useState<Member[]>(group.members || []);
  const [loading, setLoading] = useState(!group.members);

  useEffect(() => {
    if (group.members) {
      setMembers(group.members);
    }
  }, [group.members]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [kickMemberId, setKickMemberId] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifiedUser, setVerifiedUser] = useState<any | null>(null);
  const [addingUser, setAddingUser] = useState(false);
  const [bannerUrl, setBannerUrl] = useState(group.bannerUrl || "");
  const [updatingBanner, setUpdatingBanner] = useState(false);
  const router = useRouter();

  const me = members.find(m => m.userId === currentUserId);
  const isOwner = me?.isOwner || false;

  function copyAccessCode() {
    if (!group.accessCode) return;
    navigator.clipboard.writeText(group.accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  useEffect(() => {
    const load = async () => {
      if (!group.members) {
        try {
          const data = await getGroupMembers(group.id);
          setMembers(data as any);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    };
    load();
  }, [group.id]);

  async function handleKickConfirm() {
    if (!kickMemberId) return;
    try {
      await kickMember(group.id, kickMemberId);
      setMembers(prev => prev.filter(m => m.userId !== kickMemberId));
      setKickMemberId(null);
      router.refresh();
    } catch (e) {
      alert("Failed to kick member");
    }
  }

  function handleKick(userId: string) {
    setKickMemberId(userId);
  }

  async function handleToggleMute(userId: string) {
    try {
      await toggleMuteMember(group.id, userId);
      const refreshed = await getGroupMembers(group.id);
      setMembers(refreshed as any);
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Failed to toggle mute");
    }
  }

  async function handleLeaveConfirm() {
    try {
      await leaveGroup(group.id);
      setLeaveDialogOpen(false);
      router.push("/messages");
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Failed to leave group");
    }
  }

  function handleLeave() {
    setLeaveDialogOpen(true);
  }

  async function handleVerify() {
    if (!accessCode) return;
    setVerifying(true);
    try {
      const user = await verifyAccessCode(accessCode);
      if (user) {
        setVerifiedUser(user);
      } else {
        alert("No user found with this access code.");
      }
    } catch (e) {
      alert("Failed to verify access code.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleAddMember() {
    if (!verifiedUser) return;
    setAddingUser(true);
    try {
      await addMemberToGroup(group.id, verifiedUser.id);
      const data = await getGroupMembers(group.id);
      setMembers(data as any);
      setAddMemberDialogOpen(false);
      setVerifiedUser(null);
      setAccessCode("");
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Failed to add member");
    } finally {
      setAddingUser(false);
    }
  }

  async function handleUpdateBanner() {
    setUpdatingBanner(true);
    try {
      await updateGroupBanner(group.id, bannerUrl);
      alert("Group banner updated successfully!");
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Failed to update banner");
    } finally {
      setUpdatingBanner(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {loading ? (
          <div className="flex justify-center py-10">
            <span className="animate-spin w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0 border border-border/20">
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold truncate text-foreground">{m.displayName}</span>
                      {m.isOwner && <Shield className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      {m.isMuted && <MicOff className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground truncate">@{m.username}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground capitalize border border-border/20 font-medium">
                        {m.userRole}
                      </span>
                    </div>
                  </div>
                </div>

                {isOwner && !m.isOwner && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                    <button
                      onClick={() => handleToggleMute(m.userId)}
                      className={`p-2 rounded-lg transition-all ${m.isMuted ? "text-blue-500 hover:bg-blue-500/10" : "text-muted-foreground hover:bg-muted"}`}
                      title={m.isMuted ? "Unmute Member" : "Mute Member"}
                    >
                      {m.isMuted ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                    </button>
                    <button
                      onClick={() => handleKick(m.userId)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Kick Member"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 border-t border-border/30 bg-muted/5 space-y-3">
        {isOwner && (
          <button
            onClick={() => {
              setAddMemberDialogOpen(true);
              setVerifiedUser(null);
              setAccessCode("");
            }}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-blue-500 hover:bg-blue-500/10 border border-blue-500/10 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            Add Member
          </button>
        )}

        {isOwner && (
          <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border/30 space-y-2">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" />
              Group Banner URL
            </p>
            <div className="flex gap-2">
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-background border border-border rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleUpdateBanner}
                disabled={updatingBanner || bannerUrl === (group.bannerUrl || "")}
                className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {updatingBanner ? "..." : "Save"}
              </button>
            </div>
          </div>
        )}

        {group.accessCode && (
          <div className="bg-muted/50 rounded-xl px-4 py-3 border border-border/30">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Key className="w-3 h-3" />
              Group Access Code
            </p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono font-bold text-foreground tracking-widest">
                {group.accessCode}
              </code>
              <button
                onClick={copyAccessCode}
                className="p-1.5 rounded-lg hover:bg-border transition-colors"
                title="Copy access code"
              >
                {copiedCode
                  ? <Check className="w-4 h-4 text-green-500" />
                  : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        )}
        {!me?.isOwner ? (
          <button
            onClick={handleLeave}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/10 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Leave Group
          </button>
        ) : (
          <p className="text-[11px] text-center text-muted-foreground font-medium">
            You are the group owner.
          </p>
        )}
      </div>

      <Dialog open={!!kickMemberId} onOpenChange={(open) => !open && setKickMemberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kick Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to kick this member from the group? They will no longer have access to this chat.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKickMemberId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleKickConfirm}>Kick Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this group? You will need an access code to join again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeaveConfirm}>Leave Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addMemberDialogOpen} onOpenChange={(open) => !open && setAddMemberDialogOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Enter a user's access code to add them to this group.
            </DialogDescription>
          </DialogHeader>
          {!verifiedUser ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter access code..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddMemberDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleVerify} disabled={verifying || !accessCode}>
                  {verifying ? "Verifying..." : "Verify"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {verifiedUser.name?.[0] || verifiedUser.username[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{verifiedUser.name} {verifiedUser.surname}</p>
                    <p className="text-sm text-muted-foreground">@{verifiedUser.username}</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVerifiedUser(null)}>Back</Button>
                <Button onClick={handleAddMember} disabled={addingUser}>
                  {addingUser ? "Adding..." : "Add to Group"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
