"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Search,
  Users,
  Users2,
  BookMarked,
  NotebookPen,
  FlaskConical,
  Bell,
  Settings,
  User,
  MessageSquare,
  Server,
  Compass,
  Trophy,
  Globe,
  ShoppingBag,
  LifeBuoy,
  Inbox,
  Layers,
  School,
  Library,
  Wrench,
  ShieldCheck,
  History,
  Swords,
  Ticket,
  Zap,
  Palette,
  Tag,
  BookText,
  BarChart2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  group: string;
  keywords?: string;
  visible: string[];
};

const NAV_ITEMS: NavItem[] = [

  {
    label: "Admin Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    keywords: "overview home",
    visible: ["admin"],
  },
  {
    label: "Teacher Dashboard",
    href: "/teacher",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    visible: ["teacher"],
  },
  {
    label: "Student Dashboard",
    href: "/student",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    visible: ["student"],
  },
  {
    label: "Parent Dashboard",
    href: "/parent",
    icon: <LayoutDashboard className="h-4 w-4" />,
    group: "Dashboards",
    visible: ["parent"],
  },

  {
    label: "Profile",
    href: "/profile",
    icon: <User className="h-4 w-4" />,
    group: "Account",
    keywords: "user account me",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: <Bell className="h-4 w-4" />,
    group: "Account",
    keywords: "alerts inbox",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-4 w-4" />,
    group: "Account",
    keywords: "preferences config",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "GecX History",
    href: "/gecx-history",
    icon: <History className="h-4 w-4" />,
    group: "Account",
    keywords: "transactions points karma",
    visible: ["admin", "teacher", "student", "parent"],
  },

  {
    label: "Teachers",
    href: "/list/teachers",
    icon: <GraduationCap className="h-4 w-4" />,
    group: "People",
    keywords: "staff faculty",
    visible: ["admin", "teacher"],
  },
  {
    label: "Students",
    href: "/list/students",
    icon: <Users className="h-4 w-4" />,
    group: "People",
    keywords: "pupils learners",
    visible: ["admin", "teacher"],
  },
  {
    label: "Parents",
    href: "/list/parents",
    icon: <Users2 className="h-4 w-4" />,
    group: "People",
    keywords: "guardians family",
    visible: ["admin", "teacher"],
  },

  {
    label: "Colleges",
    href: "/list/colleges",
    icon: <School className="h-4 w-4" />,
    group: "Academics",
    keywords: "institutions",
    visible: ["admin"],
  },
  {
    label: "Years",
    href: "/list/grades",
    icon: <Layers className="h-4 w-4" />,
    group: "Academics",
    keywords: "grades levels",
    visible: ["admin"],
  },
  {
    label: "Subjects",
    href: "/list/subjects",
    icon: <BookMarked className="h-4 w-4" />,
    group: "Academics",
    keywords: "courses curriculum",
    visible: ["admin"],
  },
  {
    label: "Branches",
    href: "/list/classes",
    icon: <BookOpen className="h-4 w-4" />,
    group: "Academics",
    keywords: "classes rooms sections",
    visible: ["admin", "teacher"],
  },
  {
    label: "Lessons",
    href: "/list/lessons",
    icon: <NotebookPen className="h-4 w-4" />,
    group: "Academics",
    keywords: "schedule period timetable",
    visible: ["admin", "teacher"],
  },
  {
    label: "Exams",
    href: "/list/exams",
    icon: <FlaskConical className="h-4 w-4" />,
    group: "Academics",
    keywords: "test assessment",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Assignments",
    href: "/list/assignments",
    icon: <ClipboardList className="h-4 w-4" />,
    group: "Academics",
    keywords: "homework tasks",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Results",
    href: "/list/results",
    icon: <BarChart2 className="h-4 w-4" />,
    group: "Academics",
    keywords: "grades marks scores",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Attendance",
    href: "/list/attendance",
    icon: <CalendarCheck className="h-4 w-4" />,
    group: "Academics",
    keywords: "present absent",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Teacher Attendance",
    href: "/list/teacher-attendance",
    icon: <CalendarCheck className="h-4 w-4" />,
    group: "Academics",
    keywords: "staff present absent",
    visible: ["admin"],
  },
  {
    label: "Events",
    href: "/list/events",
    icon: <CalendarDays className="h-4 w-4" />,
    group: "Academics",
    keywords: "activities calendar",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Announcements",
    href: "/list/announcements",
    icon: <Megaphone className="h-4 w-4" />,
    group: "Academics",
    keywords: "news notices",
    visible: ["admin", "teacher", "student", "parent"],
  },

  {
    label: "All Courses",
    href: "/list/courses",
    icon: <Library className="h-4 w-4" />,
    group: "Courses",
    keywords: "catalog curriculum",
    visible: ["admin", "teacher"],
  },
  {
    label: "Course Approvals",
    href: "/list/approvals",
    icon: <ShieldCheck className="h-4 w-4" />,
    group: "Courses",
    keywords: "review pending",
    visible: ["admin"],
  },
  {
    label: "Enrollments",
    href: "/list/enrollments",
    icon: <Users className="h-4 w-4" />,
    group: "Courses",
    keywords: "students registered",
    visible: ["admin"],
  },
  {
    label: "Course Builder",
    href: "/teacher/courses/builder",
    icon: <Wrench className="h-4 w-4" />,
    group: "Courses",
    keywords: "create design",
    visible: ["teacher"],
  },
  {
    label: "My Students",
    href: "/teacher/courses/enrollments",
    icon: <Users2 className="h-4 w-4" />,
    group: "Courses",
    keywords: "learners enrolled",
    visible: ["teacher"],
  },
  {
    label: "My Courses",
    href: "/student/courses/my",
    icon: <BookOpen className="h-4 w-4" />,
    group: "Courses",
    keywords: "enrolled learning",
    visible: ["student"],
  },
  {
    label: "Course Catalog",
    href: "/student/courses",
    icon: <Library className="h-4 w-4" />,
    group: "Courses",
    keywords: "browse enroll",
    visible: ["student"],
  },

  {
    label: "Messages",
    href: "/messages",
    icon: <MessageSquare className="h-4 w-4" />,
    group: "Communication",
    keywords: "chat dms",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Servers",
    href: "/servers",
    icon: <Server className="h-4 w-4" />,
    group: "Communication",
    keywords: "channels chat groups",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Discover Servers",
    href: "/servers/discover",
    icon: <Compass className="h-4 w-4" />,
    group: "Communication",
    keywords: "browse find join",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Branch Wars",
    href: "/list/rivalries",
    icon: <Swords className="h-4 w-4" />,
    group: "Communication",
    keywords: "rivalry class competition",
    visible: ["admin"],
  },
  {
    label: "Branch Wars",
    href: "/student/rivalry",
    icon: <Swords className="h-4 w-4" />,
    group: "Communication",
    keywords: "rivalry class competition",
    visible: ["student"],
  },

  {
    label: "Feed",
    href: "/community",
    icon: <Globe className="h-4 w-4" />,
    group: "Community",
    keywords: "posts social",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "My Profile",
    href: "/community/profile",
    icon: <User className="h-4 w-4" />,
    group: "Community",
    keywords: "social profile",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Search Users",
    href: "/community/search",
    icon: <Search className="h-4 w-4" />,
    group: "Community",
    keywords: "find people",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Leaderboard",
    href: "/leaderboard",
    icon: <Trophy className="h-4 w-4" />,
    group: "Community",
    keywords: "rankings top",
    visible: ["admin", "teacher", "student", "parent"],
  },
  {
    label: "Marketplace",
    href: "/shop",
    icon: <ShoppingBag className="h-4 w-4" />,
    group: "Community",
    keywords: "store buy items",
    visible: ["admin", "teacher", "student", "parent"],
  },

  {
    label: "Get Support",
    href: "/support",
    icon: <LifeBuoy className="h-4 w-4" />,
    group: "Support",
    keywords: "help tickets",
    visible: ["teacher", "student", "parent"],
  },
  {
    label: "Support Tickets",
    href: "/support",
    icon: <LifeBuoy className="h-4 w-4" />,
    group: "Support",
    keywords: "help admin",
    visible: ["admin"],
  },
  {
    label: "Public Tickets",
    href: "/admin/public-tickets",
    icon: <Ticket className="h-4 w-4" />,
    group: "Support",
    keywords: "open issues",
    visible: ["admin"],
  },
  {
    label: "Requests",
    href: "/requests",
    icon: <Inbox className="h-4 w-4" />,
    group: "Support",
    keywords: "approvals pending",
    visible: ["admin", "teacher", "student", "parent"],
  },

  {
    label: "Academic Subjects",
    href: "/admin/academic-subjects",
    icon: <BookText className="h-4 w-4" />,
    group: "Admin",
    keywords: "curriculum admin",
    visible: ["admin"],
  },
  {
    label: "Avatar Pricing",
    href: "/admin/avatar-pricing",
    icon: <Tag className="h-4 w-4" />,
    group: "Admin",
    keywords: "shop cost admin",
    visible: ["admin"],
  },
  {
    label: "Course Approvals",
    href: "/admin/course-approvals",
    icon: <ShieldCheck className="h-4 w-4" />,
    group: "Admin",
    keywords: "review pending admin",
    visible: ["admin"],
  },
  {
    label: "Event Themes",
    href: "/admin/event-themes",
    icon: <Palette className="h-4 w-4" />,
    group: "Admin",
    keywords: "themes holidays admin",
    visible: ["admin"],
  },
  {
    label: "GecX Settings",
    href: "/admin/gecx-settings",
    icon: <Settings className="h-4 w-4" />,
    group: "Admin",
    keywords: "config admin",
    visible: ["admin"],
  },
  {
    label: "Karma Settings",
    href: "/admin/karma-settings",
    icon: <Zap className="h-4 w-4" />,
    group: "Admin",
    keywords: "points rewards admin",
    visible: ["admin"],
  },
  {
    label: "Streak Settings",
    href: "/admin/streak-settings",
    icon: <Zap className="h-4 w-4" />,
    group: "Admin",
    keywords: "daily streak admin",
    visible: ["admin"],
  },
  {
    label: "Admin Tickets",
    href: "/admin/tickets",
    icon: <Ticket className="h-4 w-4" />,
    group: "Admin",
    keywords: "support admin",
    visible: ["admin"],
  },
];

const GROUPS = Array.from(new Set(NAV_ITEMS.map((i) => i.group)));

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user } = useUser();
  const userRole = (user?.publicMetadata.role as string) || "";

  const filteredNavItems = NAV_ITEMS.filter((item) => item.visible.includes(userRole));
  const filteredGroups = Array.from(new Set(filteredNavItems.map((i) => i.group)));

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <>
      <button
        id="global-search-trigger"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-xs rounded-full px-3 py-2 bg-muted hover:bg-muted/80 transition-all duration-200 text-muted-foreground hover:text-foreground group border border-border"
        aria-label="Open global search"
      >
        <Search className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
        <span className="w-[140px] text-left">Search anything…</span>
        <kbd className="ml-auto hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-60">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <button
        onClick={() => setOpen(true)}
        className="flex md:hidden items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, teachers, students…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {filteredGroups.map((group, i) => (
            <React.Fragment key={group}>
              {i > 0 && <CommandSeparator />}
              <CommandGroup heading={group}>
                {filteredNavItems.filter((item) => item.group === group).map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} ${item.keywords ?? ""}`}
                    onSelect={() =>
                      runCommand(() => router.push(item.href))
                    }
                    className="cursor-pointer"
                  >
                    <span className="mr-2 text-muted-foreground">
                      {item.icon}
                    </span>
                    {item.label}
                    <span className="ml-auto text-xs text-muted-foreground/60">
                      {item.href}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
