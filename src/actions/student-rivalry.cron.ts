"use server";

import prisma from "@/lib/prisma";
import { generateWeeklyLore } from "@/lib/student-rivalry-lore";
import { upsertScoreboardMessage, postWarSystemMessage, renderStudentScoreboard } from "@/lib/war-server";
import { publishWarEvent } from "@/lib/war-events";

export async function processAutomatedWars() {
  const now = new Date();

  const activeBouts = await prisma.studentRivalryBout.findMany({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      warType: {
        requiresTeacher: false,
      },
    },
    include: {
      warType: true,
      rivalry: true,
    },
  });

  const processedBouts = [];

  for (const bout of activeBouts) {
    const conductedAt = new Date(bout.conductedAt);
    const durationHours = bout.warType?.minDurationHours || 24;
    const endTime = new Date(conductedAt.getTime() + durationHours * 60 * 60 * 1000);

    if (now >= endTime) {
      let finalScoreA = 0;
      let finalScoreB = 0;

      if (bout.warType?.name === "Karma Sprint") {
        const karmaA = await prisma.karmaHistory.aggregate({
          where: {
            userId: bout.rivalry.studentAId,
            date: { gte: conductedAt, lte: endTime },
          },
          _sum: { karmaEarned: true },
        });
        const karmaB = await prisma.karmaHistory.aggregate({
          where: {
            userId: bout.rivalry.studentBId,
            date: { gte: conductedAt, lte: endTime },
          },
          _sum: { karmaEarned: true },
        });
        finalScoreA = karmaA._sum.karmaEarned ?? 0;
        finalScoreB = karmaB._sum.karmaEarned ?? 0;
      }

      else if (bout.warType?.name === "Attendance Siege") {

        const days = durationHours / 24;

        const attA = await prisma.studentAttendance.count({
          where: { studentId: bout.rivalry.studentAId, date: { gte: conductedAt, lte: endTime }, present: true }
        });
        const attB = await prisma.studentAttendance.count({
          where: { studentId: bout.rivalry.studentBId, date: { gte: conductedAt, lte: endTime }, present: true }
        });

        finalScoreA = attA * 100;
        finalScoreB = attB * 100;
      }

      else if (bout.warType?.name === "Silent War") {
        finalScoreA = 1000;
        finalScoreB = 1000;
        if (bout.rivalry.battlefieldServerId) {
          const messagesA = await prisma.serverMessage.count({
            where: {
              channel: { serverId: bout.rivalry.battlefieldServerId },
              senderId: bout.rivalry.studentAId,
              createdAt: { gte: conductedAt, lte: endTime },
            },
          });
          const messagesB = await prisma.serverMessage.count({
            where: {
              channel: { serverId: bout.rivalry.battlefieldServerId },
              senderId: bout.rivalry.studentBId,
              createdAt: { gte: conductedAt, lte: endTime },
            },
          });
          finalScoreA -= messagesA * 100;
          finalScoreB -= messagesB * 100;
        }
      }

      else if (bout.warType?.name === "Reputation War") {
        const helpfulA = await prisma.communityComment.count({
          where: {
            authorId: bout.rivalry.studentAId,
            helpfulRank: { in: [1, 2, 3] },
            createdAt: { gte: conductedAt, lte: endTime },
          },
        });
        const helpfulB = await prisma.communityComment.count({
          where: {
            authorId: bout.rivalry.studentBId,
            helpfulRank: { in: [1, 2, 3] },
            createdAt: { gte: conductedAt, lte: endTime },
          },
        });
        finalScoreA = helpfulA * 100;
        finalScoreB = helpfulB * 100;
      }

      try {
        const winnerId = finalScoreA > finalScoreB ? bout.rivalry.studentAId :
                         finalScoreB > finalScoreA ? bout.rivalry.studentBId : null;

        const studentA = await prisma.student.findUnique({ where: { id: bout.rivalry.studentAId } });
        const studentB = await prisma.student.findUnique({ where: { id: bout.rivalry.studentBId } });
        if (!studentA || !studentB) continue;

        const newAScore = bout.rivalry.studentAScore + finalScoreA;
        const newBScore = bout.rivalry.studentBScore + finalScoreB;

        const { title: loreTitle, narrative } = generateWeeklyLore({
          studentAName: `${studentA.name} ${studentA.surname}`,
          studentBName: `${studentB.name} ${studentB.surname}`,
          weekNumber: bout.round,
          studentAScore: newAScore,
          studentBScore: newBScore,
          boutTitle: bout.title,
          boutWinnerName: winnerId === studentA.id ? `${studentA.name} ${studentA.surname}` :
                           winnerId === studentB.id ? `${studentB.name} ${studentB.surname}` : undefined,
          totalBouts: bout.round,
        });

        await prisma.$transaction(async (tx) => {
          const fresh = await tx.studentRivalryBout.findUnique({ where: { id: bout.id } });
          if (!fresh || fresh.status === "COMPLETED") return;

          await tx.studentRivalryBout.update({
            where: { id: bout.id },
            data: {
              status: "COMPLETED",
              studentAPoints: finalScoreA,
              studentBPoints: finalScoreB,
              winnerId,
              endTime: new Date(),
              description: `Automated scoring: ${bout.warType?.name}`,
            },
          });
          await tx.studentRivalry.update({
            where: { id: bout.studentRivalryId },
            data: { studentAScore: newAScore, studentBScore: newBScore },
          });
          await tx.studentRivalryLore.create({
            data: { studentRivalryId: bout.studentRivalryId, weekNumber: bout.round, title: loreTitle, narrative },
          });
        });

        if (bout.rivalry.scoreboardChannelId) {
          try {
            const newMessageId = await upsertScoreboardMessage(
              bout.rivalry.scoreboardChannelId,
              renderStudentScoreboard({
                studentAName: `${studentA.name} ${studentA.surname}`,
                studentBName: `${studentB.name} ${studentB.surname}`,
                studentAScore: newAScore,
                studentBScore: newBScore,
                totalBouts: bout.round,
                status: "ACTIVE",
              }),
              bout.rivalry.scoreboardMessageId,
            );
            if (newMessageId !== bout.rivalry.scoreboardMessageId) {
              await prisma.studentRivalry.update({
                where: { id: bout.studentRivalryId },
                data: { scoreboardMessageId: newMessageId },
              });
            }
            await postWarSystemMessage({
              channelId: bout.rivalry.scoreboardChannelId,
              content:
                `⚔️ **Round ${bout.round} — ${bout.title}** (Auto-scored)\n` +
                `${studentA.name}: **+${finalScoreA.toFixed(0)}**  ·  ${studentB.name}: **+${finalScoreB.toFixed(0)}**\n` +
                (winnerId === studentA.id
                  ? `🏆 Round goes to **${studentA.name}**.`
                  : winnerId === studentB.id
                  ? `🏆 Round goes to **${studentB.name}**.`
                  : `⚖️ Round ends in a tie.`),
            });
          } catch (err) {
            console.error(`[cron] scoreboard update failed for bout ${bout.id}:`, err);
          }
        }
        if (bout.rivalry.loreChannelId) {
          try {
            await postWarSystemMessage({
              channelId: bout.rivalry.loreChannelId,
              content: `📜 **${loreTitle}**\n\n${narrative}`,
            });
          } catch (err) {
            console.error(`[cron] lore post failed for bout ${bout.id}:`, err);
          }
        }

        await publishWarEvent("student", {
          type: "war:bout",
          rivalryId: bout.studentRivalryId,
          boutId: bout.id,
          round: bout.round,
          title: bout.title,
          studentAPoints: finalScoreA,
          studentBPoints: finalScoreB,
          winnerId,
        });
        await publishWarEvent("student", {
          type: "war:score",
          rivalryId: bout.studentRivalryId,
          studentAScore: newAScore,
          studentBScore: newBScore,
        });

        processedBouts.push(bout.id);
      } catch (err) {
        console.error(`Failed to process automated bout ${bout.id}:`, err);
      }
    }
  }

  return {
    processedCount: processedBouts.length,
    processedBouts,
  };
}
