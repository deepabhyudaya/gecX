"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserCheck, UserX, UserPlus, Mail, MessageCircle, Check, X, UserMinus } from "lucide-react";
import { toast } from "react-toastify";
import {
  getFollowRequests,
  getSentFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  cancelFollowRequest,
} from "@/actions/follow-request.actions";
import {
  getDMAccessRequests,
  getSentDMAccessRequests,
  acceptDMAccessRequest,
  declineDMAccessRequest,
  cancelDMAccessRequest,
  revokeDMAccess,
  getDMGrants,
} from "@/actions/dm-access.actions";
import { startConversation } from "@/actions/message.actions";

interface UserInfo {
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

interface FollowRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: string;
  createdAt: Date;
  requester?: UserInfo;
  target?: UserInfo;
}

interface DMAccessRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: string;
  message: string | null;
  createdAt: Date;
  requester?: UserInfo;
  target?: UserInfo;
}

interface DMAccessGrant {
  id: string;
  user1Id: string;
  user2Id: string;
  grantedAt: Date;
  grantedBy: string;
  otherUser?: UserInfo;
}

export default function RequestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("follow");
  const [followSubTab, setFollowSubTab] = useState("incoming");
  const [dmSubTab, setDmSubTab] = useState("incoming");

  const [incomingFollowRequests, setIncomingFollowRequests] = useState<FollowRequest[]>([]);
  const [outgoingFollowRequests, setOutgoingFollowRequests] = useState<FollowRequest[]>([]);
  const [incomingDMRequests, setIncomingDMRequests] = useState<DMAccessRequest[]>([]);
  const [outgoingDMRequests, setOutgoingDMRequests] = useState<DMAccessRequest[]>([]);
  const [dmGrants, setDMGrants] = useState<DMAccessGrant[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        incomingFollow,
        outgoingFollow,
        incomingDM,
        outgoingDM,
        grants,
      ] = await Promise.all([
        getFollowRequests(),
        getSentFollowRequests(),
        getDMAccessRequests(),
        getSentDMAccessRequests(),
        getDMGrants(),
      ]);
      setIncomingFollowRequests(incomingFollow);
      setOutgoingFollowRequests(outgoingFollow);
      setIncomingDMRequests(incomingDM);
      setOutgoingDMRequests(outgoingDM);
      setDMGrants(grants);
    } catch (error) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptFollow = async (requestId: string) => {
    setActionLoading(`accept-follow-${requestId}`);
    try {
      await acceptFollowRequest(requestId);
      toast.success("Follow request accepted");
      await loadData();
      router.refresh();
    } catch (error) {
      toast.error("Failed to accept request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineFollow = async (requestId: string) => {
    setActionLoading(`decline-follow-${requestId}`);
    try {
      await declineFollowRequest(requestId);
      toast.success("Follow request declined");
      await loadData();
      router.refresh();
    } catch (error) {
      toast.error("Failed to decline request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelFollow = async (requestId: string) => {
    setActionLoading(`cancel-follow-${requestId}`);
    try {
      await cancelFollowRequest(requestId);
      toast.success("Follow request cancelled");
      await loadData();
      router.refresh();
    } catch (error) {
      toast.error("Failed to cancel request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptDM = async (requestId: string) => {
    const request = incomingDMRequests.find((r) => r.id === requestId);
    setActionLoading(`accept-dm-${requestId}`);
    try {
      await acceptDMAccessRequest(requestId);
      toast.success("DM request accepted! Opening chat...");
      await loadData();

      if (request?.requester?.userId) {
        try {
          const convId = await startConversation(request.requester.userId);
          router.push(`/messages?convId=${convId}&type=direct`);
        } catch {
          router.refresh();
        }
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to accept request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineDM = async (requestId: string) => {
    setActionLoading(`decline-dm-${requestId}`);
    try {
      await declineDMAccessRequest(requestId);
      toast.success("DM request declined");
      await loadData();
      router.refresh();
    } catch (error) {
      toast.error("Failed to decline request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelDM = async (requestId: string) => {
    setActionLoading(`cancel-dm-${requestId}`);
    try {
      await cancelDMAccessRequest(requestId);
      toast.success("DM request cancelled");
      await loadData();
      router.refresh();
    } catch (error) {
      toast.error("Failed to cancel request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeDM = async (targetUserId: string) => {
    setActionLoading(`revoke-dm-${targetUserId}`);
    try {
      await revokeDMAccess(targetUserId);
      toast.success("DM access revoked");
      await loadData();
      router.refresh();
    } catch (error) {
      toast.error("Failed to revoke access");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessageGrant = async (otherUserId: string) => {
    setActionLoading(`msg-grant-${otherUserId}`);
    try {
      const convId = await startConversation(otherUserId);
      router.push(`/messages?convId=${convId}&type=direct`);
    } catch (error) {
      toast.error("Failed to open chat");
    } finally {
      setActionLoading(null);
    }
  };

  const UserAvatar = ({ user, size = 40 }: { user?: UserInfo; size?: number }) => (
    <div
      className="relative rounded-full overflow-hidden bg-muted flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={user?.avatar || "/noAvatar.png"}
        alt={user?.username || "User"}
        fill
        className="object-cover"
      />
    </div>
  );

  const UserInfo = ({ user }: { user?: UserInfo }) => (
    <div className="flex flex-col min-w-0">
      <Link
        href={`/${user?.username || "#"}`}
        className="font-semibold text-sm truncate hover:underline"
      >
        {user?.displayName || user?.username}
      </Link>
      <span className="text-xs text-muted-foreground truncate">
        @{user?.username}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Requests</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="follow" className="gap-2">
            <UserPlus size={16} />
            Follow Requests
            {incomingFollowRequests.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {incomingFollowRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="dm" className="gap-2">
            <MessageCircle size={16} />
            DM Access
            {incomingDMRequests.length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {incomingDMRequests.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="follow" className="space-y-4">
          <Tabs value={followSubTab} onValueChange={setFollowSubTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="incoming">
                Incoming ({incomingFollowRequests.length})
              </TabsTrigger>
              <TabsTrigger value="outgoing">
                Sent ({outgoingFollowRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming">
              {incomingFollowRequests.length === 0 ? (
                <EmptyState icon={UserCheck} message="No incoming follow requests" />
              ) : (
                <div className="space-y-3">
                  {incomingFollowRequests.map((request) => (
                    <RequestCard key={request.id}>
                      <UserAvatar user={request.requester} />
                      <UserInfo user={request.requester} />
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineFollow(request.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `decline-follow-${request.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptFollow(request.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `accept-follow-${request.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Accept
                        </Button>
                      </div>
                    </RequestCard>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="outgoing">
              {outgoingFollowRequests.length === 0 ? (
                <EmptyState icon={UserPlus} message="No outgoing follow requests" />
              ) : (
                <div className="space-y-3">
                  {outgoingFollowRequests.map((request) => (
                    <RequestCard key={request.id}>
                      <UserAvatar user={request.target} />
                      <UserInfo user={request.target} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelFollow(request.id)}
                        disabled={!!actionLoading}
                        className="ml-auto"
                      >
                        {actionLoading === `cancel-follow-${request.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Cancel
                      </Button>
                    </RequestCard>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="dm" className="space-y-4">
          <Tabs value={dmSubTab} onValueChange={setDmSubTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="incoming">
                Incoming ({incomingDMRequests.length})
              </TabsTrigger>
              <TabsTrigger value="outgoing">
                Sent ({outgoingDMRequests.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({dmGrants.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="incoming">
              {incomingDMRequests.length === 0 ? (
                <EmptyState icon={Mail} message="No incoming DM requests" />
              ) : (
                <div className="space-y-3">
                  {incomingDMRequests.map((request) => (
                    <RequestCard key={request.id}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <UserAvatar user={request.requester} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <UserInfo user={request.requester} />
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              &ldquo;{request.message}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineDM(request.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `decline-dm-${request.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAcceptDM(request.id)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `accept-dm-${request.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Accept
                        </Button>
                      </div>
                    </RequestCard>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="outgoing">
              {outgoingDMRequests.length === 0 ? (
                <EmptyState icon={Mail} message="No outgoing DM requests" />
              ) : (
                <div className="space-y-3">
                  {outgoingDMRequests.map((request) => (
                    <RequestCard key={request.id}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <UserAvatar user={request.target} />
                        <div className="flex flex-col min-w-0 flex-1">
                          <UserInfo user={request.target} />
                          {request.message && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              &ldquo;{request.message}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelDM(request.id)}
                        disabled={!!actionLoading}
                      >
                        {actionLoading === `cancel-dm-${request.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Cancel
                      </Button>
                    </RequestCard>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active">
              {dmGrants.length === 0 ? (
                <EmptyState icon={MessageCircle} message="No active DM access grants" />
              ) : (
                <div className="space-y-3">
                  {dmGrants.map((grant) => (
                    <RequestCard key={grant.id}>
                      <UserAvatar user={grant.otherUser} />
                      <UserInfo user={grant.otherUser} />
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevokeDM(grant.otherUser?.userId || "")}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `revoke-dm-${grant.otherUser?.userId}` ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <UserMinus className="h-4 w-4 mr-2" />
                          )}
                          Revoke
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleMessageGrant(grant.otherUser?.userId || "")}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === `msg-grant-${grant.otherUser?.userId}` ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <MessageCircle className="h-4 w-4 mr-2" />
                          )}
                          Message
                        </Button>
                      </div>
                    </RequestCard>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
