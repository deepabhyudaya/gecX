"use client";

import { useState } from "react";
import Image from "next/image";
import {
  User,
  Palette,
  Bell,
  Shield,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Check,
  RefreshCcw,
  Trophy,
  ArrowUpRight,
  Flame,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { rerollAccessCode } from "@/actions/message.actions";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Tab = "account" | "appearance" | "notifications" | "security";

interface UserInfo {
  fullName: string;
  email: string;
  username: string;
  avatar: string;
  role: string;
  accessCode: string | null;
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-foreground" : "bg-muted"
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );
}

function ThemeOption({
  value,
  current,
  label,
  icon: Icon,
  onSelect,
}: {
  value: string;
  current: string | undefined;
  label: string;
  icon: any;
  onSelect: (v: string) => void;
}) {
  const active = current === value;
  return (
    <button
      id={`theme-${value}`}
      onClick={() => onSelect(value)}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all shadow-sm ${active
          ? "bg-foreground/10 text-foreground"
          : "bg-card hover:bg-muted text-muted-foreground"
        }`}
    >
      <Icon size={20} />
      <span className="text-xs font-medium">{label}</span>
      {active && <Check size={12} className="text-blue-400" />}
    </button>
  );
}

function SidebarTab({
  id,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  id: Tab;
  icon: any;
  label: string;
  active: boolean;
  onClick: (id: Tab) => void;
}) {
  return (
    <button
      id={`settings-tab-${id}`}
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
          ? "bg-foreground/10 text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
    >
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
      {active && (
        <ChevronRight size={14} className="ml-auto text-foreground opacity-40" />
      )}
    </button>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl p-6 flex flex-col gap-5 shadow-[rgba(0,0,0,0.02)_0px_2px_4px,rgba(0,0,0,0.04)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.02)_0px_2px_4px,rgba(255,255,255,0.06)_0px_0px_0px_1px]">
      <div>
        <h2 className="font-semibold text-base">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/40" />;
}

export default function SettingsClient({ userInfo }: { userInfo: UserInfo }) {
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const { theme, setTheme } = useTheme();

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);
  const [notifEvents, setNotifEvents] = useState(true);
  const [notifResults, setNotifResults] = useState(false);
  const [notifAttendance, setNotifAttendance] = useState(false);

  const [twoFA, setTwoFA] = useState(false);
  const [sessionAlerts, setSessionAlerts] = useState(true);

  const [showRerollDialog, setShowRerollDialog] = useState(false);
  const [isRerolling, setIsRerolling] = useState(false);

  const handleReroll = async () => {
    setIsRerolling(true);
    await rerollAccessCode();
    setIsRerolling(false);
    setShowRerollDialog(false);
  };

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: "account", icon: User, label: "Account" },
    { id: "appearance", icon: Palette, label: "Appearance" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "security", icon: Shield, label: "Security" },
  ];

  const content: Record<Tab, React.ReactNode> = {
    account: (
      <div className="flex flex-col gap-4">
        <Section
          title="Profile Information"
          description="Your basic account details synced from Clerk."
        >
          <div className="flex items-center gap-4">
            <Image
              src={userInfo.avatar}
              alt={userInfo.fullName}
              width={72}
              height={72}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-border shrink-0"
            />
            <div>
              <p className="font-semibold">{userInfo.fullName || " "}</p>
              <p className="text-sm text-muted-foreground">
                @{userInfo.username}
              </p>
              <span className="text-[11px] capitalize px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground mt-1 inline-block">
                {userInfo.role}
              </span>
            </div>
          </div>
          <Divider />
          <Row label="Email" description="Your registered email address.">
            <span className="text-sm text-muted-foreground">
              {userInfo.email || " "}
            </span>
          </Row>
          <Divider />
          <Row label="Username">
            <span className="text-sm font-mono text-muted-foreground">
              @{userInfo.username}
            </span>
          </Row>
          <Divider />
          <div className="pt-1">
            <p className="text-xs text-muted-foreground">
              To update your profile photo, name, or email, manage your account
              through the{" "}
              <span className="text-blue-400 font-medium">
                Clerk User Button
              </span>{" "}
              in the top navigation bar.
            </p>
          </div>
        </Section>

        <Section
          title="Direct Messaging"
          description="Use your access code to let others start a chat with you."
        >
          <Row label="Your Access Code" description="Share this code with others to receive direct messages.">
            <div className="flex items-center gap-2">
              <code className="px-3 py-1.5 rounded-md bg-muted font-mono text-sm border border-border">
                {userInfo.accessCode || "Not generated"}
              </code>
              <button
                onClick={() => setShowRerollDialog(true)}
                className="p-2 rounded-md border border-border bg-background hover:bg-muted transition-colors"
                title="Reroll Access Code"
              >
                <RefreshCcw size={14} className={`text-muted-foreground ${isRerolling ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </Row>
          <Divider />

          <Dialog open={showRerollDialog} onOpenChange={setShowRerollDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Reroll Access Code?</DialogTitle>
                <DialogDescription className="pt-2">
                  New people will need your new code to start a chat with you. Your existing open conversations will not be affected.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-4">
                <button
                  onClick={() => setShowRerollDialog(false)}
                  className="px-4 py-2 rounded-md bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReroll}
                  disabled={isRerolling}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isRerolling ? "Rerolling..." : "Reroll Code"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="pt-1">
            <p className="text-xs text-muted-foreground">
              Privacy Tip: Only share your access code with people you trust. You can close any conversation at any time to stop receiving messages.
            </p>
          </div>
        </Section>

        {userInfo.role === "admin" && (
          <Section
            title="Admin Settings"
            description="Configure system-wide settings."
          >
            <Link href="/admin/karma-settings" className="block">
              <div className="flex items-center justify-between gap-4 py-2 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Trophy size={18} className="text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                      Karma Settings
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Configure how users earn karma points
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
            </Link>

            <Link href="/admin/streak-settings" className="block">
              <div className="flex items-center justify-between gap-4 py-2 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Flame size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                      Streak Settings
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Test streak borders and tier progression
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
            </Link>

            <Link href="/admin/event-themes" className="block">
              <div className="flex items-center justify-between gap-4 py-2 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Sparkles size={18} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-foreground transition-colors">
                      Event Themes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create and manage seasonal themes for all users
                    </p>
                  </div>
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-muted-foreground group-hover:text-foreground transition-colors"
                />
              </div>
            </Link>
          </Section>
        )}
      </div>
    ),

    appearance: (
      <div className="flex flex-col gap-4">
        <Section
          title="Theme"
          description="Choose how gecX looks to you."
        >
          <div className="grid grid-cols-3 gap-3">
            <ThemeOption
              value="light"
              current={theme}
              label="Light"
              icon={Sun}
              onSelect={setTheme}
            />
            <ThemeOption
              value="dark"
              current={theme}
              label="Dark"
              icon={Moon}
              onSelect={setTheme}
            />
            <ThemeOption
              value="system"
              current={theme}
              label="System"
              icon={Monitor}
              onSelect={setTheme}
            />
          </div>
        </Section>

        <Section
          title="Display"
          description="Adjust how information is shown."
        >
          <Row
            label="Compact mode"
            description="Reduce spacing in tables and lists."
          >
            <Toggle
              id="toggle-compact"
              checked={false}
              onChange={() => { }}
            />
          </Row>
          <Divider />
          <Row
            label="Animate transitions"
            description="Enable page and component transitions."
          >
            <Toggle
              id="toggle-animate"
              checked={true}
              onChange={() => { }}
            />
          </Row>
        </Section>
      </div>
    ),

    notifications: (
      <div className="flex flex-col gap-4">
        <Section
          title="Email Notifications"
          description="Control which updates you receive by email."
        >
          <Row
            label="Email notifications"
            description="Receive email summaries."
          >
            <Toggle
              id="toggle-notif-email"
              checked={notifEmail}
              onChange={setNotifEmail}
            />
          </Row>
          <Divider />
          <Row
            label="Announcements"
            description="Get notified about college announcements."
          >
            <Toggle
              id="toggle-notif-announcements"
              checked={notifAnnouncements}
              onChange={setNotifAnnouncements}
            />
          </Row>
          <Divider />
          <Row
            label="Events"
            description="Reminders for upcoming college events."
          >
            <Toggle
              id="toggle-notif-events"
              checked={notifEvents}
              onChange={setNotifEvents}
            />
          </Row>
        </Section>

        <Section
          title="Activity Notifications"
          description="Updates about academic activity."
        >
          <Row
            label="Results posted"
            description="When exam or assignment results are published."
          >
            <Toggle
              id="toggle-notif-results"
              checked={notifResults}
              onChange={setNotifResults}
            />
          </Row>
          <Divider />
          <Row
            label="Attendance alerts"
            description="Alerts for absence or late marks."
          >
            <Toggle
              id="toggle-notif-attendance"
              checked={notifAttendance}
              onChange={setNotifAttendance}
            />
          </Row>
        </Section>
      </div>
    ),

    security: (
      <div className="flex flex-col gap-4">
        <Section
          title="Account Security"
          description="Manage your login and account protection."
        >
          <Row
            label="Two-factor authentication"
            description="Add an extra layer of security via Clerk."
          >
            <Toggle id="toggle-2fa" checked={twoFA} onChange={setTwoFA} />
          </Row>
          <Divider />
          <Row
            label="Login activity alerts"
            description="Get notified when a new device signs in."
          >
            <Toggle
              id="toggle-session-alerts"
              checked={sessionAlerts}
              onChange={setSessionAlerts}
            />
          </Row>
        </Section>

        <Section title="Danger Zone" description="Irreversible actions.">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400">
                Sign out of all devices
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                End all active sessions except this one.
              </p>
            </div>
            <button
              id="btn-signout-all"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Sign out all
            </button>
          </div>
        </Section>
      </div>
    ),
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="flex-1 p-4 md:p-6 pb-24">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your account preferences and configurations.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <nav
              className="w-full md:w-52 shrink-0 flex md:flex-col gap-1"
              aria-label="Settings navigation"
            >
              {tabs.map((t) => (
                <SidebarTab
                  key={t.id}
                  id={t.id}
                  icon={t.icon}
                  label={t.label}
                  active={activeTab === t.id}
                  onClick={setActiveTab}
                />
              ))}
            </nav>

            <div className="flex-1 min-w-0">{content[activeTab]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
