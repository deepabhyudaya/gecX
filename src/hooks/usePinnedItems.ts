import { useState, useEffect } from "react";

export type PinnedItem = {
  id: string | number;
  name: string;
  info: string;
  type: string;
};

export const usePinnedItems = (type?: string) => {
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    const loadPins = () => {
      try {
        const stored = localStorage.getItem("app_pinned_items");
        if (stored) {
          const parsed = JSON.parse(stored) as PinnedItem[];
          if (type) {
            setPinnedItems(parsed.filter((p) => p.type === type));
          } else {
            setPinnedItems(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load pinned items", e);
      }
    };
    loadPins();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app_pinned_items") {
        loadPins();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    window.addEventListener("app_pins_changed", loadPins);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("app_pins_changed", loadPins);
    };
  }, [type]);

  const togglePin = (item: PinnedItem) => {
    try {
      const stored = localStorage.getItem("app_pinned_items");
      let current: PinnedItem[] = stored ? JSON.parse(stored) : [];

      const exists = current.some((p) => p.id === item.id && p.type === item.type);

      if (exists) {
        current = current.filter((p) => !(p.id === item.id && p.type === item.type));
      } else {
        current.push(item);
      }

      localStorage.setItem("app_pinned_items", JSON.stringify(current));
      window.dispatchEvent(new Event("app_pins_changed"));
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
  };

  const isPinned = (id: string | number, itemType: string) => {
    try {
      const stored = localStorage.getItem("app_pinned_items");
      if (!stored) return false;
      const current: PinnedItem[] = JSON.parse(stored);
      return current.some((p) => p.id === id && p.type === itemType);
    } catch {
      return false;
    }
  };

  return { pinnedItems, togglePin, isPinned };
};
