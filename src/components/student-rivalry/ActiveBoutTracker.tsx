"use client";

import { useEffect, useState } from "react";

function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return "now";
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay > 0) return `in ${diffDay}d ${diffHour % 24}h`;
  if (diffHour > 0) return `in ${diffHour}h ${diffMin % 60}m`;
  if (diffMin > 0) return `in ${diffMin}m ${diffSec % 60}s`;
  return `in ${diffSec}s`;
}

type Props = {
  activeBout: any;
  studentA: any;
  studentB: any;
};

export default function ActiveBoutTracker({ activeBout, studentA, studentB }: Props) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!activeBout) return;

    const end = new Date(activeBout.conductedAt);
    const durationHours = activeBout.warType?.minDurationHours || 24;
    end.setHours(end.getHours() + durationHours);

    const interval = setInterval(() => {
      const now = new Date();
      if (now > end) {
        setTimeLeft("Time's Up! Calculating Final Score...");
      } else {
        setTimeLeft(formatDistanceToNow(end));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBout]);

  if (!activeBout) return null;

  const isAutomated = !activeBout.warType?.requiresTeacher;
  const isTeacherLed = activeBout.warType?.requiresTeacher;

  return (
    <div className="bg-gradient-to-br from-card to-muted border border-border rounded-2xl p-6 relative overflow-hidden">
      {isAutomated && <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />}
      {isTeacherLed && <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />}

      <div className="relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-2">
              <span className="animate-pulse w-2 h-2 rounded-full bg-red-500" />
              Active Bout {activeBout.round}
            </div>
            <h2 className="text-xl font-black">{activeBout.warType?.name || "Unknown Type"}</h2>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-muted-foreground">Ends</div>
            <div className="text-sm font-bold text-foreground">{timeLeft || "Calculating..."}</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {activeBout.warType?.description}
        </p>

        {isTeacherLed && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 text-center space-y-2">
            <div className="text-3xl">🧑‍🏫</div>
            <h3 className="font-bold text-blue-500">Awaiting Teacher Judgment</h3>
            <p className="text-xs text-muted-foreground">
              This bout requires manual judgment. The nominated teacher will process the match securely in their dashboard.
            </p>
            {activeBout.teacherStatus === "NOMINATED" && (
              <p className="text-xs font-bold text-yellow-500 mt-2">
                Teacher is currently reviewing the nomination.
              </p>
            )}
            {activeBout.teacherStatus === "ACCEPTED" && (
              <p className="text-xs font-bold text-emerald-500 mt-2">
                Teacher accepted! Match is active.
              </p>
            )}
          </div>
        )}

        {isAutomated && activeBout.warType?.name === "Karma Sprint" && (
          <div className="space-y-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Live Tracker (Simulated)
            </div>

            <div className="space-y-3">
              <div className="bg-card border border-border rounded-xl p-3 flex justify-between items-center shadow-sm">
                <span className="font-bold text-blue-400">{studentA.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Karma Gained</span>
                  <span className="text-lg font-black">{activeBout.studentAPoints || 0}</span>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 flex justify-between items-center shadow-sm">
                <span className="font-bold text-red-400">{studentB.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">Karma Gained</span>
                  <span className="text-lg font-black">{activeBout.studentBPoints || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-xs text-orange-400 mt-4">
              <strong>Automated:</strong> The platform records all karma generated from Q&A helpfulness while this bout is active. Points will finalize automatically.
            </div>
          </div>
        )}

        {isAutomated && activeBout.warType?.name === "Attendance Siege" && (
          <div className="space-y-4">
             <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Live Tracker (Simulated)
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400">
              <strong>Automated:</strong> Any unauthorized absence by either student will instantly result in point deductions. Survive 14 days.
            </div>
          </div>
        )}

        {isAutomated && activeBout.warType?.name !== "Karma Sprint" && activeBout.warType?.name !== "Attendance Siege" && (
          <div className="bg-muted border border-border rounded-xl p-5 text-center">
             Tracking system active. Automated CRON checks running.
          </div>
        )}
      </div>
    </div>
  );
}
