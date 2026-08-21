import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import {
  getMyRivalry,
  getMyClassCR,
  getClassesForRivalryProposal,
  amITheCR,
} from "@/actions/rivalry.actions";
import { getActiveSeasonForWar } from "@/actions/season.actions";
import ProposeRivalryForm from "@/components/rivalry/ProposeRivalryForm";
import RivalryScoreboard from "@/components/rivalry/RivalryScoreboard";
import { CRApproveButton } from "@/components/rivalry/RivalryActionButtons";
import Link from "next/link";

export default async function StudentRivalryPage() {
  const { userId } = auth();
  if (!userId) return null;

  const student = await prisma.student.findUnique({
    where: { id: userId },
    include: { class: true },
  });
  if (!student) return <div className="p-8">Student not found.</div>;

  const [rivalry, cr, availableClasses, isCR, activeSeason] = await Promise.all([
    getMyRivalry(),
    getMyClassCR(),
    getClassesForRivalryProposal(),
    amITheCR(),
    getActiveSeasonForWar(student.class?.collegeId ?? null, "BRANCH"),
  ]);

  let seasonPoints = 0;
  let seasonRank = null;
  if (activeSeason && student.classId) {
    const sp = await prisma.branchSeasonPoints.findUnique({
      where: { seasonId_classId: { seasonId: activeSeason.id, classId: student.classId } },
      include: { rank: true }
    });
    if (sp) {
      seasonPoints = sp.totalPoints;
      seasonRank = sp.rank;
    }
  }

  let myRP = 0;
  if (rivalry) {
    const member = await prisma.rivalryMember.findUnique({
      where: { rivalryId_studentId: { rivalryId: rivalry.id, studentId: userId } }
    });
    if (member) myRP = member.pointsContributed;
  }

  const hasPendingCR = rivalry?.status === "PENDING_CR";
  const myClassId = student.classId;
  const isStoredCr =
    rivalry && (rivalry.crAId === userId || rivalry.crBId === userId);
  const isLiveCrForThisRivalry =
    isCR &&
    rivalry &&
    (myClassId === rivalry.classAId || myClassId === rivalry.classBId);
  const isCrForThisRivalry = isStoredCr || isLiveCrForThisRivalry;
  const alreadyApproved =
    isCrForThisRivalry &&
    (((rivalry.crAId === userId || (isLiveCrForThisRivalry && myClassId === rivalry.classAId)) &&
      rivalry.crAApproved) ||
      ((rivalry.crBId === userId || (isLiveCrForThisRivalry && myClassId === rivalry.classBId)) &&
        rivalry.crBApproved));

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <div className="relative shrink-0 bg-gradient-to-r from-blue-950 via-card to-red-950 border border-border rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-red-500/5" />
        <div className="relative">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                {activeSeason?.iconUrl && (
                  <img src={activeSeason.iconUrl} alt="Season" className="w-8 h-8 rounded-md bg-muted object-cover" />
                )}
                <h1 className="text-2xl font-black tracking-tight">⚔️ Branch Wars</h1>
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
                {student.class.name} · Season rivalry arena
                {activeSeason ? ` · Season ${activeSeason.seasonCode} ${activeSeason.displayName ? `(${activeSeason.displayName})` : ""}` : ""}
              </p>

              <div className="mt-4 flex items-center gap-4">
                {activeSeason && (
                  <div className="bg-background/20 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Season Points</div>
                    <div className="font-black text-lg text-emerald-400">{seasonPoints.toLocaleString()} SP</div>
                  </div>
                )}
                {rivalry && (
                  <div className="bg-background/20 backdrop-blur-md border border-border/50 rounded-xl px-4 py-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Available RP</div>
                    <div className="font-black text-lg text-blue-400">{Math.floor(myRP).toLocaleString()} RP</div>
                  </div>
                )}
              </div>
            </div>
            {isCR && (
              <div className="bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs font-bold px-3 py-1.5 rounded-full">
                👑 Branch Representative
              </div>
            )}
          </div>
        </div>
      </div>

      {hasPendingCR && isCrForThisRivalry && !alreadyApproved && rivalry && (
        <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-bold text-orange-400">⚔️ Action Required — Declare War</div>
              <p className="text-sm text-muted-foreground mt-1">
                As Branch Representative, only you can finalize this rivalry.
                Once both CRs confirm, the battlefield server launches automatically.
              </p>
            </div>
            <CRApproveButton rivalryId={rivalry.id} />
          </div>
        </div>
      )}

      {hasPendingCR && isCrForThisRivalry && alreadyApproved && (
        <div className="bg-blue-500/10 border border-blue-500/40 rounded-2xl p-4 text-sm text-blue-400">
          ✓ You confirmed the war. Waiting for the opposing CR to also approve.
        </div>
      )}

      {rivalry && rivalry.status === "PENDING_CR" && !isCrForThisRivalry && (
        <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-6 text-center space-y-2">
          <div className="text-3xl">⚔️</div>
          <div className="font-bold text-orange-400">
            {rivalry.classA.name} <span className="text-muted-foreground">vs</span> {rivalry.classB.name}
          </div>
          <p className="text-sm text-muted-foreground">
            Rivalry approved by admin. Waiting for both Class Representatives to confirm.
          </p>
        </div>
      )}

      {rivalry && rivalry.status === "ACTIVE" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">
              {rivalry.classA.name} <span className="text-muted-foreground">vs</span> {rivalry.classB.name}
            </h2>
            <Link
              href={`/student/rivalry/${rivalry.id}`}
              className="text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
            >
              Full War Room →
            </Link>
          </div>
          <RivalryScoreboard rivalryId={rivalry.id} compact />

          {rivalry.loreEntries && rivalry.loreEntries.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Latest Chronicle
              </div>
              <div className="font-bold text-sm mb-2">{rivalry.loreEntries[0].title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {rivalry.loreEntries[0].narrative}
              </p>
              <Link href={`/student/rivalry/${rivalry.id}#lore`} className="text-xs text-muted-foreground hover:text-foreground mt-2 block">
                Read full archive →
              </Link>
            </div>
          )}
        </div>
      )}

      {rivalry && rivalry.status === "PENDING_ADMIN" && (
        <div className="bg-yellow-500/10 border border-yellow-500/40 rounded-2xl p-6 text-center space-y-2">
          <div className="text-3xl">⏳</div>
          <div className="font-bold text-yellow-400">Rivalry Awaiting Admin Approval</div>
          <p className="text-sm text-muted-foreground">
            {rivalry.classA.name} vs {rivalry.classB.name} · Expires {new Date(rivalry.autoExpiresAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {rivalry && rivalry.status === "CONCLUDED" && (
        <div className="bg-purple-500/10 border border-purple-500/40 rounded-2xl p-6 text-center space-y-3">
          <div className="text-3xl">🏆</div>
          <div className="font-bold text-purple-400">Season Concluded</div>
          <RivalryScoreboard rivalryId={rivalry.id} compact />
          <Link href={`/student/rivalry/${rivalry.id}`} className="text-sm text-purple-400 hover:underline">
            View the Archive →
          </Link>
        </div>
      )}

      {!rivalry && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="font-bold text-lg">Propose a Rivalry</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Challenge another branch to a season-long war. Admin reviews within 7 days, both CRs must confirm.
              </p>
            </div>
            <ProposeRivalryForm
              myClassId={student.classId}
              myClassName={student.class.name}
              availableClasses={availableClasses}
            />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-lg">How It Works</h2>
            <ol className="space-y-3 text-sm">
              {[
                ["⚔️", "Propose", "Any student proposes a rival branch. You can only propose once per month."],
                ["✅", "Admin Approves", "Admin reviews within 7 days or it auto-expires. Proposal can be re-submitted monthly."],
                ["👑", "CR Declares War", "Both Branch Representatives must confirm. Only the CR can pull the trigger."],
                ["🎰", "Draw Participants", "Random warriors are drawn from each branch via live slot machine animation."],
                ["📊", "Track Bouts", "Scores are normalized by branch size so small branches can compete fairly."],
                ["📜", "Lore Written", "After every bout, the platform writes the story automatically."],
                ["💰", "Earn Rewards", "Convert Rivalry Points to Karma and GECX. 100 RP = 2,500 Karma = 100 GECX."],
              ].map(([icon, title, desc]) => (
                <li key={title} className="flex gap-3">
                  <span className="text-lg shrink-0">{icon}</span>
                  <div>
                    <div className="font-semibold">{title}</div>
                    <div className="text-muted-foreground text-xs">{desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {cr && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Branch Representative (CR) — {student.class.name}</div>
          <CRInfoRow crStudentId={cr.studentId} season={cr.season} />
        </div>
      )}
    </div>
  );
}

async function CRInfoRow({ crStudentId, season }: { crStudentId: string; season: string }) {
  const crStudent = await prisma.student.findUnique({
    where: { id: crStudentId },
    select: { name: true, surname: true, username: true },
  });
  if (!crStudent) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">CR</span>
      <span className="font-medium">{crStudent.name} {crStudent.surname}</span>
      <span className="text-xs text-muted-foreground">@{crStudent.username}</span>
      <span className="text-xs text-muted-foreground ml-auto">Season {season}</span>
    </div>
  );
}
