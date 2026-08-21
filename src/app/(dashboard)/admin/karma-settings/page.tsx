"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getKarmaSettings,
  updateKarmaSettings,
  resetKarmaSettingsToDefaults,
  type KarmaSettingsData,
} from "@/actions/karma-settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import { Loader2, Save, RotateCcw, Trophy, Heart, MessageSquare, PenSquare, Repeat, Calendar, GraduationCap, MessageCircle, Send, Smile, Rocket, Sparkles } from "lucide-react";
import { addKarmaToAdminsForTesting, addCustomKarmaToUser } from "@/actions/karma.actions";

type SettingField = {
  key: keyof KarmaSettingsData;
  label: string;
  description: string;
  icon: React.ElementType;
};

const settingFields: SettingField[] = [
  {
    key: "likeReceived",
    label: "Like Received",
    description: "Karma awarded when someone likes your post or comment",
    icon: Heart,
  },
  {
    key: "commentCreated",
    label: "Comment/Reply Created",
    description: "Karma awarded to user who creates a comment or reply",
    icon: MessageSquare,
  },
  {
    key: "commentReceived",
    label: "Comment/Reply Received",
    description: "Karma awarded to post author when someone comments on their post",
    icon: MessageCircle,
  },
  {
    key: "postCreated",
    label: "Post Created",
    description: "Karma awarded when user creates a new post",
    icon: PenSquare,
  },
  {
    key: "repostReceived",
    label: "Repost Received",
    description: "Karma awarded when someone reposts your content",
    icon: Repeat,
  },
  {
    key: "perfectAttendanceWeek",
    label: "Perfect Attendance (Week)",
    description: "Bonus karma for perfect attendance in a week",
    icon: Calendar,
  },
  {
    key: "attendancePerDay",
    label: "Attendance Per Day",
    description: "Karma awarded for each day of attendance",
    icon: Calendar,
  },
  {
    key: "resultAbove95",
    label: "Exam Score 95%+",
    description: "Karma for exam/assignment scores 95% or above",
    icon: Trophy,
  },
  {
    key: "resultAbove90",
    label: "Exam Score 90-94%",
    description: "Karma for exam/assignment scores 90-94%",
    icon: Trophy,
  },
  {
    key: "resultAbove85",
    label: "Exam Score 85-89%",
    description: "Karma for exam/assignment scores 85-89%",
    icon: Trophy,
  },
  {
    key: "resultAbove80",
    label: "Exam Score 80-84%",
    description: "Karma for exam/assignment scores 80-84%",
    icon: GraduationCap,
  },
  {
    key: "resultAbove70",
    label: "Exam Score 70-79%",
    description: "Karma for exam/assignment scores 70-79%",
    icon: GraduationCap,
  },
  {
    key: "resultAbove60",
    label: "Exam Score 60-69%",
    description: "Karma for exam/assignment scores 60-69%",
    icon: GraduationCap,
  },
  {
    key: "messageSent",
    label: "DM/Group/Server Message Sent",
    description: "Karma awarded for sending any message (DMs, groups, servers)",
    icon: Send,
  },
  {
    key: "messageReactionReceived",
    label: "Message Reaction Received",
    description: "Karma when someone reacts to your DM/group/server message",
    icon: Smile,
  },
  {
    key: "serverBumpReceived",
    label: "Server Bump Received",
    description: "Karma awarded to server owner when someone bumps their server",
    icon: Rocket,
  },
];

export default function KarmaSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAddingKarma, setIsAddingKarma] = useState(false);
  const [isAddingCustomKarma, setIsAddingCustomKarma] = useState(false);
  const [customUsername, setCustomUsername] = useState("");
  const [customAmount, setCustomAmount] = useState("1000");
  const [settings, setSettings] = useState<KarmaSettingsData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getKarmaSettings();
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load karma settings");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: keyof KarmaSettingsData, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: numValue };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateKarmaSettings(settings);
      toast.success("Karma settings saved successfully!");
      setHasChanges(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all karma settings to defaults?")) {
      return;
    }

    setIsResetting(true);
    try {
      const result = await resetKarmaSettingsToDefaults();
      setSettings(result.defaults);
      setHasChanges(false);
      toast.success("Settings reset to defaults!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset settings");
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddKarmaToAdmins = async () => {
    if (!confirm("Add 5,000,000 karma to ALL admins? This is for testing only.")) {
      return;
    }

    setIsAddingKarma(true);
    try {
      const result = await addKarmaToAdminsForTesting();
      toast.success(`Added 5M karma to ${result.updated} admins!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add karma");
    } finally {
      setIsAddingKarma(false);
    }
  };

  const handleAddCustomKarma = async () => {
    const amount = parseInt(customAmount, 10);
    if (!customUsername.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid username and amount");
      return;
    }

    if (!confirm(`Add ${amount.toLocaleString()} karma to @${customUsername}?`)) {
      return;
    }

    setIsAddingCustomKarma(true);
    try {
      const result = await addCustomKarmaToUser(customUsername.trim(), amount);
      toast.success(`Added ${amount.toLocaleString()} karma to @${result.username}! New total: ${result.newKarma.toLocaleString()}`);
      setCustomUsername("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add karma");
    } finally {
      setIsAddingCustomKarma(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load settings. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Trophy size={28} className="text-yellow-500" />
            Karma Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure how much karma users earn for different actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <RotateCcw size={16} className="mr-2" />
            )}
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Community Engagement</CardTitle>
            <CardDescription>
              Karma awarded for community-related activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingFields.slice(0, 5).map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <field.icon size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor={field.key} className="font-medium">
                      {field.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  </div>
                </div>
                <Input
                  id={field.key}
                  type="number"
                  min={0}
                  value={settings[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-24 text-center"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Academic Performance (Exam/Assignments)</CardTitle>
            <CardDescription>
              Karma awarded based on exam and assignment scores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingFields.slice(5, 13).map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <field.icon size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor={field.key} className="font-medium">
                      {field.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  </div>
                </div>
                <Input
                  id={field.key}
                  type="number"
                  min={0}
                  value={settings[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-24 text-center"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messaging</CardTitle>
            <CardDescription>
              Karma awarded for sending messages and receiving reactions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingFields.slice(13, 16).map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <field.icon size={18} className="text-muted-foreground" />
                  </div>
                  <div>
                    <Label htmlFor={field.key} className="font-medium">
                      {field.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                  </div>
                </div>
                <Input
                  id={field.key}
                  type="number"
                  min={0}
                  value={settings[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-24 text-center"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={20} className="text-yellow-500" />
              Testing Tools
            </CardTitle>
            <CardDescription>
              Admin tools for testing karma features (development only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Add Custom Karma to User</Label>
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
                  onClick={handleAddCustomKarma}
                  disabled={isAddingCustomKarma}
                  variant="secondary"
                  className="shrink-0"
                >
                  {isAddingCustomKarma ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <Sparkles size={16} className="mr-2 text-yellow-500" />
                  )}
                  Add Karma
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a username and amount to add karma to any user for testing tier colors
              </p>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Add 5M Karma to All Admins</Label>
                <p className="text-xs text-muted-foreground">
                  Quick boost for all admin accounts
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleAddKarmaToAdmins}
                disabled={isAddingKarma}
              >
                {isAddingKarma ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Sparkles size={16} className="mr-2 text-amber-500" />
                )}
                +5M to Admins
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mt-6 md:hidden">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isResetting}
          className="flex-1"
        >
          {isResetting ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <RotateCcw size={16} className="mr-2" />
          )}
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="flex-1"
        >
          {isSaving ? (
            <Loader2 size={16} className="animate-spin mr-2" />
          ) : (
            <Save size={16} className="mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
