"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "react-toastify";
import { Search, Loader2, Wrench } from "lucide-react";
import BadgeIcon from "@/components/badges/BadgeIcon";

export default function AdminBadgeTester() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [studentBadges, setStudentBadges] = useState<any[] | null>(null);

  const searchStudent = async () => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/badges/user/${username}`);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setStudentBadges(null);
      } else {
        setStudentBadges(data.badges);
      }
    } catch (e) {
      toast.error("Failed to fetch student badges");
    } finally {
      setLoading(false);
    }
  };

  const setBadge = async (category: string, tier: number, color: string) => {
    const res = await fetch('/api/admin/badges/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, category, tier, color })
    });
    if (res.ok) {
      toast.success('Badge overridden!');
      searchStudent();
    } else {
      toast.error('Failed to set badge');
    }
  };

  const resetAll = async () => {
    if (!confirm("Reset all badges to earned state?")) return;
    const res = await fetch(`/api/admin/badges/reset/${username}`, { method: 'POST' });
    if (res.ok) {
      toast.success('Reset to earned states');
      searchStudent();
    } else {
      toast.error('Failed to reset badges');
    }
  };

  const ALL_CATEGORIES = [
    'ATTENDANCE_STREAK', 'RESULTS_90', 'LEADERBOARD_ALL_TIME',
    'LEADERBOARD_MONTH', 'LEADERBOARD_WEEK', 'LEADERBOARD_TODAY',
    'COURSES_COMPLETED', 'VERIFIED_ANSWERS'
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Wrench size={28} className="text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Badge Testing Overrides</h1>
          <p className="text-muted-foreground">Search username to modify badge states manually.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Student username exactly..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchStudent()}
            />
            <Button onClick={searchStudent} disabled={loading || !username.trim()}>
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {studentBadges && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>@{username}'s Badges</CardTitle>
            <Button variant="destructive" onClick={resetAll}>Reset All to Earned</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {ALL_CATEGORIES.map(cat => {
              const current = studentBadges.find(b => b.category === cat) || { tier: 0, color: 'NONE' };
              return (
                <div key={cat} className="flex justify-between items-center p-3 border rounded-lg bg-card">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-full">
                      <BadgeIcon badge={current} size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{cat.replace(/_/g, ' ')}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tier: {current.tier || 'None'} | Count: {current.count ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      className="text-sm border rounded p-1.5 bg-background"
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        const tierColors: Record<number, string> = { 1: 'PINK', 2: 'PURPLE', 3: 'GREEN', 4: 'BLUE', 5: 'GOLD' };
                        const autoColor = tierColors[val] || 'PINK';
                        setBadge(cat, val, autoColor);
                      }}
                      value={current.tier || 0}
                    >
                      <option value={0}>None</option>
                      {[1,2,3,4,5].map(t => <option key={t} value={t}>Tier {t} ({['Pink','Purple','Green','Blue','Gold'][t-1]})</option>)}
                    </select>

                    <select
                      className="text-sm border rounded p-1.5 bg-background"
                      onChange={(e) => {
                        const newColor = e.target.value;
                        if (current.tier > 0) setBadge(cat, current.tier, newColor);
                      }}
                      value={current.color || 'NONE'}
                      disabled={!current.tier}
                    >
                      <option value="NONE" disabled>Color</option>
                      {['PINK', 'PURPLE', 'GREEN', 'BLUE', 'GOLD'].map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
