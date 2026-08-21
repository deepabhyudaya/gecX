"use server";

import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createNotificationsForUsers, getAllUserIdsByRole } from "@/lib/notifications";

enum ReportStatus {
  PENDING = "PENDING",
  REVIEWING = "REVIEWING",
  RESOLVED = "RESOLVED",
  DISMISSED = "DISMISSED",
}

export async function reportPost(postId: string, reason: string, description?: string) {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "student").toLowerCase();

  const post = await prisma.communityPost.findUnique({
    where: { id: postId, isDeleted: false },
  });

  if (!post) throw new Error("Post not found");

  const existingReport = await prisma.communityReport.findFirst({
    where: {
      postId,
      reporterId: userId,
    },
  });

  if (existingReport) {
    throw new Error("You have already reported this post");
  }

  const report = await prisma.communityReport.create({
    data: {
      postId,
      reporterId: userId,
      reason: reason.slice(0, 100),
      description: description?.slice(0, 500),
      status: ReportStatus.PENDING,
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      subject: `Community Report: ${reason}`,
      description: `Post ID: ${postId}\nReason: ${reason}\nDescription: ${description || "N/A"}\nReport ID: ${report.id}`,
      category: "community_report",
      status: "OPEN",
    },
  });

  await prisma.ticketMessage.create({
    data: {
      content: `**Post Report**\n\n**Reason:** ${reason}\n**Description:** ${description || "N/A"}\n\n**Post ID:** ${postId}\n**Report ID:** ${report.id}`,
      ticketId: ticket.id,
      senderId: userId,
      senderRole: role,
    },
  });

  const adminIds = await getAllUserIdsByRole("admin");
  await createNotificationsForUsers({
    title: "New Post Report",
    message: `${reason}: ${description?.slice(0, 50) || "No description"}${description && description.length > 50 ? "..." : ""}`,
    type: "TICKET_CREATED",
    entityId: String(ticket.id),
    adminIds,
  });

  revalidatePath("/community");
  return { success: true, reportId: report.id };
}

export async function getReports(status?: ReportStatus) {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") throw new Error("Admin only");

  const reports = await prisma.communityReport.findMany({
    where: status ? { status } : undefined,
    include: {
      post: {
        include: {
          author: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return reports;
}

export async function resolveReport(reportId: string, action: "delete" | "dismiss") {
  const { userId, sessionClaims } = auth();
  if (!userId) throw new Error("Unauthorized");

  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();
  if (role !== "admin") throw new Error("Admin only");

  const report = await prisma.communityReport.findUnique({
    where: { id: reportId },
    include: { post: true },
  });

  if (!report) throw new Error("Report not found");

  if (action === "delete") {

    await prisma.communityPost.update({
      where: { id: report.postId },
      data: { isDeleted: true },
    });

    await prisma.userCommunityProfile.update({
      where: { userId: report.post.authorId },
      data: { postCount: { decrement: 1 } },
    });
  }

  await prisma.communityReport.update({
    where: { id: reportId },
    data: {
      status: action === "delete" ? ReportStatus.RESOLVED : ReportStatus.DISMISSED,
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
  });

  revalidatePath("/community");
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function getPendingReportCount() {
  const { sessionClaims } = auth();
  const role = ((sessionClaims?.metadata as { role?: string })?.role || "").toLowerCase();

  if (role !== "admin") return 0;

  const count = await prisma.communityReport.count({
    where: { status: ReportStatus.PENDING },
  });

  return count;
}
