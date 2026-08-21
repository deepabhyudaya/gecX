export type WarTypeConfig = {
  id: string;
  name: string;
  description: string;
  requiresTeacher: boolean;
  favors: string;
  durationHint: string;
  strategicHint: string;
  color: string;
};

export const WAR_TYPES: WarTypeConfig[] = [
  {
    id: "KNOWLEDGE_DUEL",
    name: "Knowledge Duel",
    description: "The classic academic showdown. Speed and accuracy both matter.",
    requiresTeacher: true,
    favors: "Retention",
    durationHint: "15-30 Mins",
    strategicHint: "Choose this if you have perfect recall.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "KARMA_SPRINT",
    name: "Karma Sprint",
    description: "An endurance race to earn the most karma in a fixed window.",
    requiresTeacher: false,
    favors: "Hustle",
    durationHint: "48 Hours",
    strategicHint: "Choose this for pure hustle and high activity.",
    color: "from-orange-500 to-amber-500",
  },
  {
    id: "ATTENDANCE_SIEGE",
    name: "Attendance Siege",
    description: "The ultimate test of discipline. Maintain the highest attendance.",
    requiresTeacher: false,
    favors: "Discipline",
    durationHint: "14 Days",
    strategicHint: "Choose this if you never skip a day.",
    color: "from-emerald-500 to-green-500",
  },
  {
    id: "CREATIVE_CLASH",
    name: "Creative Clash",
    description: "Community-judged showdown based on a creative submission.",
    requiresTeacher: true,
    favors: "Creativity",
    durationHint: "4 Days",
    strategicHint: "Choose this to let your work speak for itself.",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "SPEED_ROUND",
    name: "Speed Round",
    description: "Pure chaos and adrenaline. First correct answer wins the point.",
    requiresTeacher: true,
    favors: "Reactions",
    durationHint: "~5 Mins",
    strategicHint: "Choose this if you thrive under extreme pressure.",
    color: "from-red-500 to-rose-500",
  },
  {
    id: "SILENT_WAR",
    name: "Silent War",
    description: "Test of pure ego. No posts allowed. Win purely on attendance.",
    requiresTeacher: false,
    favors: "Ego",
    durationHint: "14 Days",
    strategicHint: "Choose this to make a point.",
    color: "from-slate-500 to-zinc-500",
  },
  {
    id: "REPUTATION_WAR",
    name: "Reputation War",
    description: "Only helpful marks from completely neutral strangers count.",
    requiresTeacher: false,
    favors: "Objectivity",
    durationHint: "7 Days",
    strategicHint: "Choose this if your answers help strangers.",
    color: "from-indigo-500 to-violet-500",
  },
  {
    id: "WILDCARD",
    name: "Wildcard War",
    description: "Platform randomly assigns the war type at the exact start moment.",
    requiresTeacher: true,
    favors: "Adaptability",
    durationHint: "Varies",
    strategicHint: "Choose this if you fear nothing.",
    color: "from-fuchsia-500 to-rose-500",
  },
];
