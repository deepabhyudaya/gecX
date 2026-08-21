"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";
import { setCustomUserStreak, setStreakForAllAdmins, resetUserStreak } from "@/actions/streak-testing.actions";
import { Flame, Zap, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StreakSettingsPage() {
  const [customUsername, setCustomUsername] = useState("");
  const [customStreak, setCustomStreak] = useState("21");
  const [isSettingCustom, setIsSettingCustom] = useState(false);
  const [isSettingAdmins, setIsSettingAdmins] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetUsername, setResetUsername] = useState("");

  const handleSetCustomStreak = async () => {
    const streak = parseInt(customStreak);
    if (!customUsername || isNaN(streak) || streak < 0) {
      toast.error("Enter a valid username and streak number");
      return;
    }
    setIsSettingCustom(true);
    try {
      const result = await setCustomUserStreak(customUsername, streak);
      if (result.success) {
        toast.success(`Set ${customUsername}'s streak to ${result.currentStreak} days`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set streak");
    } finally {
      setIsSettingCustom(false);
    }
  };

  const handleSetAdminStreaks = async () => {
    setIsSettingAdmins(true);
    try {
      const result = await setStreakForAllAdmins(365);
      if (result.success) {
        toast.success(`Set 365-day streak for ${result.updated} admin(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set admin streaks");
    } finally {
      setIsSettingAdmins(false);
    }
  };

  const handleResetStreak = async () => {
    if (!resetUsername) {
      toast.error("Enter a username to reset");
      return;
    }
    setIsResetting(true);
    try {
      const result = await resetUserStreak(resetUsername);
      if (result.success) {
        toast.success(`Reset ${resetUsername}'s streak to 0`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reset streak");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 pb-24 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="w-6 h-6 text-orange-500" />
            Streak Testing
          </h1>
          <p className="text-sm text-muted-foreground">
            Admin tools for testing streak borders and tier progression
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Streak Border Tiers</CardTitle>
          <CardDescription>
            Rank-based streak border colors (independent of karma)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
              <div className="w-8 h-8 rounded-full border-2 border-transparent bg-muted flex items-center justify-center text-xs">
                0
              </div>
              <div>
                <p className="text-sm font-medium">Default</p>
                <p className="text-xs text-muted-foreground">Gray / No border</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#CD7F32]/30 bg-amber-950/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#CD7F32] flex items-center justify-center text-xs">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Bronze</p>
                <p className="text-xs text-muted-foreground">3+ days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#C0C0C0]/30 bg-gray-900/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#C0C0C0] flex items-center justify-center text-xs">
                7
              </div>
              <div>
                <p className="text-sm font-medium">Silver</p>
                <p className="text-xs text-muted-foreground">7+ days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#FFD700]/30 bg-yellow-950/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#FFD700] flex items-center justify-center text-xs">
                14
              </div>
              <div>
                <p className="text-sm font-medium">Gold</p>
                <p className="text-xs text-muted-foreground">14+ days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#22C55E]/30 bg-emerald-950/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#22C55E] flex items-center justify-center text-xs">
                30
              </div>
              <div>
                <p className="text-sm font-medium">Emerald</p>
                <p className="text-xs text-muted-foreground">30+ days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#EF4444]/30 bg-red-950/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#EF4444] flex items-center justify-center text-xs">
                60
              </div>
              <div>
                <p className="text-sm font-medium">Ruby</p>
                <p className="text-xs text-muted-foreground">60+ days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#4169E1]/30 bg-blue-950/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#4169E1] flex items-center justify-center text-xs">
                100
              </div>
              <div>
                <p className="text-sm font-medium">Royal</p>
                <p className="text-xs text-muted-foreground">100+ days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#A855F7]/30 bg-purple-950/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#A855F7] flex items-center justify-center text-xs">
                180
              </div>
              <div>
                <p className="text-sm font-medium">Mystic</p>
                <p className="text-xs text-muted-foreground">180+ days</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#06B6D4]/30 bg-cyan-950/10">
              <div className="w-8 h-8 rounded-full border-2 border-[#06B6D4] flex items-center justify-center text-xs bg-gradient-to-r from-[#06B6D4] to-[#A855F7]">
                365
              </div>
              <div>
                <p className="text-sm font-medium">Cosmic</p>
                <p className="text-xs text-muted-foreground">365+ days — Cyan + Purple glow</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Testing Tools
          </CardTitle>
          <CardDescription>
            Admin tools for testing streak features (development only)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Set Custom Streak for User</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Username (e.g., john_doe)"
                value={customUsername}
                onChange={(e) => setCustomUsername(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Streak days"
                min={0}
                max={365}
                value={customStreak}
                onChange={(e) => setCustomStreak(e.target.value)}
                className="w-32"
              />
              <Button
                onClick={handleSetCustomStreak}
                disabled={isSettingCustom}
                variant="secondary"
                className="shrink-0"
              >
                <Flame className="w-4 h-4 mr-2 text-orange-500" />
                {isSettingCustom ? "Setting..." : "Set Streak"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a username and streak days to instantly set their streak (for testing borders)
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">Reset Streak for User</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Username (e.g., john_doe)"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleResetStreak}
                disabled={isResetting}
                variant="outline"
                className="shrink-0"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isResetting ? "Resetting..." : "Reset"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clears the user's streak and deletes their activity logs
            </p>
          </div>

          <Separator />

          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Set 365-Day Streak for All Admins</Label>
              <p className="text-xs text-muted-foreground">
                Quick way to test Cosmic borders on all admin accounts
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSetAdminStreaks}
              disabled={isSettingAdmins}
            >
              <Flame className="w-4 h-4 mr-2 text-orange-500" />
              {isSettingAdmins ? "Setting..." : "Set 365d Admins"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
