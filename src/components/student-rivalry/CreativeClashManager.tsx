"use client";

import { useState } from "react";
import { recordStudentBout } from "@/actions/student-rivalry.actions";

type Props = {
  bout: any;
};

export default function CreativeClashManager({ bout }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const [gradesA, setGradesA] = useState({ creativity: 0, execution: 0, impact: 0 });
  const [gradesB, setGradesB] = useState({ creativity: 0, execution: 0, impact: 0 });

  const scoreA = (gradesA.creativity + gradesA.execution + gradesA.impact) * 10;
  const scoreB = (gradesB.creativity + gradesB.execution + gradesB.impact) * 10;

  async function handleRecordBout() {
    if (scoreA === 0 && scoreB === 0) {
      return alert("Please enter grades before finalizing.");
    }

    setSubmitting(true);
    try {
      await recordStudentBout({
        rivalryId: bout.studentRivalryId,
        title: `Creative Clash (Bout ${bout.round})`,
        studentAPoints: scoreA,
        studentBPoints: scoreB,
        description: `Teacher judged creative showdown. A: ${scoreA} | B: ${scoreB}`,
      });
      alert("Bout recorded successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to record bout");
    } finally {
      setSubmitting(false);
    }
  }

  const renderSlider = (
    label: string,
    value: number,
    setter: (val: number) => void,
    color: "blue" | "red"
  ) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold">
        <span className="text-muted-foreground uppercase tracking-wider text-xs">{label}</span>
        <span className={color === "blue" ? "text-blue-500" : "text-red-500"}>{value}/10</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => setter(parseInt(e.target.value))}
        className={`w-full accent-${color}-500 h-2 bg-muted rounded-lg appearance-none cursor-pointer`}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-950/40 via-card to-pink-950/40 border border-purple-500/30 rounded-2xl p-6">
        <h2 className="font-bold text-xl mb-1 text-purple-400">🎨 Creative Clash Judging</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Review the creative submissions (diagrams, essays, code architectures) provided by the students in the War Room server. Grade each submission on a scale of 1-10 across three categories.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-blue-500/30 rounded-2xl p-6 shadow-[0_0_15px_-3px_rgba(59,130,246,0.1)]">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
            <div>
              <h3 className="font-black text-xl text-blue-500">{bout.rivalry.studentA.name}</h3>
              <p className="text-xs text-muted-foreground font-semibold">Challenger</p>
            </div>
            <div className="text-4xl font-black text-blue-500 tabular-nums">{scoreA}</div>
          </div>

          <div className="space-y-6">
            {renderSlider("Creativity", gradesA.creativity, (v) => setGradesA({ ...gradesA, creativity: v }), "blue")}
            {renderSlider("Execution", gradesA.execution, (v) => setGradesA({ ...gradesA, execution: v }), "blue")}
            {renderSlider("Impact", gradesA.impact, (v) => setGradesA({ ...gradesA, impact: v }), "blue")}
          </div>
        </div>

        <div className="bg-card border border-red-500/30 rounded-2xl p-6 shadow-[0_0_15px_-3px_rgba(239,68,68,0.1)]">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-border">
            <div>
              <h3 className="font-black text-xl text-red-500">{bout.rivalry.studentB.name}</h3>
              <p className="text-xs text-muted-foreground font-semibold">Defender</p>
            </div>
            <div className="text-4xl font-black text-red-500 tabular-nums">{scoreB}</div>
          </div>

          <div className="space-y-6">
            {renderSlider("Creativity", gradesB.creativity, (v) => setGradesB({ ...gradesB, creativity: v }), "red")}
            {renderSlider("Execution", gradesB.execution, (v) => setGradesB({ ...gradesB, execution: v }), "red")}
            {renderSlider("Impact", gradesB.impact, (v) => setGradesB({ ...gradesB, impact: v }), "red")}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <h3 className="font-bold text-lg mb-2">Final Verdict</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {scoreA > scoreB
            ? `${bout.rivalry.studentA.name} takes the lead with a more compelling submission!`
            : scoreB > scoreA
            ? `${bout.rivalry.studentB.name} takes the win with superior creativity!`
            : "It's currently a dead heat. Adjust the sliders to break the tie, or submit a draw."}
        </p>

        <button
          onClick={handleRecordBout}
          disabled={submitting}
          className="w-full max-w-md mx-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? "Committing Verdict..." : "⚖️ Seal the Verdict & Record"}
        </button>
      </div>
    </div>
  );
}
