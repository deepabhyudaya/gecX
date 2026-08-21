"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { updateGecXSettings, resetGecXSettingsToDefaults } from "@/actions/gecx-settings.actions";
import { addGecXToAdminsForTesting, addCustomGecXToUser } from "@/actions/gecx.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Save, Sparkles } from "lucide-react";

interface GecXSettingsData {
  defaultStartingBalance: number;
  attendancePerDay: number;
  perfectAttendanceWeek: number;
  resultAbove95: number;
  resultAbove90: number;
  resultAbove85: number;
  resultAbove80: number;
  resultAbove70: number;
  resultAbove60: number;
  teacherAttendanceBonusPercent: number;
  teacherResultBonusPercent: number;
  parentAttendanceBonusPercent: number;
  parentResultBonusPercent: number;
}

interface GecXSettingsClientProps {
  initialSettings: GecXSettingsData;
}

const GecXSettingsClient = ({ initialSettings }: GecXSettingsClientProps) => {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAddingGecX, setIsAddingGecX] = useState(false);
  const [isAddingCustomGecX, setIsAddingCustomGecX] = useState(false);
  const [customUsername, setCustomUsername] = useState("");
  const [customAmount, setCustomAmount] = useState("10000");

  const handleInputChange = (field: keyof GecXSettingsData, value: string) => {
    const numValue = parseInt(value) || 0;
    setSettings(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGecXSettings(settings);
      toast.success("gecX settings updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all settings to defaults? This cannot be undone.")) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetGecXSettingsToDefaults();
      if (result.success) {
        setSettings(result.defaults);
        toast.success("Settings reset to defaults!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset settings");
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddGecXToAdmins = async () => {
    if (!confirm("Add 5,000,000 gecX to ALL admins? This is for testing only.")) {
      return;
    }

    setIsAddingGecX(true);
    try {
      const result = await addGecXToAdminsForTesting();
      toast.success(`Added 5M gecX to ${result.updated} admins!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add gecX");
    } finally {
      setIsAddingGecX(false);
    }
  };

  const handleAddCustomGecX = async () => {
    const amount = parseInt(customAmount, 10);
    if (!customUsername.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid username and amount");
      return;
    }

    if (!confirm(`Add ${amount.toLocaleString()} gecX to @${customUsername}?`)) {
      return;
    }

    setIsAddingCustomGecX(true);
    try {
      const result = await addCustomGecXToUser(customUsername.trim(), amount);
      toast.success(`Added ${amount.toLocaleString()} gecX to @${result.username}! New balance: ${result.newBalance.toLocaleString()}`);
      setCustomUsername("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add gecX");
    } finally {
      setIsAddingCustomGecX(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">gecX Settings</h1>
            <p className="text-muted-foreground">Configure token earning rates and bonuses</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isResetting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isResetting ? "Resetting..." : "Reset to Defaults"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Earning Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultStartingBalance">Default Starting Balance</Label>
                <Input
                  id="defaultStartingBalance"
                  type="number"
                  value={settings.defaultStartingBalance}
                  onChange={(e) => handleInputChange("defaultStartingBalance", e.target.value)}
                  min="0"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Attendance Rewards</h4>
                <div className="space-y-2">
                  <Label htmlFor="attendancePerDay">Per Day Present</Label>
                  <Input
                    id="attendancePerDay"
                    type="number"
                    value={settings.attendancePerDay}
                    onChange={(e) => handleInputChange("attendancePerDay", e.target.value)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perfectAttendanceWeek">Perfect Week Bonus</Label>
                  <Input
                    id="perfectAttendanceWeek"
                    type="number"
                    value={settings.perfectAttendanceWeek}
                    onChange={(e) => handleInputChange("perfectAttendanceWeek", e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Result Rewards</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="resultAbove95">95% and above</Label>
                    <Input
                      id="resultAbove95"
                      type="number"
                      value={settings.resultAbove95}
                      onChange={(e) => handleInputChange("resultAbove95", e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultAbove90">90% - 94%</Label>
                    <Input
                      id="resultAbove90"
                      type="number"
                      value={settings.resultAbove90}
                      onChange={(e) => handleInputChange("resultAbove90", e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultAbove85">85% - 89%</Label>
                    <Input
                      id="resultAbove85"
                      type="number"
                      value={settings.resultAbove85}
                      onChange={(e) => handleInputChange("resultAbove85", e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultAbove80">80% - 84%</Label>
                    <Input
                      id="resultAbove80"
                      type="number"
                      value={settings.resultAbove80}
                      onChange={(e) => handleInputChange("resultAbove80", e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultAbove70">70% - 79%</Label>
                    <Input
                      id="resultAbove70"
                      type="number"
                      value={settings.resultAbove70}
                      onChange={(e) => handleInputChange("resultAbove70", e.target.value)}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultAbove60">60% - 69%</Label>
                    <Input
                      id="resultAbove60"
                      type="number"
                      value={settings.resultAbove60}
                      onChange={(e) => handleInputChange("resultAbove60", e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bonus Percentages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Teacher Bonuses</h4>
                <div className="space-y-2">
                  <Label htmlFor="teacherAttendanceBonusPercent">
                    Attendance Bonus (% of student's earning)
                  </Label>
                  <Input
                    id="teacherAttendanceBonusPercent"
                    type="number"
                    value={settings.teacherAttendanceBonusPercent}
                    onChange={(e) => handleInputChange("teacherAttendanceBonusPercent", e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacherResultBonusPercent">
                    Result Bonus (% of student's earning)
                  </Label>
                  <Input
                    id="teacherResultBonusPercent"
                    type="number"
                    value={settings.teacherResultBonusPercent}
                    onChange={(e) => handleInputChange("teacherResultBonusPercent", e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Parent Bonuses</h4>
                <div className="space-y-2">
                  <Label htmlFor="parentAttendanceBonusPercent">
                    Attendance Bonus (% of child's earning)
                  </Label>
                  <Input
                    id="parentAttendanceBonusPercent"
                    type="number"
                    value={settings.parentAttendanceBonusPercent}
                    onChange={(e) => handleInputChange("parentAttendanceBonusPercent", e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentResultBonusPercent">
                    Result Bonus (% of child's earning)
                  </Label>
                  <Input
                    id="parentResultBonusPercent"
                    type="number"
                    value={settings.parentResultBonusPercent}
                    onChange={(e) => handleInputChange("parentResultBonusPercent", e.target.value)}
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Testing Tools
            </CardTitle>
            <CardDescription>
              Admin tools for testing gecX features (development only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Add Custom gecX to User</Label>
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
                  placeholder="Amount"
                  min={1}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-32"
                />
                <Button
                  onClick={handleAddCustomGecX}
                  disabled={isAddingCustomGecX}
                  variant="secondary"
                  className="shrink-0"
                >
                  {isAddingCustomGecX ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                  )}
                  Add gecX
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a username and amount to add gecX for testing avatar purchases
              </p>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Add 5M gecX to All Admins</Label>
                <p className="text-xs text-muted-foreground">
                  Quick boost for all admin accounts to test shop features
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleAddGecXToAdmins}
                disabled={isAddingGecX}
              >
                {isAddingGecX ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                )}
                +5M to Admins
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GecXSettingsClient;
