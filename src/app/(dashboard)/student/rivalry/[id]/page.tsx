import { auth } from "@clerk/nextjs/server";
import { getRivalryById, getMyRivalryMembership, amITheCR } from "@/actions/rivalry.actions";
import prisma from "@/lib/prisma";
import RivalryScoreboard from "@/components/rivalry/RivalryScoreboard";
import DrawAnimation from "@/components/rivalry/DrawAnimation";
import { ConvertRPButton, ConcludeRivalryButton } from "@/components/rivalry/RivalryActionButtons";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function RivalryDetailPage({ params }: { params: { id: string } }) {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const rivalry = await getRivalryById(params.id);
  if (!rivalry) notFound();

  let seasonName = rivalry.season;
  if (rivalry.seasonId) {
    const season = await prisma.season.findUnique({ where: { id: rivalry.seasonId } });
    if (season) {
      seasonName = `${season.seasonCode} ${season.displayName ? `(${season.displayName})` : ""}`;
    }
  }

  const [membership, isCR] = await Promise.all([
    getMyRivalryMembership(params.id),
    amITheCR(),
  ]);

  const isAdmin = role === "admin";
  const myRP = membership?.pointsContributed ?? 0;

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
                <span className="text-blue-400">{rivalry.classA.name}</span>
                <span className="text-muted-foreground mx-3">vs</span>
                <span className="text-red-400">{rivalry.classB.name}</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {rivalry.battlefieldServerId && (
                <Link
                  href={`/servers`}
                  className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-500/30 transition-colors"
                >
                  🏰 Enter Battlefield Server
                </Link>
              )}
              {isAdmin && rivalry.status === "ACTIVE" && (
                <ConcludeRivalryButton rivalryId={rivalry.id} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <StatusBadge status={rivalry.status} />
            <span className="text-xs text-muted-foreground">{rivalry.bouts.length} bouts played</span>
            <span className="text-xs text-muted-foreground">{rivalry.members.length} warriors enrolled</span>
            {rivalry.strikes.length > 0 && (
              <span className="text-xs text-yellow-400">{rivalry.strikes.length} strikes issued</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">

          <RivalryScoreboard rivalryId={rivalry.id} />

          {rivalry.status === "ACTIVE" && (
            <DrawAnimation
              rivalryId={rivalry.id}
              classAName={rivalry.classA.name}
              classBName={rivalry.classB.name}
              isCR={isCR}
            />
          )}

          {rivalry.bouts.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span>⚔️</span> Bout History
              </h3>
              <div className="space-y-2">
                {rivalry.bouts.map((bout, i) => (
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
                        <span className="text-blue-400">{bout.classAPoints}</span>
                        <span className="text-muted-foreground mx-1">–</span>
                        <span className="text-red-400">{bout.classBPoints}</span>
                      </div>
                      {bout.winnerId && (
                        <div className="text-xs text-emerald-400">
                          {bout.winnerId === rivalry.classAId ? rivalry.classA.name : rivalry.classB.name} wins
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
          {membership && (
            <ConvertRPButton rivalryId={rivalry.id} availableRP={myRP} />
          )}

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">⚡ Warriors</h3>
            <div className="space-y-4">
              {[
                { classId: rivalry.classAId, className: rivalry.classA.name, color: "blue" },
                { classId: rivalry.classBId, className: rivalry.classB.name, color: "red" },
              ].map(({ classId, className, color }) => {
                const classMembers = rivalry.members.filter((m) => m.classId === classId);
                return (
                  <div key={classId}>
                    <div className={`text-xs font-bold mb-2 ${color === "blue" ? "text-blue-400" : "text-red-400"}`}>
                      {className} ({classMembers.length})
                    </div>
                    {classMembers.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No warriors drawn yet</div>
                    ) : (
                      <div className="space-y-1">
                        {classMembers.slice(0, 8).map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate">
                                {m.student ? `${m.student.name} ${m.student.surname}` : m.studentId.slice(-6)}
                              </span>
                              {m.student?.username && (
                                <span className="text-muted-foreground shrink-0">@{m.student.username}</span>
                              )}
                            </div>
                            <span className={`font-bold shrink-0 ml-2 ${m.isReserve ? "text-muted-foreground" : color === "blue" ? "text-blue-400" : "text-red-400"}`}>
                              {m.isReserve ? "reserve" : `${Math.floor(m.pointsContributed)} RP`}
                            </span>
                          </div>
                        ))}
                        {classMembers.length > 8 && (
                          <div className="text-xs text-muted-foreground">+{classMembers.length - 8} more</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {rivalry.loreEntries.length > 0 && (
            <div id="lore" className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4">📜 Lore Archive</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {[...rivalry.loreEntries].reverse().map((entry) => (
                  <div key={entry.id} className="border-b border-border/40 pb-4 last:border-0 last:pb-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {entry.weekNumber === 999 ? "Season Finale" : `Week ${entry.weekNumber}`}
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
                {rivalry.strikes.slice(0, 10).map((s) => (
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
  const map: Record<string, { label: string; cls: string }> = {
    PENDING_ADMIN: { label: "Awaiting Admin", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
    PENDING_CR:    { label: "Awaiting CRs",   cls: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
    ACTIVE:        { label: "⚔️ ACTIVE",       cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
    CONCLUDED:     { label: "🏆 Concluded",    cls: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
    REJECTED:      { label: "Rejected",        cls: "bg-red-500/20 text-red-400 border-red-500/40" },
    EXPIRED:       { label: "Expired",         cls: "bg-muted/40 text-muted-foreground border-border" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cls}`}>{label}</span>;
}
