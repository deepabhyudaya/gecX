"use client";

import { usePinnedItems } from "@/hooks/usePinnedItems";
import { PinList } from "@/components/animate-ui/components/community/pin-list";
import { User, BookOpen, GraduationCap, Calendar, FileText, LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const getIconForType = (type: string): LucideIcon => {
  switch (type) {
    case "students":
    case "teachers":
    case "parents":
      return User;
    case "exams":
      return FileText;
    case "assignments":
      return BookOpen;
    case "lessons":
      return GraduationCap;
    default:
      return Calendar;
  }
};

type Props = {
  entityType: string;
  baseUrl: string;
  role?: string;
};

export default function PinnedItemsWrapper({ entityType, baseUrl, role }: Props) {
  const { pinnedItems, togglePin } = usePinnedItems(entityType);
  const router = useRouter();

  if (role !== "admin") return null;

  if (!pinnedItems || pinnedItems.length === 0) {
    return null;
  }

  const mappedItems = pinnedItems.map((item) => ({
    id: typeof item.id === 'string' ? parseInt(item.id.replace(/\D/g,'')) || Math.random() : item.id,
    originalId: item.id,
    name: item.name,
    info: item.info,
    icon: getIconForType(entityType),
    pinned: true,
  }));

  return (
    <div className="mb-6 bg-card border border-border rounded-xl p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
        Pinned {entityType}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pinnedItems.map((item) => {
          const Icon = getIconForType(entityType);
          return (
            <div
              key={item.id}
              onClick={() => router.push(`${baseUrl}/${item.id}`)}
              className="group cursor-pointer flex items-center gap-4 rounded-xl bg-background border border-border p-3 hover:border-foreground/20 transition-all shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-sm text-foreground truncate">
                  {item.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {item.info}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(item);
                }}
                className="p-2 rounded-full hover:bg-muted text-foreground transition-colors"
              >
                <PinListIcon filled />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PinListIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="17" x2="12" y2="22"></line>
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
    </svg>
  );
}
