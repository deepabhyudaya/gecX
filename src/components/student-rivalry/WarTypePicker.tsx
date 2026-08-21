"use client";

import { useState } from "react";
import { WAR_TYPES, WarTypeConfig } from "@/lib/war-types";

type Props = {
  selectedTypeId: string | null;
  onSelect: (typeId: string | null) => void;
  teachers: { id: string; name: string; surname: string }[];
  selectedTeacherId: string | null;
  onSelectTeacher: (teacherId: string | null) => void;
};

export default function WarTypePicker({
  selectedTypeId,
  onSelect,
  teachers,
  selectedTeacherId,
  onSelectTeacher,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedType = WAR_TYPES.find((t) => t.id === selectedTypeId);

  const handleCardClick = (type: WarTypeConfig) => {
    if (expandedId === type.id) {

      onSelect(type.id);
      if (!type.requiresTeacher) {
        onSelectTeacher(null);
      }
    } else {

      setExpandedId(type.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {WAR_TYPES.map((type) => {
          const isSelected = selectedTypeId === type.id;
          const isExpanded = expandedId === type.id;

          return (
            <div
              key={type.id}
              onClick={() => handleCardClick(type)}
              className={`relative cursor-pointer border rounded-2xl p-4 transition-all duration-200 overflow-hidden group ${
                isSelected
                  ? `border-white ring-2 ring-white/50 bg-gradient-to-br ${type.color} text-white shadow-xl scale-[1.02]`
                  : isExpanded
                  ? "border-muted-foreground/50 bg-card hover:bg-muted/50 scale-[1.01] shadow-md"
                  : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
              }`}
            >
              {type.requiresTeacher && (
                <div
                  className={`absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold ${
                    isSelected ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-500"
                  }`}
                  title="Requires a Teacher Judge"
                >
                  <span>🧑‍🏫</span> Judge
                </div>
              )}

              <h3 className={`font-bold ${isSelected ? "text-white" : "text-foreground"}`}>
                {type.name}
              </h3>

              <p
                className={`text-xs mt-1 font-medium ${
                  isSelected ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                Favors: {type.favors} · {type.durationHint}
              </p>

              {isExpanded && !isSelected && (
                <div className="mt-3 pt-3 border-t border-border/50 text-sm animate-in fade-in slide-in-from-top-2">
                  <p className="text-muted-foreground">{type.description}</p>
                  <p className="text-xs italic text-muted-foreground mt-2 border-l-2 pl-2 border-primary/50">
                    "{type.strategicHint}"
                  </p>
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(type.id);
                        if (!type.requiresTeacher) onSelectTeacher(null);
                      }}
                      className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg text-xs font-bold transition-colors"
                    >
                      Select this type
                    </button>
                  </div>
                </div>
              )}

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-white/20 text-sm">
                  <p className="text-white/90">{type.description}</p>
                </div>
              )}
            </div>
          );
        })}

        <div
          onClick={() => {
            onSelect("AUTO_RANDOM");
            onSelectTeacher(null);
          }}
          className={`relative cursor-pointer border rounded-2xl p-4 transition-all duration-200 flex flex-col items-center justify-center text-center ${
            selectedTypeId === "AUTO_RANDOM"
              ? "border-primary ring-2 ring-primary/50 bg-primary/20 text-primary shadow-xl scale-[1.02]"
              : "border-dashed border-border bg-transparent hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          <div className="text-2xl mb-1">🎲</div>
          <h3 className="font-bold">Auto Random</h3>
          <p className="text-xs mt-1 opacity-70">Let the platform decide fairly</p>
        </div>
      </div>

      {selectedType?.requiresTeacher && (
        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-in fade-in slide-in-from-top-2">
          <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide block mb-2">
            Nominate a Judge *
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            {selectedType.name} requires a teacher to act as a judge. They must accept before the war can begin.
          </p>
          <select
            value={selectedTeacherId ?? ""}
            onChange={(e) => onSelectTeacher(e.target.value || null)}
            className="w-full bg-card border border-amber-500/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            required
          >
            <option value="">Select an available teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.surname}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
