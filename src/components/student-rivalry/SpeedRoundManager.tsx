"use client";

import { useState, useEffect, useRef } from "react";
import { recordStudentBout } from "@/actions/student-rivalry.actions";

type Props = {
  bout: any;
};

export default function SpeedRoundManager({ bout }: Props) {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [activeQuestion, setActiveQuestion] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerStatus, setTimerStatus] = useState<"IDLE" | "COUNTDOWN" | "ACTIVE">("IDLE");
  const [buzzerWinner, setBuzzerWinner] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerStatus === "COUNTDOWN" && countdown !== null) {
      if (countdown > 0) {
        interval = setInterval(() => setCountdown((c) => (c ? c - 1 : 0)), 1000);
      } else {
        setTimerStatus("ACTIVE");
      }
    }
    return () => clearInterval(interval);
  }, [timerStatus, countdown]);

  const startNextRound = () => {
    if (!activeQuestion.trim()) return alert("Enter a question first.");
    setBuzzerWinner(null);
    setCountdown(3);
    setTimerStatus("COUNTDOWN");
  };

  const simulateBuzzer = (student: "A" | "B") => {
    if (timerStatus !== "ACTIVE" || buzzerWinner) return;
    setBuzzerWinner(student);
  };

  const awardPointsAndReset = (student: "A" | "B" | "NONE") => {
    if (student === "A") setScoreA((s) => s + 50);
    if (student === "B") setScoreB((s) => s + 50);

    setTimerStatus("IDLE");
    setBuzzerWinner(null);
    setActiveQuestion("");
  };

  async function handleRecordBout() {
    setSubmitting(true);
    try {
      await recordStudentBout({
        rivalryId: bout.studentRivalryId,
        title: `Speed Round (Bout ${bout.round})`,
        studentAPoints: scoreA,
        studentBPoints: scoreB,
        description: `High-speed trivia bout. Score: ${scoreA} - ${scoreB}`,
      });
      alert("Bout recorded successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to record bout");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="font-bold text-xl mb-1 text-red-500">⚡ Speed Round Controller</h2>
          <p className="text-sm text-muted-foreground">
            Type the question. Initiate the countdown. First to buzz in gets to answer. 50 points per correct answer.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Current Prompt
          </label>
          <textarea
            value={activeQuestion}
            onChange={(e) => setActiveQuestion(e.target.value)}
            disabled={timerStatus !== "IDLE"}
            placeholder="E.g. What is the time complexity of QuickSort in the worst case?"
            className="w-full bg-muted/20 border border-border rounded-xl p-4 resize-none h-24 focus:ring-2 focus:ring-red-500/50 outline-none transition-all disabled:opacity-50"
          />
        </div>

        {timerStatus === "IDLE" && (
          <button
            onClick={startNextRound}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl transition-transform active:scale-95 shadow-lg shadow-red-500/20"
          >
            START COUNTDOWN
          </button>
        )}

        {timerStatus === "COUNTDOWN" && (
          <div className="w-full bg-muted border border-border py-4 rounded-xl flex justify-center items-center">
            <span className="text-4xl font-black text-red-500 animate-pulse">
              {countdown}
            </span>
          </div>
        )}

        {timerStatus === "ACTIVE" && !buzzerWinner && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/50 py-4 rounded-xl flex justify-center items-center">
            <span className="text-2xl font-black text-emerald-500 animate-pulse uppercase tracking-widest">
              BUZZERS LIVE
            </span>
          </div>
        )}

        {buzzerWinner && (
          <div className="w-full bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl text-center space-y-4">
            <h3 className="font-bold text-xl text-blue-500">
              {buzzerWinner === "A" ? bout.rivalry.studentA.name : bout.rivalry.studentB.name} Buzzed First!
            </h3>
            <p className="text-sm text-muted-foreground">Did they answer correctly?</p>
            <div className="flex gap-3">
              <button
                onClick={() => awardPointsAndReset(buzzerWinner)}
                className="flex-1 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 font-bold py-2 rounded-lg"
              >
                Yes (+50)
              </button>
              <button
                onClick={() => awardPointsAndReset("NONE")}
                className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500/30 font-bold py-2 rounded-lg"
              >
                No (0)
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6 flex flex-col">
        {timerStatus === "ACTIVE" && !buzzerWinner && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-4">
            <button
              onClick={() => simulateBuzzer("A")}
              className="flex-1 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-95 text-white font-black text-xl py-8 rounded-xl shadow-xl transition-all border-b-4 border-blue-900"
            >
              {bout.rivalry.studentA.name} BUZZ
            </button>
            <button
              onClick={() => simulateBuzzer("B")}
              className="flex-1 bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 active:scale-95 text-white font-black text-xl py-8 rounded-xl shadow-xl transition-all border-b-4 border-red-900"
            >
              {bout.rivalry.studentB.name} BUZZ
            </button>
          </div>
        )}

        <div className="flex-1 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-lg mb-6">Match Score</h2>

            <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20 mb-4">
              <span className="font-bold text-blue-500">{bout.rivalry.studentA.name}</span>
              <span className="text-3xl font-black tabular-nums">{scoreA}</span>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
              <span className="font-bold text-red-500">{bout.rivalry.studentB.name}</span>
              <span className="text-3xl font-black tabular-nums">{scoreB}</span>
            </div>
          </div>

          <button
            onClick={handleRecordBout}
            disabled={submitting}
            className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Committing..." : "Finalize & Record Bout"}
          </button>
        </div>
      </div>
    </div>
  );
}
