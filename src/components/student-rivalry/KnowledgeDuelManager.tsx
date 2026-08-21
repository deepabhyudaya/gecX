"use client";

import { useState } from "react";
import { recordStudentBout } from "@/actions/student-rivalry.actions";

type Props = {
  bout: any;
};

export default function KnowledgeDuelManager({ bout }: Props) {
  const [questions, setQuestions] = useState([{ q: "", a: "" }]);
  const [active, setActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);

  const addQuestion = () => setQuestions([...questions, { q: "", a: "" }]);

  async function handleRecordBout() {
    setSubmitting(true);
    try {
      await recordStudentBout({
        rivalryId: bout.studentRivalryId,
        title: `Knowledge Duel (Round ${bout.round})`,
        studentAPoints: scoreA,
        studentBPoints: scoreB,
        description: `Teacher judged bout. Score: ${scoreA} - ${scoreB}`,
      });
      alert("Bout recorded successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to record bout");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-lg">Question Configuration</h2>
            <button
              onClick={() => setActive(!active)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                active
                  ? "bg-red-500/10 text-red-500 border border-red-500/30"
                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
              }`}
            >
              {active ? "End Duel" : "Start Live Duel"}
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-4 p-4 border border-border/50 rounded-xl bg-muted/20">
                <div className="text-xs font-bold text-muted-foreground pt-3">Q{i + 1}</div>
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    placeholder="Enter the question..."
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <input
                    type="text"
                    placeholder="Correct answer/keywords..."
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="w-full mt-4 py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-sm font-bold"
          >
            + Add Question
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-gradient-to-br from-card to-muted border border-border rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500" />

          <h2 className="font-bold text-lg mb-6">Live Scoring</h2>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-blue-500 mb-2">{bout.rivalry.studentA.name}</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setScoreA(Math.max(0, scoreA - 10))}
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold hover:bg-muted-foreground/20"
                >-10</button>
                <div className="flex-1 text-center text-3xl font-black tabular-nums">{scoreA}</div>
                <button
                  onClick={() => setScoreA(scoreA + 10)}
                  className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold hover:bg-blue-500/30"
                >+10</button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-red-500 mb-2">{bout.rivalry.studentB.name}</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setScoreB(Math.max(0, scoreB - 10))}
                  className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold hover:bg-muted-foreground/20"
                >-10</button>
                <div className="flex-1 text-center text-3xl font-black tabular-nums">{scoreB}</div>
                <button
                  onClick={() => setScoreB(scoreB + 10)}
                  className="w-10 h-10 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center font-bold hover:bg-red-500/30"
                >+10</button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <button
              onClick={handleRecordBout}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              {submitting ? "Committing..." : "Finalize & Record Bout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
