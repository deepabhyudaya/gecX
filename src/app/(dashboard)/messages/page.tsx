import { auth } from "@clerk/nextjs/server";
import { getConversations, getConversationMessages } from "@/actions/message.actions";
import { getMyGroups, getGroupMessages } from "@/actions/group.actions";
import { getMyCommunityProfile } from "@/actions/community-profile.actions";
import DirectMessageClient from "@/components/messages/DirectMessageClient";
import { cookies } from "next/headers";

const MessagesPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId } = auth();
  if (!userId) return null;

  const cookieStore = cookies();
  const messagesLayout = cookieStore.get("react-resizable-panels:messages-layout");
  let defaultMessagesLayout = undefined;
  if (messagesLayout) {
    try {
      defaultMessagesLayout = JSON.parse(messagesLayout.value);
    } catch (e) {}
  }

  const [conversations, groups, currentUserProfile] = await Promise.all([
    getConversations(),
    getMyGroups(),
    getMyCommunityProfile(),
  ]);

  const selectedId = searchParams.convId ? parseInt(searchParams.convId) : null;
  const isGroup = searchParams.type === "group";
  let selectedData = null;

  if (selectedId) {
    if (isGroup) {
      const messages = await getGroupMessages(selectedId);
      const group = groups.find(g => g.id === selectedId);
      if (group) {
        selectedData = {
          ...group,
          messages,
          isGroup: true
        };
      }
    } else {
      const messages = await getConversationMessages(selectedId);
      const conv = conversations.find(c => c.id === selectedId);
      if (conv) {
        selectedData = {
          ...conv,
          messages,
          isGroup: false
        };
      }
    }
  }

  return (
    <div className="flex-1 p-4 flex flex-col h-full">
      <DirectMessageClient
        conversations={conversations}
        groups={groups as any}
        selectedData={selectedData}
        currentUserId={userId}
        currentUserProfile={currentUserProfile}
        defaultLayout={defaultMessagesLayout}
      />
    </div>
  );
};

export default MessagesPage;
