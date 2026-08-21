import { headers } from "next/headers";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred: No svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", { status: 400 });
  }

  const eventType = evt.type;
  const data = evt.data;

  try {
    switch (eventType) {
      case "user.created":
      case "user.updated": {
        const userId = data.id;
        const username = data.username || data.email_addresses?.[0]?.email_address || userId;
        const role = (data.public_metadata as { role?: string })?.role;

        if (role === "admin") {
          await prisma.admin.upsert({
            where: { id: userId },
            update: { username },
            create: { id: userId, username },
          });
        }
        break;
      }
      case "user.deleted": {
        const userId = data.id;
        await prisma.admin.deleteMany({ where: { id: userId } });
        break;
      }
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
