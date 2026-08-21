import { auth } from "@clerk/nextjs/server";
import { getAllRivalries, electClassRepresentative, getCRForClass } from "@/actions/rivalry.actions";
import { getActiveSeasonForWar } from "@/actions/season.actions";
import { AdminRivalryButtons, ConcludeRivalryButton, DeleteRivalryButton } from "@/components/rivalry/RivalryActionButtons";
import Link from "next/link";
import moment from "moment";
import prisma from "@/lib/prisma";

const STATUS_STYLE: Record<string, string> = {
  PENDING_ADMIN: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  PENDING_CR:    "bg-blue-500/20 text-blue-400 border-blue-500/40",
  ACTIVE:        "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  CONCLUDED:     "bg-purple-500/20 text-purple-400 border-purple-500/40",
  REJECTED:      "bg-red-500/20 text-red-400 border-red-500/40",
  EXPIRED:       "bg-muted/40 text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_ADMIN: "Awaiting Admin",
  PENDING_CR:    "Awaiting CRs",
  ACTIVE:        "⚔️ Active",
  CONCLUDED:     "Concluded",
  REJECTED:      "Rejected",
  EXPIRED:       "Expired",
};

export default async function RivalriesAdminPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { sessionClaims, userId } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== "admin" || !userId) return <div className="p-8 text-red-400">Access Denied</div>;

  const admin = await prisma.admin.findUnique({ where: { id: userId } });

  const filter = searchParams.status;
  const [rivalries, activeSeason] = await Promise.all([
    getAllRivalries(filter),
    getActiveSeasonForWar(admin?.collegeId ?? null, "BRANCH"),
  ]);

  const classes = await prisma.class.findMany({
    include: { students: { select: { id: true, name: true, surname: true, username: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto h-full pb-24">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <span>⚔️</span> Branch Wars
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage proposals · approve wars · track the battlefield
            </p>
          </div>
          <div className="flex items-center gap-6">
            {activeSeason && (
              <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl p-2 pr-4 shadow-sm">
                {activeSeason.iconUrl ? (
                  <img src={activeSeason.iconUrl} alt="Season" className="w-10 h-10 rounded-lg object-cover bg-muted" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-black text-xs">
                    {activeSeason.seasonCode}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Season</span>
                  <span className="font-black text-sm text-foreground">
                    {activeSeason.seasonCode} {activeSeason.displayName ? `(${activeSeason.displayName})` : ""}
                  </span>
                </div>
              </div>
            )}
            <div className="text-right">
              <div className="text-3xl font-black">{rivalries.length}</div>
              <div className="text-xs text-muted-foreground">total rivalries</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[undefined, "PENDING_ADMIN", "PENDING_CR", "ACTIVE", "CONCLUDED", "REJECTED", "EXPIRED"].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/list/rivalries?status=${s}` : "/list/rivalries"}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === s || (!filter && !s)
                  ? "bg-foreground text-background border-transparent"
                  : "border-border text-muted-foreground hover:bg-muted/40"
              }`}
            >
              {s ? STATUS_LABEL[s] : "All"}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rivalries.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
            No rivalries found.
          </div>
        )}
        {rivalries.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-base text-blue-400">{r.classA.name}</span>
                  <span className="text-muted-foreground font-black">VS</span>
                  <span className="font-bold text-base text-red-400">{r.classB.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>Season: <strong className="text-foreground">{r.seasonRef?.seasonCode || r.season}</strong></span>
                  <span>Bouts: <strong className="text-foreground">{r.bouts.length}</strong></span>
                  <span>Members: <strong className="text-foreground">{r.members.length}</strong></span>
                  <span>Proposed: {moment(r.createdAt).fromNow()}</span>
                  {r.status === "PENDING_ADMIN" && (
                    <span className="text-yellow-400">Expires {moment(r.autoExpiresAt).fromNow()}</span>
                  )}
                </div>

                {r.status === "ACTIVE" && (
                  <div className="mt-2 text-sm">
                    <span className="text-blue-400 font-bold">{Math.round(r.classAScore)}</span>
                    <span className="text-muted-foreground mx-2">—</span>
                    <span className="text-red-400 font-bold">{Math.round(r.classBScore)}</span>
                    <span className="text-xs text-muted-foreground ml-2">(raw points)</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <Link
                  href={`/student/rivalry/${r.id}`}
                  className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
                >
                  View →
                </Link>
                {r.status === "PENDING_ADMIN" && <AdminRivalryButtons rivalryId={r.id} />}
                {r.status === "ACTIVE" && <ConcludeRivalryButton rivalryId={r.id} />}
                <DeleteRivalryButton rivalryId={r.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-1">Branch Representative Management</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Select CRs to enable the CR approval step in rivalries. Only the CR of each branch can declare war.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classes.map((cls) => (
            <CRManagementCard key={cls.id} cls={cls} />
          ))}
        </div>
      </div>
    </div>
  );
}

async function CRManagementCard({
  cls,
}: {
  cls: {
    id: number;
    name: string;
    students: { id: string; name: string; surname: string; username: string }[];
  };
}) {
  const cr = await getCRForClass(cls.id);
  const currentCR = cr ? cls.students.find((s) => s.id === cr.studentId) : null;

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <div className="font-semibold text-sm">{cls.name}</div>
      {currentCR ? (
        <div className="flex items-center gap-2">
          <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded-full">CR</span>
          <span className="text-sm font-medium">{currentCR.name} {currentCR.surname}</span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No CR elected</div>
      )}
      <CRElectForm classId={cls.id} students={cls.students} currentCRId={cr?.studentId} />
    </div>
  );
}

function CRElectForm({
  classId,
  students,
  currentCRId,
}: {
  classId: number;
  students: { id: string; name: string; surname: string }[];
  currentCRId?: string;
}) {
  return (
    <form
      action={async (fd: FormData) => {
        "use server";
        const studentId = fd.get("studentId") as string;
        if (studentId) await electClassRepresentative(classId, studentId);
      }}
      className="flex gap-2"
    >
      <select
        name="studentId"
        defaultValue={currentCRId ?? ""}
        className="flex-1 bg-muted border border-border rounded-lg px-2 py-1 text-xs focus:outline-none"
      >
        <option value="">Select student…</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {s.surname}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors"
      >
        Set CR
      </button>
    </form>
  );
}
