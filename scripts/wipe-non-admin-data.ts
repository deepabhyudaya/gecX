

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_WIPE !== "YES") {
    console.error(
      "\n❌ Refusing to run.\n\n" +
        "   Set CONFIRM_WIPE=YES to proceed.\n" +
        "   PowerShell:  $env:CONFIRM_WIPE='YES'; npx ts-node scripts/wipe-non-admin-data.ts\n" +
        "   bash/zsh:    CONFIRM_WIPE=YES npx ts-node scripts/wipe-non-admin-data.ts\n"
    );
    process.exit(1);
  }

  console.log("⚠️  Wiping non-admin data...");
  const t0 = Date.now();

  const [students, teachers, parents] = await Promise.all([
    prisma.student.findMany({ select: { id: true } }),
    prisma.teacher.findMany({ select: { id: true } }),
    prisma.parent.findMany({ select: { id: true } }),
  ]);
  const nonAdminIds = new Set<string>([
    ...students.map((s) => s.id),
    ...teachers.map((t) => t.id),
    ...parents.map((p) => p.id),
  ]);
  console.log(
    `   Found ${students.length} students, ${teachers.length} teachers, ${parents.length} parents`
  );

  await prisma.$transaction(async (tx) => {

    await tx.ticketMessageReaction.deleteMany({});
    await tx.publicTicketMessageReaction.deleteMany({});
    await tx.directMessageReaction.deleteMany({});
    await tx.groupMessageReaction.deleteMany({});
    await tx.serverMessageReaction.deleteMany({});
    await tx.pollVote.deleteMany({});
    await tx.communityPostLike.deleteMany({});
    await tx.communityCommentLike.deleteMany({});
    await tx.communityReport.deleteMany({});

    await tx.pollOption.deleteMany({});
    await tx.poll.deleteMany({});

    await tx.ticketMessage.deleteMany({});
    await tx.publicTicketMessage.deleteMany({});
    await tx.directMessage.deleteMany({});
    await tx.groupMessage.deleteMany({});
    await tx.serverMessage.deleteMany({});

    await tx.ticket.deleteMany({});
    await tx.publicTicket.deleteMany({});

    await tx.conversation.deleteMany({});
    await tx.groupMember.deleteMany({});
    await tx.groupChat.deleteMany({});

    await tx.serverBan.deleteMany({});
    await tx.reactionRole.deleteMany({});
    await tx.channelPermission.deleteMany({});
    await tx.serverMemberRole.deleteMany({});
    await tx.serverRole.deleteMany({});
    await tx.serverSettings.deleteMany({});
    await tx.serverEmojiSlotPurchase.deleteMany({});
    await tx.serverEmoji.deleteMany({});
    await tx.serverSticker.deleteMany({});
    await tx.serverMember.deleteMany({});
    await tx.serverChannel.deleteMany({});
    await tx.serverChannelCategory.deleteMany({});
    await tx.server.deleteMany({});

    await tx.communityComment.deleteMany({});
    await tx.communityPost.deleteMany({});
    await tx.communityFollow.deleteMany({});
    await tx.followRequest.deleteMany({});
    await tx.dMAccessRequest.deleteMany({});
    await tx.dMAccessGrant.deleteMany({});
    await tx.karmaHistory.deleteMany({});
    await tx.userActivityLog.deleteMany({});
    await tx.userCommunityProfile.deleteMany({});

    await tx.userEquippedAvatar.deleteMany({});
    await tx.userAvatar.deleteMany({});
    await tx.userEquippedColors.deleteMany({});
    await tx.userOwnedColor.deleteMany({});
    await tx.userOwnedGlobalEmoji.deleteMany({});
    await tx.userOwnedGlobalSticker.deleteMany({});
    await tx.gecXTransaction.deleteMany({});
    await tx.userGecXBalance.deleteMany({});

    await tx.notification.deleteMany({});

    await tx.profileAccess.deleteMany({});
    await tx.userImpersonation.deleteMany({});
    await tx.userBlock.deleteMany({});
    await tx.userEventThemeState.deleteMany({});

    await tx.rivalryStrike.deleteMany({});
    await tx.rivalryLore.deleteMany({});
    await tx.rivalryMember.deleteMany({});
    await tx.rivalryBout.deleteMany({});
    await tx.classRivalry.deleteMany({});
    await tx.classRepresentative.deleteMany({});

    await tx.result.deleteMany({});
    await tx.attendance.deleteMany({});
    await tx.teacherAttendance.deleteMany({});
    await tx.assignment.deleteMany({});
    await tx.exam.deleteMany({});
    await tx.lesson.deleteMany({});

    await tx.courseProgress.deleteMany({});
    await tx.courseEnrollment.deleteMany({});
    await tx.courseReview.deleteMany({});
    await tx.courseLecture.deleteMany({});
    await tx.courseSection.deleteMany({});
    await tx.course.deleteMany({});

    await tx.announcement.deleteMany({});
    await tx.event.deleteMany({});

    await tx.student.deleteMany({});
    await tx.teacher.deleteMany({});
    await tx.parent.deleteMany({});

    await tx.class.deleteMany({});
    await tx.grade.deleteMany({});
  }, { timeout: 120_000, maxWait: 30_000 });

  console.log("✅ Database wipe complete.");

  if (process.env.DELETE_CLERK_USERS === "YES") {
    if (!process.env.CLERK_SECRET_KEY) {
      console.warn(
        "   Skipping Clerk user deletion: CLERK_SECRET_KEY not set in environment."
      );
    } else {
      console.log(`   Deleting ${nonAdminIds.size} Clerk users...`);
      let { clerkClient } = await import("@clerk/nextjs/server");
      let ok = 0,
        fail = 0;
      for (const id of Array.from(nonAdminIds)) {
        try {
          await clerkClient.users.deleteUser(id);
          ok++;
        } catch (err: any) {
          fail++;
          console.warn(`     ✗ ${id}: ${err?.message ?? err}`);
        }
      }
      console.log(`   Clerk: ${ok} deleted, ${fail} failed.`);
    }
  } else {
    console.log(
      "   ℹ️  Clerk auth users were NOT deleted. Set DELETE_CLERK_USERS=YES to remove them too."
    );
  }

  const counts = {
    admins: await prisma.admin.count(),
    students: await prisma.student.count(),
    teachers: await prisma.teacher.count(),
    parents: await prisma.parent.count(),
    classes: await prisma.class.count(),
    grades: await prisma.grade.count(),
    subjects: await prisma.subject.count(),
    posts: await prisma.communityPost.count(),
    messages:
      (await prisma.directMessage.count()) +
      (await prisma.groupMessage.count()) +
      (await prisma.serverMessage.count()),
    tickets: await prisma.ticket.count(),
    notifications: await prisma.notification.count(),
    servers: await prisma.server.count(),
    rivalries: await prisma.classRivalry.count(),
  };
  console.log("\n📊 Post-wipe counts:");
  console.table(counts);
  console.log(`\n⏱  Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main()
  .catch((e) => {
    console.error("❌ Wipe failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
