import { getTeacherWarJudgments } from "@/actions/student-rivalry.actions";
import TeacherWarActionButtons from "@/components/student-rivalry/TeacherWarActionButtons";
import Link from "next/link";

export default async function TeacherWarsDashboard() {
  const judgments = await getTeacherWarJudgments();

  const pendingNomination = judgments.filter((j) => j.teacherStatus === "NOMINATED");
  const activeBouts = judgments.filter(
    (j) => j.teacherStatus === "ACCEPTED" && j.status !== "COMPLETED"
  );
  const completedBouts = judgments.filter((j) => j.status === "COMPLETED");

  return (
    <div className="flex-1 m-4 mt-0 flex flex-col gap-6 overflow-y-auto pb-24">
      <div className="relative bg-gradient-to-r from-amber-950 via-card to-orange-950 border border-amber-900/50 rounded-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/5" />
        <div className="relative">
          <h1 className="text-2xl font-black tracking-tight text-amber-500">
            🧑‍🏫 War Judgments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your requested and active student duel judgments.
          </p>
        </div>
      </div>

      {pendingNomination.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-amber-400">Action Required: Pending Nominations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingNomination.map((bout) => (
              <div
                key={bout.id}
                className="bg-card border border-amber-500/30 rounded-2xl p-5 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">
                      {bout.rivalry.studentA.name} vs {bout.rivalry.studentB.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Nominated on {new Date(bout.conductedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-lg uppercase tracking-wide">
                    {bout.warType?.name || "Unknown Type"}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border">
                  <span className="font-semibold text-foreground block mb-1">Judge Role:</span>
                  {bout.warType?.description}
                </div>

                <div className="flex gap-3 pt-2">
                  <TeacherWarActionButtons boutId={bout.id} action="accept" />
                  <TeacherWarActionButtons boutId={bout.id} action="decline" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeBouts.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg text-emerald-400">Active Judgments</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeBouts.map((bout) => (
              <div
                key={bout.id}
                className="bg-card border border-emerald-500/30 rounded-2xl p-5 space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">
                      {bout.rivalry.studentA.name} vs {bout.rivalry.studentB.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary font-bold rounded-lg">
                        Round {bout.round}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {bout.warType?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/teacher/wars/${bout.id}`}
                  className="block w-full text-center bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold py-3 rounded-xl transition-all shadow-md"
                >
                  Enter War Room
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {judgments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-60">
          <div className="text-4xl">🕊️</div>
          <h3 className="font-bold text-lg">Peace Time</h3>
          <p className="text-sm">You haven't been nominated to judge any student wars yet.</p>
        </div>
      )}
    </div>
  );
}
