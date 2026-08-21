"use client";

import Link from "next/link";
import {
  Home,
  GraduationCap,
  Users,
  Users2,
  BookOpen,
  School,
  BookMarked,
  FileText,
  ClipboardList,
  BarChart2,
  CalendarCheck,
  Calendar,
  MessageSquare,
  Megaphone,
  User,
  Settings,
  LogOut,
  Layers,
  Wrench,
  ShieldCheck,
  Library,
  LifeBuoy,
  ChevronRight,
  ShoppingBag,
  type LucideIcon,
  Inbox,
  Globe,
  Search,
  Server,
  Trophy,
  Bell,
  Swords,
  History,
  Compass,
  Ticket,
  Zap,
  Palette,
  Tag,
  BookText,
  Film,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSidebarCtx } from "./sidebar-context";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useMemo } from "react";
import { UpdateDetailsDialog, NOTIFICATION_DISMISSED_EVENT } from "@/components/notifications/UpdateDetailsDialog";
import { useClerk } from "@clerk/nextjs";

import { useUnreadCountsSSE } from "@/hooks/useUnreadCountsSSE";
import { Input } from "@/components/ui/input";

import {
  Files,
  FilesHighlight,
  FolderItem,
  FolderHeader,
  FolderTrigger,
  FolderContent,
  FolderHighlight,
  Folder,
  FolderIcon,
  FileHighlight,
  File,
  FileIcon,
  FileLabel,
  useFolder,
} from "@/components/animate-ui/primitives/radix/files";

function FolderArrow() {
  const { isOpen } = useFolder();
  return (
    <ChevronRight
      className="size-3 text-muted-foreground/40 shrink-0 transition-transform duration-200 ease-in-out"
      style={{ transform: isOpen ? "rotate(-90deg)" : "rotate(0deg)" }}
    />
  );
}

type MenuItem = {
  icon: LucideIcon;
  label: string;
  href: string;
  visible: string[];
};

type MenuGroup = {
  title: string;
  groupKey: string;
  icon: LucideIcon;
  items: MenuItem[];
};

type UnreadCounts = {
  messages: number;
  tickets: number;
  requests: number;
  notifications: number;
  teachers: number;
  students: number;
  parents: number;
  grades: number;
  classes: number;
  lessons: number;
  courses: number;
  enrollments: number;
  exams: number;
  assignments: number;
  results: number;
  events: number;
  announcements: number;
  itemBadges?: Record<string, { count: number; tone: "blue" | "yellow" | "red" }>;
};

const getMenuGroups = (role: string): MenuGroup[] => [
  {
    title: "Overview",
    groupKey: "overview",
    icon: Home,
    items: [
      { icon: Home, label: "Dashboard", href: `/${role}`, visible: ["admin", "teacher", "student", "parent"] },
      { icon: User, label: "Profile", href: "/profile", visible: ["admin", "teacher", "student", "parent"] },
      { icon: Bell, label: "Notifications", href: "/notifications", visible: ["admin", "teacher", "student", "parent"] },
      { icon: ShoppingBag, label: "Marketplace", href: "/shop", visible: ["admin", "teacher", "student", "parent"] },
      { icon: History, label: "GecX History", href: "/gecx-history", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "People",
    groupKey: "people",
    icon: Users,
    items: [
      { icon: GraduationCap, label: "Teachers", href: "/list/teachers", visible: ["admin", "teacher"] },
      { icon: Users, label: "Students", href: "/list/students", visible: ["admin", "teacher"] },
      { icon: Users2, label: "Parents", href: "/list/parents", visible: ["admin", "teacher"] },
    ],
  },
  {
    title: "Academics",
    groupKey: "academics",
    icon: School,
    items: [
      { icon: School, label: "Colleges", href: "/list/colleges", visible: ["admin"] },
      { icon: Layers, label: "Years", href: "/list/grades", visible: ["admin"] },
      { icon: BookOpen, label: "Subjects", href: "/list/subjects", visible: ["admin"] },
      { icon: School, label: "Branches", href: "/list/classes", visible: ["admin", "teacher"] },
      { icon: BookMarked, label: "Lessons", href: "/list/lessons", visible: ["admin", "teacher"] },
      { icon: FileText, label: "Exams", href: "/list/exams", visible: ["admin", "teacher", "student", "parent"] },
      { icon: ClipboardList, label: "Assignments", href: "/list/assignments", visible: ["admin", "teacher", "student", "parent"] },
      { icon: BarChart2, label: "Results", href: "/list/results", visible: ["admin", "teacher", "student", "parent"] },
      { icon: ClipboardList, label: "Forms", href: "/list/forms", visible: ["admin", "teacher", "student", "parent"] },
      { icon: CalendarCheck, label: "Attendance", href: "/list/attendance", visible: ["admin", "teacher", "student", "parent"] },
      { icon: CalendarCheck, label: "Teacher Attendance", href: "/list/teacher-attendance", visible: ["admin"] },
    ],
  },
  {
    title: "Courses",
    groupKey: "courses",
    icon: Library,
    items: [
      { icon: Library, label: "All Courses", href: "/list/courses", visible: ["admin", "teacher"] },
      { icon: ShieldCheck, label: "Approvals", href: "/list/approvals", visible: ["admin"] },
      { icon: Users, label: "Enrollments", href: "/list/enrollments", visible: ["admin"] },
      { icon: Wrench, label: "Course Builder", href: "/teacher/courses/builder", visible: ["teacher"] },
      { icon: Users2, label: "My Students", href: "/teacher/courses/enrollments", visible: ["teacher"] },
      { icon: BookOpen, label: "My Courses", href: "/student/courses/my", visible: ["student"] },
      { icon: Library, label: "Course Catalog", href: "/student/courses", visible: ["student"] },
    ],
  },
  {
    title: "Communication",
    groupKey: "communication",
    icon: MessageSquare,
    items: [
      { icon: Calendar, label: "Events", href: "/list/events", visible: ["admin", "teacher", "student", "parent"] },
      { icon: MessageSquare, label: "Messages", href: "/messages", visible: ["admin", "teacher", "student", "parent"] },
      { icon: Inbox, label: "Requests", href: "/requests", visible: ["admin", "teacher", "student", "parent"] },
      { icon: Server, label: "My Branch Server", href: "/servers", visible: ["student"] },
      { icon: Server, label: "Servers", href: "/servers", visible: ["admin", "teacher"] },
      { icon: Compass, label: "Discover Servers", href: "/servers/discover", visible: ["admin", "teacher", "student", "parent"] },
      { icon: Megaphone, label: "Announcements", href: "/list/announcements", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "Community",
    groupKey: "community",
    icon: Globe,
    items: [
      { icon: Globe, label: "Feed", href: "/community", visible: ["admin", "teacher", "student", "parent"] },
      { icon: Film, label: "Loops", href: "/community/reels", visible: ["admin", "teacher", "student", "parent"] },
      { icon: User, label: "My Profile", href: "/community/profile", visible: ["admin", "teacher", "student", "parent"] },
      { icon: Search, label: "Search Users", href: "/community/search", visible: ["admin", "teacher", "student", "parent"] },
      { icon: Trophy, label: "Leaderboard", href: "/leaderboard", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
  {
    title: "Support",
    groupKey: "support",
    icon: LifeBuoy,
    items: [
      { icon: LifeBuoy, label: "Get Support", href: "/support", visible: ["teacher", "student", "parent"] },
      { icon: ShieldCheck, label: "Support Tickets", href: "/support", visible: ["admin"] },
      { icon: Inbox, label: "Public Tickets", href: "/admin/public-tickets", visible: ["admin"] },
    ],
  },
  {
    title: "Admin",
    groupKey: "admin",
    icon: ShieldCheck,
    items: [
      { icon: BookText, label: "Academic Subjects", href: "/admin/academic-subjects", visible: ["admin"] },
      { icon: Tag, label: "Avatar Pricing", href: "/admin/avatar-pricing", visible: ["admin"] },
      { icon: ShieldCheck, label: "Course Approvals", href: "/admin/course-approvals", visible: ["admin"] },
      { icon: Palette, label: "Event Themes", href: "/admin/event-themes", visible: ["admin"] },
      { icon: Settings, label: "GecX Settings", href: "/admin/gecx-settings", visible: ["admin"] },
      { icon: Zap, label: "Karma Settings", href: "/admin/karma-settings", visible: ["admin"] },
      { icon: Zap, label: "Streak Settings", href: "/admin/streak-settings", visible: ["admin"] },
      { icon: Ticket, label: "Admin Tickets", href: "/admin/tickets", visible: ["admin"] },

    ],
  },
  {
    title: "System",
    groupKey: "system",
    icon: Settings,
    items: [
      { icon: Settings, label: "Settings", href: "/settings", visible: ["admin", "teacher", "student", "parent"] },
      { icon: LogOut, label: "Logout", href: "/logout", visible: ["admin", "teacher", "student", "parent"] },
    ],
  },
];

const STORAGE_KEY = "sidebar-open-groups";

function NavContent({
  role,
  initialCounts,
  onNavClick,
}: {
  role: string;
  initialCounts: UnreadCounts;
  onNavClick?: () => void;
}) {
  const { signOut } = useClerk();
  const router = useRouter();

  const { counts: liveCounts, isConnected } = useUnreadCountsSSE();
  const [counts, setCounts] = useState<UnreadCounts>(initialCounts);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {

    setCounts(liveCounts as UnreadCounts);
  }, [liveCounts]);

  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/notifications/counts", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCounts(data);
      } catch {

      }
    };

    if (!isConnected) {
      fetchCounts();
      intervalRef.current = setInterval(fetchCounts, 300_000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    window.addEventListener(NOTIFICATION_DISMISSED_EVENT, fetchCounts);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener(NOTIFICATION_DISMISSED_EVENT, fetchCounts);
    };
  }, [isConnected]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTypes, setDialogTypes] = useState<string[]>([]);
  const [dialogEntityId, setDialogEntityId] = useState("");
  const [dialogEntityName, setDialogEntityName] = useState("");

  const labelToTypes: Record<string, string[]> = {
    Teachers: ["TEACHER_CREATED", "TEACHER_UPDATED", "TEACHER_DELETED"],
    Students: ["STUDENT_CREATED", "STUDENT_UPDATED", "STUDENT_DELETED"],
    Parents: ["PARENT_CREATED", "PARENT_UPDATED", "PARENT_DELETED"],
    Years: ["GRADE_CREATED", "GRADE_UPDATED", "GRADE_DELETED"],
    Branches: ["CLASS_CREATED", "CLASS_UPDATED", "CLASS_DELETED"],
    Lessons: ["LESSON_CREATED", "LESSON_UPDATED", "LESSON_DELETED"],
    "All Courses": ["COURSE_SUBMITTED", "COURSE_APPROVED", "COURSE_REJECTED", "COURSE_EXPIRED", "COURSE_UPDATED", "COURSE_DELETED"],
    Approvals: ["COURSE_SUBMITTED"],
    "Course Builder": ["COURSE_SUBMITTED", "COURSE_APPROVED", "COURSE_REJECTED", "COURSE_EXPIRED", "COURSE_UPDATED", "COURSE_DELETED"],
    "My Students": ["COURSE_ENROLLMENT"],
    "My Courses": ["COURSE_SUBMITTED", "COURSE_APPROVED", "COURSE_REJECTED", "COURSE_EXPIRED", "COURSE_UPDATED", "COURSE_DELETED"],
    "Course Catalog": ["COURSE_SUBMITTED", "COURSE_APPROVED", "COURSE_REJECTED", "COURSE_EXPIRED", "COURSE_UPDATED", "COURSE_DELETED"],
    Enrollments: ["COURSE_ENROLLMENT"],
    Exams: ["EXAM_CREATED", "EXAM_UPDATED", "EXAM_DELETED"],
    Assignments: ["ASSIGNMENT_CREATED", "ASSIGNMENT_UPDATED", "ASSIGNMENT_DELETED"],
    Results: ["RESULT_POSTED", "RESULT_UPDATED", "RESULT_DELETED"],
    Events: ["EVENT_CREATED", "EVENT_UPDATED", "EVENT_DELETED"],
    Announcements: ["ANNOUNCEMENT_CREATED", "ANNOUNCEMENT_UPDATED", "ANNOUNCEMENT_DELETED"],
  };

  const menuGroups = getMenuGroups(role);
  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.visible.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const sectionTitles = useMemo(() => ["All", ...visibleGroups.map((g) => g.title)], [visibleGroups]);

  const filteredGroups = useMemo(() => {
    let groups = visibleGroups;
    if (activeFilter !== "All") {
      groups = groups.filter((g) => g.title === activeFilter);
    }
    if (!searchQuery.trim()) return groups;
    const lowerQuery = searchQuery.toLowerCase();
    return groups.map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.label.toLowerCase().includes(lowerQuery) ||
        group.title.toLowerCase().includes(lowerQuery)
      )
    })).filter(group => group.items.length > 0);
  }, [visibleGroups, searchQuery, activeFilter]);

  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() && isHydrated) {
      setOpenGroups(filteredGroups.map(g => g.groupKey));
    }
  }, [searchQuery, isHydrated]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setOpenGroups(JSON.parse(saved));
      } catch (e) {
        setOpenGroups(visibleGroups.map((g) => g.groupKey));
      }
    } else {
      setOpenGroups(visibleGroups.map((g) => g.groupKey));
    }
    setIsHydrated(true);
  }, [role]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    }
  }, [openGroups, isHydrated]);

  const getBadgeInfo = (label: string) => {
    const fromServer = counts.itemBadges?.[label];
    if (fromServer) return fromServer;
    const key = label.toLowerCase().replace(" ", "") as keyof UnreadCounts;
    return { count: (counts[key] as number) || 0, tone: "blue" as const };
  };

  if (!isHydrated) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-7 pb-5 shrink-0">
        <Link href="/" className="flex flex-col gap-0.5" onClick={onNavClick}>
          <span className="text-foreground font-semibold text-[15px] tracking-tight leading-tight" style={{ letterSpacing: "-0.01em" }}>
            gecX
          </span>

        </Link>
      </div>

      <div className="px-3 pb-2 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {sectionTitles.map((title) => (
            <button
              key={title}
              onClick={() => setActiveFilter(title)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                activeFilter === title
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background/50 text-muted-foreground border-border/50 hover:bg-background hover:text-foreground"
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input
            placeholder="Search menu..."
            className="pl-8 h-8 text-[13px] bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/30 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6 px-2 no-scrollbar">
        <Files
          open={openGroups}
          onOpenChange={setOpenGroups}
          className="w-full"
          style={{ overflow: 'visible' }}
        >
          <FilesHighlight className="bg-accent rounded-lg pointer-events-none">
            {filteredGroups.length === 0 ? (
              <div className="text-center text-xs font-medium text-muted-foreground pt-6">No matching items</div>
            ) : filteredGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <FolderItem key={group.groupKey} value={group.groupKey}>
                  <FolderHeader>
                    <FolderTrigger className="w-full text-start">
                      <FolderHighlight>
                        <Folder className="flex items-center gap-2.5 px-2 py-2 pointer-events-none w-full">
                          <FolderIcon
                            closeIcon={<GroupIcon className="size-4 shrink-0 text-muted-foreground" />}
                            openIcon={<GroupIcon className="size-4 shrink-0 text-foreground" />}
                          />
                          <span className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground flex-1">
                            {group.title}
                          </span>
                          <FolderArrow />
                        </Folder>
                      </FolderHighlight>
                    </FolderTrigger>
                  </FolderHeader>

                  <FolderContent className="no-scrollbar">
                    <div className="pl-3 border-l border-border/40 ml-3 flex flex-col py-0.5 gap-0">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isLogout = item.label === "Logout";

                        const handleClick = (e: React.MouseEvent) => {
                          if (isLogout) {
                            signOut();
                          }
                          if (onNavClick) onNavClick();
                        };

                        return (
                          <Link
                            key={item.label}
                            href={isLogout ? "#" : item.href}
                            onClick={handleClick}
                            className="block w-full pointer-events-auto"
                          >
                            <FileHighlight>
                              <File className="flex items-center gap-2.5 px-2 py-1.5 w-full">
                                <FileIcon>
                                  <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                </FileIcon>
                                <FileLabel className="text-[13px] text-muted-foreground leading-none whitespace-nowrap font-medium">
                                  {item.label}
                                </FileLabel>
                                {getBadgeInfo(item.label).count > 0 && (
                                  <span
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();

                                      if (item.label === "Messages") {
                                        if (onNavClick) onNavClick();
                                        router.push(item.href);
                                        return;
                                      }
                                      if (
                                        item.label === "Get Support" ||
                                        item.label === "Support Tickets" ||
                                        item.label === "Public Tickets"
                                      ) {
                                        if (onNavClick) onNavClick();
                                        router.push(item.href);
                                        return;
                                      }
                                      const types = labelToTypes[item.label] || [];
                                      if (types.length > 0 && getBadgeInfo(item.label).count > 0) {
                                        setDialogTypes(types);
                                        setDialogEntityId("");
                                        setDialogEntityName(item.label);
                                        setDialogOpen(true);
                                      }
                                    }}
                                    className={cn(
                                      "ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-white text-[10px] font-semibold cursor-pointer hover:opacity-80 pointer-events-auto",
                                      getBadgeInfo(item.label).tone === "red"
                                        ? "bg-red-500"
                                        : getBadgeInfo(item.label).tone === "yellow"
                                          ? "bg-amber-500 text-black"
                                          : "bg-blue-500"
                                    )}
                                  >
                                    {getBadgeInfo(item.label).count > 99 ? "99+" : getBadgeInfo(item.label).count}
                                  </span>
                                )}
                              </File>
                            </FileHighlight>
                          </Link>
                        );
                      })}
                    </div>
                  </FolderContent>
                </FolderItem>
              );
            })}
          </FilesHighlight>
        </Files>
      </div>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .no-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>

      <UpdateDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        types={dialogTypes}
        entityId={dialogEntityId}
        entityName={dialogEntityName}
      />
    </div>
  );
}

export function SidebarInner({
  role,
  initialCounts,
}: {
  role: string;
  initialCounts: UnreadCounts;
}) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebarCtx();

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col h-full bg-sidebar border-r border-border",
          collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <NavContent role={role} initialCounts={initialCounts} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="p-0 w-[80vw] border-r border-border bg-sidebar flex flex-col"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <NavContent role={role} initialCounts={initialCounts} onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
