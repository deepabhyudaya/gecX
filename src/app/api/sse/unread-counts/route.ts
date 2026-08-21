import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUnreadCounts } from "@/actions/notification.actions";

export async function GET(request: NextRequest) {

  const { userId } = auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const safeEnqueue = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      try {
        const counts = await getUnreadCounts();
        safeEnqueue(`data: ${JSON.stringify(counts)}\n\n`);
      } catch (error) {
        console.error("Error fetching initial unread counts:", error);
      }

      const dataInterval = setInterval(async () => {
        try {
          const counts = await getUnreadCounts();
          safeEnqueue(`data: ${JSON.stringify(counts)}\n\n`);
        } catch (error) {
          console.error("Error fetching unread counts:", error);
        }
      }, 30_000);

      const heartbeatInterval = setInterval(() => {
        safeEnqueue(`: ping\n\n`);
      }, 20_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(dataInterval);
        clearInterval(heartbeatInterval);
        closed = true;
        try {
          controller.close();
        } catch {

        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",

      "X-Accel-Buffering": "no",
    },
  });
}