import { auth } from "@clerk/nextjs/server";
import { getTickets, getTicketMessages } from "@/actions/support.actions";
import SupportChatClient from "@/components/support/SupportChatClient";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: { ticketId?: string };
}) {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !role) {
    redirect("/");
  }

  const cookieStore = cookies();
  const supportLayout = cookieStore.get("react-resizable-panels:support-layout");
  let defaultSupportLayout = undefined;
  if (supportLayout) {
    try {
      defaultSupportLayout = JSON.parse(supportLayout.value);
    } catch (e) {}
  }

  const tickets = await getTickets();

  let selectedTicketData = null;
  if (searchParams.ticketId) {
    try {
      selectedTicketData = await getTicketMessages(Number(searchParams.ticketId));
    } catch (e) {

    }
  }

  return (
    <div className="p-4 flex h-full min-h-0 bg-background">
      <SupportChatClient
        tickets={tickets}
        selectedTicketData={selectedTicketData}
        currentUserId={userId}
        currentUserRole={role}
        defaultLayout={defaultSupportLayout}
      />
    </div>
  );
}
