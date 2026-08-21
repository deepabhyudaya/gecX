"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Clock,
  Award,
  CheckCircle2,
  Users,
  Calendar,
  Layers,
  Edit3,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { gradeFormResponse } from "@/actions/form.actions";

interface FormAnalyticsWorkspaceProps {
  form: {
    id: string;
    title: string;
    description: string | null;
    type: "GENERAL" | "EXAM" | "ASSIGNMENT";
    questions: Array<{
      id: string;
      type: string;
      title: string;
      points: number | null;
      options: Array<{
        id: string;
        text: string;
      }>;
    }>;
    responses: Array<{
      id: string;
      submittedById: string;
      submittedAt: Date;
      score: number | null;
      isGraded: boolean;
      student: {
        name: string;
        surname: string;
      } | null;
      answers: Array<{
        questionId: string;
        textResponse: string | null;
        selectedOptionIds: string[];
      }>;
    }>;
  };
}

export default function FormAnalyticsWorkspace({ form }: FormAnalyticsWorkspaceProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [selectedResponse, setSelectedResponse] = useState<typeof form.responses[0] | null>(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>({});
  const [grading, startGradingTransition] = useTransition();

  const totalSubmissions = form.responses.length;
  const examOrAssignment = form.type === "EXAM" || form.type === "ASSIGNMENT";

  let averageScore = 0;
  let highestScore = 0;
  let gradedCount = 0;

  if (totalSubmissions > 0 && examOrAssignment) {
    const scores = form.responses.map((r) => r.score || 0);
    averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalSubmissions);
    highestScore = Math.max(...scores);
    gradedCount = form.responses.filter((r) => r.isGraded).length;
  }

  const brackets = [
    { name: "0-59", count: 0 },
    { name: "60-69", count: 0 },
    { name: "70-79", count: 0 },
    { name: "80-89", count: 0 },
    { name: "90-100", count: 0 },
  ];

  if (examOrAssignment) {
    form.responses.forEach((r) => {
      const score = r.score || 0;
      if (score < 60) brackets[0].count++;
      else if (score < 70) brackets[1].count++;
      else if (score < 80) brackets[2].count++;
      else if (score < 90) brackets[3].count++;
      else brackets[4].count++;
    });
  }

  const handleOpenGrading = (response: typeof form.responses[0]) => {
    setSelectedResponse(response);
    const initialScores: Record<string, number> = {};

    response.answers.forEach((ans) => {
      const question = form.questions.find((q) => q.id === ans.questionId);
      if (question && (question.type === "SHORT_TEXT" || question.type === "LONG_TEXT")) {

        initialScores[ans.questionId] = 0;
      }
    });
    setGradingScores(initialScores);
  };

  const handleManualGradeSubmit = () => {
    if (!selectedResponse) return;

    startGradingTransition(async () => {
      try {
        await gradeFormResponse(selectedResponse.id, gradingScores);
        toast.success("Manual grade saved successfully!");
        setSelectedResponse(null);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Failed to update grades");
      }
    });
  };

  const getQuestionChartData = (qId: string) => {
    const question = form.questions.find((q) => q.id === qId);
    if (!question) return [];

    const optCounts: Record<string, number> = {};
    question.options.forEach((o) => {
      optCounts[o.id] = 0;
    });

    form.responses.forEach((r) => {
      const answer = r.answers.find((a) => a.questionId === qId);
      if (answer) {
        answer.selectedOptionIds.forEach((id) => {
          if (optCounts[id] !== undefined) {
            optCounts[id]++;
          }
        });
      }
    });

    return question.options.map((o) => ({
      name: o.text,
      count: optCounts[o.id] || 0,
    }));
  };

  const COLORS = ["#3b82f6", "#10b981", "#fb923c", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between bg-card border border-border p-6 rounded-xl shadow-sm flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-black text-foreground tracking-tight">{form.title}</h1>
          <p className="text-xs text-muted-foreground mt-1">Analytics Dashboard  Total responses: {totalSubmissions}</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border px-3 py-1.5 rounded-lg font-medium">
            <Users size={14} />
            <span>{totalSubmissions} submissions</span>
          </div>
          {examOrAssignment && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border px-3 py-1.5 rounded-lg font-medium">
              <Award size={14} />
              <span>{averageScore}% Average Score</span>
            </div>
          )}
        </div>
      </div>

      {examOrAssignment && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="py-3.5 border-b border-border/40">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">{totalSubmissions}</span>
              <Users size={24} className="text-muted-foreground/35" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="py-3.5 border-b border-border/40">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Average Score</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">{averageScore}%</span>
              <Award size={24} className="text-muted-foreground/35" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="py-3.5 border-b border-border/40">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Highest Score</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">{highestScore}%</span>
              <CheckCircle2 size={24} className="text-muted-foreground/35" />
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="py-3.5 border-b border-border/40">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Graded</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="text-3xl font-black text-foreground">{gradedCount}/{totalSubmissions}</span>
              <Clock size={24} className="text-muted-foreground/35" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {examOrAssignment && (
          <Card className="bg-card border-border shadow-sm lg:col-span-2">
            <CardHeader className="py-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold text-foreground">Score brackets distribution</CardTitle>
              <CardDescription>Visual breakdown of class scoring groups</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brackets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#262626" : "#e5e5e5"} />
                    <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#a3a3a3", fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <div className={`space-y-6 ${examOrAssignment ? "lg:col-span-1" : "lg:col-span-3"}`}>
          {form.questions
            .filter((q) => ["SINGLE_CHOICE", "MULTI_CHOICE", "DROPDOWN"].includes(q.type))
            .slice(0, 3)
            .map((q) => {
              const data = getQuestionChartData(q.id);
              const hasResponses = data.some((d) => d.count > 0);
              return (
                <Card key={q.id} className="bg-card border-border shadow-sm">
                  <CardHeader className="py-3 border-b border-border/40">
                    <CardTitle className="text-xs font-bold text-foreground truncate">{q.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex justify-center items-center">
                    {hasResponses ? (
                      <div className="h-44 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius="40%"
                              outerRadius="75%"
                              dataKey="count"
                              paddingAngle={2}
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute bottom-0 right-0 flex flex-col gap-0.5 text-[9px] bg-muted/30 p-2 rounded border border-border">
                          {data.map((d, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <div className="h-2 w-2 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="truncate max-w-[80px]">{d.name} ({d.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground py-8">No choice selections recorded yet.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="py-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold text-foreground">Respondent Submissions List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/40 bg-muted/15 text-muted-foreground font-semibold">
                  <th className="p-3">Submitter / Student</th>
                  <th className="p-3">Date Submitted</th>
                  {examOrAssignment && (
                    <>
                      <th className="p-3">Score</th>
                      <th className="p-3">Status</th>
                    </>
                  )}
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {form.responses.map((resp) => {
                  const studentName = resp.student
                    ? `${resp.student.name} ${resp.student.surname}`
                    : `User ${resp.submittedById.slice(-8)}`;

                  return (
                    <tr key={resp.id} className="border-b border-border/40 hover:bg-muted/15 transition-colors">
                      <td className="p-3 font-semibold text-foreground">{studentName}</td>
                      <td className="p-3 text-muted-foreground">{new Date(resp.submittedAt).toLocaleString()}</td>
                      {examOrAssignment && (
                        <>
                          <td className="p-3 font-black text-foreground">{resp.score !== null ? `${resp.score}%` : "Pending"}</td>
                          <td className="p-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                              resp.isGraded
                                ? "bg-green-500/10 text-green-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}>
                              {resp.isGraded ? "GRADED" : "UNGRADED"}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenGrading(resp)}
                          className="h-7 text-[10px] font-bold border-border bg-muted/20 hover:bg-muted text-foreground flex items-center gap-1.5 ml-auto"
                        >
                          <Edit3 size={11} />
                          {examOrAssignment && !resp.isGraded ? "Grade Response" : "View Answers"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {form.responses.length === 0 && (
                  <tr>
                    <td colSpan={examOrAssignment ? 5 : 3} className="text-center py-12 text-muted-foreground">
                      No submissions recorded for this form yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedResponse !== null} onOpenChange={(val) => { if (!val) setSelectedResponse(null); }}>
        {selectedResponse && (
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
              <DialogDescription>
                Submitted by {selectedResponse.student ? `${selectedResponse.student.name} ${selectedResponse.student.surname}` : selectedResponse.submittedById} on {new Date(selectedResponse.submittedAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {form.questions.map((q) => {
                const answer = selectedResponse.answers.find((a) => a.questionId === q.id);
                const points = q.points || 0;

                return (
                  <div key={q.id} className="p-3 border border-border/60 bg-muted/15 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-4 border-b border-border/30 pb-2">
                      <h4 className="text-xs font-bold text-foreground">{q.title}</h4>
                      {points > 0 && (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Allocation: {points} marks
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Answer Answered:</span>
                      {["SHORT_TEXT", "LONG_TEXT"].includes(q.type) ? (
                        <p className="text-xs font-medium bg-muted/40 p-2 border border-border rounded italic text-foreground leading-relaxed">
                          {answer?.textResponse || "(Empty Response)"}
                        </p>
                      ) : (
                        <p className="text-xs font-semibold text-foreground">
                          {answer && answer.selectedOptionIds.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {answer.selectedOptionIds.map((optId) => {
                                const opt = q.options.find((o) => o.id === optId);
                                return <li key={optId}>{opt?.text || "Unknown Option"}</li>;
                              })}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground italic">(No Option Selected)</span>
                          )}
                        </p>
                      )}
                    </div>

                    {examOrAssignment && (q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") && points > 0 && (
                      <div className="flex items-center gap-2 pt-2">
                        <Label htmlFor={`grade-${q.id}`} className="text-[11px] font-semibold text-muted-foreground">
                          Score Assigned:
                        </Label>
                        <Input
                          id={`grade-${q.id}`}
                          type="number"
                          value={gradingScores[q.id] === undefined ? "" : gradingScores[q.id]}
                          onChange={(e) =>
                            setGradingScores({
                              ...gradingScores,
                              [q.id]: Math.min(Number(e.target.value) || 0, points),
                            })
                          }
                          className="h-8 w-16 text-center text-xs bg-muted/30 border-border"
                          placeholder="0"
                          min="0"
                          max={points}
                        />
                        <span className="text-xs text-muted-foreground">/ {points}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="ghost" onClick={() => setSelectedResponse(null)} className="text-foreground hover:bg-muted">
                Close
              </Button>
              {examOrAssignment && !selectedResponse.isGraded && (
                <Button
                  onClick={handleManualGradeSubmit}
                  disabled={grading}
                  className="bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5"
                >
                  {grading && <Loader2 size={13} className="animate-spin" />}
                  Submit Grades
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
