import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import {
  getMyStudentRivalries,
  getStudentsForWarProposal,
} from "@/actions/student-rivalry.actions";
import { getActiveSeasonForWar } from "@/actions/season.actions";
import ProposeStudentWarForm from "@/components/student-rivalry/ProposeStudentWarForm";
import StudentWarScoreboard from "@/components/student-rivalry/StudentWarScoreboard";
import { TargetAcceptButton, RetractProposalButton, SurrenderWarButton } from "@/components/student-rivalry/StudentWarActionButtons";
import Link from "next/link";

export default async function StudentWarsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: { class: true },
  });
  if (!student) return <div className="p-8">Student not found.</div>;

  const [rivalries, students, teachers, activeSeason] = await Promise.all([
    getMyStudentRivalries(),
    getStudentsForWarProposal(),
    prisma.teacher.findMany({ select: { id: true, name: true, surname: true } }),
    getActiveSeasonForWar(student.class?.collegeId ?? null, "STUDENT"),
  ]);

  let seasonPoints = 0;
  let seasonRank = null;
  if (activeSeason) {
    const sp = await prisma.studentSeasonPoints.findUnique({
      where: { seasonId_studentId: { seasonId: activeSeason.id, studentId: userId } },
      include: { rank: true }
    });
    if (sp) {
      seasonPoints = sp.totalPoints;
      seasonRank = sp.rank;
    }
  }

  let totalRP = 0;
  rivalries.forEach((r: any) => {
    if (r.status === "ACTIVE" || r.status === "CONCLUDED") {
      if (r.studentAId === userId) totalRP += r.studentAScore;
      else if (r.studentBId === userId) totalRP += r.studentBScore;
    }
  });

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <div className="relative shrink-0 bg-gradient-to-r from-blue-950 via-card to-red-950 border border-border rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-red-500/5" />
        <div className="relative">
          <div className="flex items-center gap-3 flex-wrap">
            {activeSeason?.iconUrl && (
              <img src={activeSeason.iconUrl} alt="Season" className="w-8 h-8 rounded-md bg-muted object-cover" />
            )}
            <h1 className="text-2xl font-black tracking-tight">⚔️ Student Wars</h1>
            {seasonRank && (
              <div className="flex items-center gap-2 bg-background/30 border border-border/50 px-3 py-1 rounded-full backdrop-blur-md">
                {seasonRank.iconUrl && (
                  <img src={seasonRank.iconUrl} alt={seasonRank.rankName} className="w-5 h-5 object-contain" />
                )}
                <span className="text-sm font-bold" style={{ color: seasonRank.colorHex || "inherit" }}>
                  {seasonRank.rankName}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {student.class?.name ? `${student.class.name} · ` : ""}1v1 Duel Arena
            {activeSeason ? ` · Season ${activeSeason.seasonCode} ${activeSeason.displayName ? `(${activeSeason.displayName})` : ""}` : ""}
          </p>

          <div className="mt-4 flex items-center gap-4">
            {activeSeason && (
              <div className="bg-background/20 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Season Points</div>
                <div className="font-black text-lg text-emerald-400">{seasonPoints.toLocaleString()} SP</div>
              </div>
            )}
            <div className="bg-background/20 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Available RP</div>
              <div className="font-black text-lg text-blue-400">{Math.floor(totalRP).toLocaleString()} RP</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          {rivalries.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
              You have no active or pending wars.
            </div>
          )}

          {rivalries.map((rivalry: any) => {
            const isTarget = rivalry.status === "PENDING_CR" && rivalry.studentBId === userId;
            const alreadyAccepted = isTarget && rivalry.targetAccepted;
            const isChallenger = rivalry.status === "PENDING_CR" && rivalry.studentAId === userId;
            const isPendingAdmin = rivalry.status === "PENDING_ADMIN";
            const isProposer = isPendingAdmin && rivalry.proposerId === userId;
            const isTargetPendingAdmin = isPendingAdmin && rivalry.studentBId === userId;

            return (
              <div key={rivalry.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-bold">
                    {rivalry.studentA.name} <span className="text-muted-foreground font-normal">vs</span> {rivalry.studentB.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    {rivalry.status === "ACTIVE" && <SurrenderWarButton rivalryId={rivalry.id} />}
                    <span className="text-xs px-2 py-1 rounded-lg bg-muted border border-border font-medium">
                      {rivalry.status}
                    </span>
                  </div>
                </div>

                {isPendingAdmin && isProposer && (
                  <div className="text-sm text-yellow-500">
                    ⏳ Waiting for admin approval. Expires {new Date(rivalry.autoExpiresAt).toLocaleDateString()}.
                    <RetractProposalButton rivalryId={rivalry.id} />
                  </div>
                )}

                {isPendingAdmin && isTargetPendingAdmin && (
                  <div className="text-sm text-yellow-500">
                    ⏳ Someone challenged you! Waiting for admin approval.
                  </div>
                )}

                {isTarget && !alreadyAccepted && (
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <span className="text-sm text-orange-400 font-bold">Action Required: Accept Challenge</span>
                    <TargetAcceptButton rivalryId={rivalry.id} />
                  </div>
                )}

                {isTarget && alreadyAccepted && (
                  <div className="text-sm text-blue-400">✓ You accepted. Waiting for activation.</div>
                )}

                {isChallenger && (
                  <div className="text-sm text-blue-400">
                    ⏳ Waiting for {rivalry.studentB.name} to accept.
                    <RetractProposalButton rivalryId={rivalry.id} />
                  </div>
                )}

                {rivalry.status === "ACTIVE" && (
                  <div>
                    <StudentWarScoreboard rivalryId={rivalry.id} compact />
                    <Link
                      href={`/student/wars/${rivalry.id}`}
                      className="mt-4 block w-full text-center bg-muted/50 hover:bg-muted border border-border py-2 rounded-xl text-sm transition-colors"
                    >
                      Enter War Room →
                    </Link>
                  </div>
                )}

                {rivalry.status === "CONCLUDED" && (
                  <div>
                    <div className="text-purple-400 font-bold text-sm mb-3">🏆 Concluded</div>
                    <StudentWarScoreboard rivalryId={rivalry.id} compact />
                    <Link
                      href={`/student/wars/${rivalry.id}`}
                      className="mt-4 block w-full text-center bg-muted/50 hover:bg-muted border border-border py-2 rounded-xl text-sm transition-colors text-purple-400"
                    >
                      View the Archive →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="font-bold text-lg">Declare a War</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Challenge another student to a season-long 1v1 duel. Admin reviews within 7 days, opponent must accept.
              </p>
            </div>
            <ProposeStudentWarForm students={students} teachers={teachers} />
          </div>
        </div>
      </div>
    </div>
  );
}
