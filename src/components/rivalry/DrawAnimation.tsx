"use client";

import { useState, useCallback, useEffect } from "react";
import { drawRivalryParticipants, getEligibleWarriors, selectRivalryParticipants, removeRivalryMembers } from "@/actions/rivalry.actions";

type Participant = { id: string; name: string; username: string };

type Props = {
  rivalryId: string;
  classAName: string;
  classBName: string;
  isCR: boolean;
};

const SPINNER_CHARS = ["⚔", "🔥", "💥", "🏆", "⚡", "💣", "🎯", "👊"];

function SlotReel({ finalName, spinning }: { finalName: string; spinning: boolean }) {
  return (
    <div
      className={`h-10 flex items-center justify-center rounded-lg border font-bold text-sm px-3 transition-all duration-300 overflow-hidden
        ${spinning
          ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 animate-pulse"
          : "bg-emerald-500/20 border-emerald-500 text-emerald-400"
        }`}
    >
      {spinning ? SPINNER_CHARS[Math.floor(Math.random() * SPINNER_CHARS.length)] : finalName}
    </div>
  );
}

export default function DrawAnimation({ rivalryId, classAName, classBName, isCR }: Props) {
  const [tab, setTab] = useState<"random" | "select">("random");
  const [count, setCount] = useState(5);

  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const [drawn, setDrawn] = useState<{ classA: Participant[]; classB: Participant[] } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  type WarriorItem = Participant & { isEnrolled: boolean; memberId: string | null };

  const [warriors, setWarriors] = useState<WarriorItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialEnrolled, setInitialEnrolled] = useState<Set<string>>(new Set());
  const [selectLoading, setSelectLoading] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [selectDone, setSelectDone] = useState(false);

  useEffect(() => {
    if (tab === "select" && isCR) {
      setSelectLoading(true);
      getEligibleWarriors(rivalryId)
        .then((data) => {
          setWarriors(data.warriors);
          const enrolled = new Set(data.warriors.filter((w) => w.isEnrolled).map((w) => w.id));
          setInitialEnrolled(enrolled);
          setSelected(enrolled);
          setSelectDone(false);
        })
        .catch((e: any) => setSelectError(e?.message || "Failed to load warriors"))
        .finally(() => setSelectLoading(false));
    }
  }, [tab, rivalryId, isCR]);

  const runDraw = useCallback(async () => {
    setDrawError(null);
    setPhase("spinning");
    setSpinning(true);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= 6) clearInterval(interval);
    }, 200);

    try {
      const result = await drawRivalryParticipants(rivalryId, count);
      await new Promise((res) => setTimeout(res, 1400));
      clearInterval(interval);
      setDrawn(result);
      setSpinning(false);
      setPhase("done");
    } catch (e: any) {
      clearInterval(interval);
      setDrawError(e?.message || "Draw failed");
      setSpinning(false);
      setPhase("idle");
    }
  }, [rivalryId, count]);

  const resetDraw = () => {
    setPhase("idle");
    setDrawn(null);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitSelection = async () => {
    setSelectError(null);
    try {
      const toAdd = Array.from(selected).filter((id) => !initialEnrolled.has(id));
      const toRemove = Array.from(initialEnrolled).filter((id) => !selected.has(id));
      const removeMemberIds = warriors
        .filter((w) => toRemove.includes(w.id) && w.memberId)
        .map((w) => w.memberId!);

      if (toAdd.length > 0) {
        await selectRivalryParticipants(rivalryId, toAdd);
      }
      if (removeMemberIds.length > 0) {
        await removeRivalryMembers(rivalryId, removeMemberIds);
      }
      setSelectDone(true);
    } catch (e: any) {
      setSelectError(e?.message || "Selection failed");
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setTab("random")}
          className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${
            tab === "random"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          🎰 Random Draw
        </button>
        {isCR && (
          <button
            onClick={() => setTab("select")}
            className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${
              tab === "select"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            👑 CR Select
          </button>
        )}
      </div>

      {tab === "random" && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg tracking-tight">Random Draw</h2>
            {phase === "done" && (
              <button
                onClick={resetDraw}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1"
              >
                Re-draw
              </button>
            )}
          </div>

          {phase === "idle" && (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <label className="text-sm text-muted-foreground">Warriors per class:</label>
                <input
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-muted border border-border rounded-lg px-2 py-1 text-center text-sm focus:outline-none"
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Draw {count} random warrior{count > 1 ? "s" : ""} from each class for the next bout.
              </p>
              <button
                onClick={runDraw}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all active:scale-95 text-lg"
              >
                ⚔️ Pull the Draw
              </button>
              {drawError && <p className="text-red-400 text-sm">{drawError}</p>}
            </div>
          )}

          {(phase === "spinning" || phase === "done") && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-center font-semibold text-sm text-blue-400 mb-3">{classAName}</div>
                {Array.from({ length: count }).map((_, i) => (
                  <SlotReel
                    key={i}
                    finalName={drawn?.classA[i]?.name ?? "???"}
                    spinning={phase !== "done" && (spinning || !drawn?.classA[i])}
                  />
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-center font-semibold text-sm text-red-400 mb-3">{classBName}</div>
                {Array.from({ length: count }).map((_, i) => (
                  <SlotReel
                    key={i}
                    finalName={drawn?.classB[i]?.name ?? "???"}
                    spinning={phase !== "done" && (spinning || !drawn?.classB[i])}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === "done" && drawn && (
            <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
              Warriors locked in. They&apos;ve been added to the rivalry roster.
            </div>
          )}
        </>
      )}

      {tab === "select" && isCR && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg tracking-tight">CR Select</h2>
            {selectDone && (
              <button
                onClick={() => setSelectDone(false)}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1"
              >
                Edit Roster
              </button>
            )}
          </div>

          {selectLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading warriors...</div>
          )}

          {!selectLoading && !selectDone && (
            <div className="space-y-4">
              {warriors.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Your class has no students enrolled.
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Check to enroll, uncheck to remove. Only checked students will be in the rivalry roster.
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-xl p-3">
                    {warriors.map((s) => (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selected.has(s.id) ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          className="w-4 h-4 accent-foreground"
                        />
                        <span className="text-sm font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">@{s.username}</span>
                        {s.isEnrolled && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                            in roster
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={submitSelection}
                      className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold px-6 py-2 rounded-xl transition-all active:scale-95"
                    >
                      Save Roster ({selected.size})
                    </button>
                    {selectError && <p className="text-red-400 text-sm">{selectError}</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {selectDone && (
            <div className="text-center py-6 text-emerald-400 text-sm font-medium">
              Roster updated successfully.
            </div>
          )}
        </>
      )}
    </div>
  );
}
