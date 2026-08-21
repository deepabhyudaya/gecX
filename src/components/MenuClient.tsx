"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import LogoutButton from "./LogoutButton";

interface MenuItem {
  icon: string;
  label: string;
  href: string;
  visible: string[];
  lucideIcon?: React.ReactNode;
}

interface MenuSection {
  title: string;
  icon: React.ReactNode;
  items: MenuItem[];
}

interface MenuClientProps {
  role: string;
  sections: MenuSection[];
  counts: Record<string, number>;
}

export function MenuClient({ role, sections, counts }: MenuClientProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const sectionTitles = useMemo(() => ["All", ...sections.map((s) => s.title)], [sections]);

  const filteredSections = useMemo(() => {
    const q = query.toLowerCase().trim();
    return sections
      .map((section) => {
        if (activeFilter !== "All" && section.title !== activeFilter) return null;
        const items = section.items.filter((item) => {
          if (!item.visible.includes(role)) return false;
          if (!q) return true;
          return item.label.toLowerCase().includes(q);
        });
        return items.length > 0 ? { ...section, items } : null;
      })
      .filter(Boolean) as MenuSection[];
  }, [sections, role, query, activeFilter]);

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getCount = (label: string): number => {
    switch (label) {
      case "Messages": return counts.messages ?? 0;
      case "Support Tickets": return counts.tickets ?? 0;
      case "Requests": return counts.requests ?? 0;
      case "Teachers": return counts.teachers ?? 0;
      case "Students": return counts.students ?? 0;
      case "Parents": return counts.parents ?? 0;
      case "Course Builder": case "Course Approvals": case "My Courses": case "Course Catalog":
        return counts.courses ?? 0;
      case "Exams": return counts.exams ?? 0;
      case "Assignments": return counts.assignments ?? 0;
      case "Results": return counts.results ?? 0;
      case "Enrollments": return counts.enrollments ?? 0;
      case "Notifications": return counts.notifications ?? 0;
      default: return 0;
    }
  };

  return (
    <div className="mt-2 text-sm flex flex-col h-full">
      <div className="px-2 mb-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {sectionTitles.map((title) => (
            <button
              key={title}
              onClick={() => setActiveFilter(title)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                activeFilter === title
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu..."
            className="pl-8 pr-8 h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-lg"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-2">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <p>No items found</p>
          </div>
        ) : (
          filteredSections.map((section) => {
            const isCollapsed = collapsed[section.title];
            const hasItems = section.items.length > 0;
            if (!hasItems) return null;

            return (
              <div className="mb-1" key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-muted-foreground hover:bg-card transition-colors group"
                >
                  <span className="text-muted-foreground">{section.icon}</span>
                  <span className="hidden lg:block flex-1 text-left text-[13px] font-semibold uppercase tracking-wider">
                    {section.title}
                  </span>
                  <span className="hidden lg:block text-muted-foreground">
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="flex flex-col gap-0.5 ml-6 lg:ml-7">
                    {section.items.map((item) => {
                      const count = getCount(item.label);
                      if (item.label === "Logout") {
                        return (
                          <LogoutButton
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                          />
                        );
                      }
                      return (
                        <Link
                          href={item.href}
                          key={item.label}
                          className="flex items-center gap-3 text-muted-foreground py-1.5 px-2 rounded-md hover:bg-card relative group transition-colors"
                        >
                          {item.lucideIcon ? (
                            <span className="text-muted-foreground">{item.lucideIcon}</span>
                          ) : (
                            <Image src={item.icon} alt="" width={16} height={16} />
                          )}
                          <span className="hidden lg:block text-[13px]">{item.label}</span>
                          {count > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                              {count > 9 ? "9+" : count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
