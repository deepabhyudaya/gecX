import { auth } from "@clerk/nextjs/server";
import { getStudentRivalryById } from "@/actions/student-rivalry.actions";
import { getActiveSeasonForWar } from "@/actions/season.actions";
import prisma from "@/lib/prisma";
import StudentWarScoreboard from "@/components/student-rivalry/StudentWarScoreboard";
import { ConvertStudentRPButton, ConcludeWarButton } from "@/components/student-rivalry/StudentWarActionButtons";
import ActiveBoutTracker from "@/components/student-rivalry/ActiveBoutTracker";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function StudentWarDetailPage({ params }: { params: { id: string } }) {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const rivalry = await getStudentRivalryById(params.id);
  if (!rivalry) notFound();

  let seasonName = rivalry.season;
  if (rivalry.seasonId) {
    const season = await prisma.season.findUnique({ where: { id: rivalry.seasonId } });
    if (season) {
      seasonName = `${season.seasonCode} ${season.displayName ? `(${season.displayName})` : ""}`;
    }
  }

  const isAdmin = role === "admin";
  const isParticipant = userId === rivalry.studentAId || userId === rivalry.studentBId;
  const myScore = userId === rivalry.studentAId ? rivalry.studentAScore : userId === rivalry.studentBId ? rivalry.studentBScore : 0;

  const activeBout = rivalry.bouts.find((b: any) => b.status === "PENDING" || b.status === "ACTIVE");

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <div className="relative bg-gradient-to-r from-blue-950 via-gray-950 to-red-950 border border-border rounded-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] bg-repeat" />
        <div className="relative p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                War Room · Season {seasonName}
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                <span className="text-blue-400">{rivalry.studentA.name} {rivalry.studentA.surname}</span>
                <span className="text-muted-foreground mx-3">vs</span>
                <span className="text-red-400">{rivalry.studentB.name} {rivalry.studentB.surname}</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {rivalry.battlefieldServerId && (
                <Link
                  href={`/servers`}
                  className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-500/30 transition-colors"
                >
                  🏰 Enter Duel Server
                </Link>
              )}
              {isAdmin && rivalry.status === "ACTIVE" && (
                <ConcludeWarButton rivalryId={rivalry.id} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <StatusBadge status={rivalry.status} />
            <span className="text-xs text-muted-foreground">{rivalry.bouts.length} bouts played</span>
            {rivalry.strikes.length > 0 && (
              <span className="text-xs text-yellow-400">{rivalry.strikes.length} strikes issued</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {activeBout && (
            <ActiveBoutTracker
              activeBout={activeBout}
              studentA={rivalry.studentA}
              studentB={rivalry.studentB}
            />
          )}

          <StudentWarScoreboard rivalryId={rivalry.id} />

          {rivalry.bouts.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span>⚔️</span> Bout History
              </h3>
              <div className="space-y-2">
                {rivalry.bouts.map((bout: any, i: number) => (
                  <div key={bout.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{bout.title}</div>
                      {bout.description && (
                        <div className="text-xs text-muted-foreground truncate">{bout.description}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold">
                        <span className="text-blue-400">{bout.studentAPoints}</span>
                        <span className="text-muted-foreground mx-1">–</span>
                        <span className="text-red-400">{bout.studentBPoints}</span>
                      </div>
                      {bout.winnerId && (
                        <div className="text-xs text-emerald-400">
                          {bout.winnerId === rivalry.studentAId
                            ? `${rivalry.studentA.name} wins`
                            : `${rivalry.studentB.name} wins`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {isParticipant && (
            <ConvertStudentRPButton rivalryId={rivalry.id} availableRP={myScore} />
          )}

          {rivalry.loreEntries.length > 0 && (
            <div id="lore" className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4">📜 Lore Archive</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {[...rivalry.loreEntries].reverse().map((entry: any) => (
                  <div key={entry.id} className="border-b border-border/40 pb-4 last:border-0 last:pb-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {entry.weekNumber === 999 ? "Season Finale" : `Round ${entry.weekNumber}`}
                    </div>
                    <div className="font-bold text-sm mb-2">{entry.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{entry.narrative}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rivalry.strikes.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4 text-yellow-400">⚠️ Strike Log</h3>
              <div className="space-y-2">
                {rivalry.strikes.slice(0, 10).map((s: any) => (
                  <div key={s.id} className="text-xs bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <div className="text-muted-foreground">{s.reason}</div>
                    {s.mutedUntil && (
                      <div className="text-yellow-400 mt-0.5">
                        Muted until {new Date(s.mutedUntil).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING_ADMIN: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    PENDING_CR: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    ACTIVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    CONCLUDED: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    REJECTED: "bg-red-500/20 text-red-400 border-red-500/40",
    EXPIRED: "bg-muted/40 text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    PENDING_ADMIN: "Awaiting Admin",
    PENDING_CR: "Awaiting Opponent",
    ACTIVE: "⚔️ Active",
    CONCLUDED: "Concluded",
    REJECTED: "Rejected",
    EXPIRED: "Expired",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles[status] || styles.EXPIRED}`}>
      {labels[status] || status}
    </span>
  );
}
