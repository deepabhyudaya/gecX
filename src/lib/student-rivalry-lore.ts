

export type DuelLoreContext = {
  studentAName: string;
  studentBName: string;
  weekNumber: number;
  studentAScore: number;
  studentBScore: number;
  boutTitle?: string;
  boutWinnerName?: string;
  totalBouts: number;
};

const OPENING_LINES_A_LEADS = [
  "The arena fell silent as {studentA} tightened their grip on the duel.",
  "Chronicles speak of a round where {studentA} stood unchallenged.",
  "Scouts returned with grim news — {studentA} had grown stronger.",
  "Round {week}. The war diary of {studentA} was written in victory ink.",
  "Legends grow in the shadow of defeat. This round, {studentB} lived in that shadow.",
];

const OPENING_LINES_B_LEADS = [
  "The tide turned in Round {week}. {studentB} struck with fury and precision.",
  "No duel is ever truly won until the final bell. {studentB} made sure of that.",
  "From the ashes of last round, {studentB} rose like something the curriculum forgot to teach.",
  "The scoreboard does not lie. Round {week} belonged to {studentB}.",
  "History remembers those who endure. {studentA} may want to forget this round.",
];

const OPENING_LINES_TIED = [
  "Round {week}. Neither fortress fell. Neither banner was torn.",
  "They met in the arena and found each other equal — a rare and terrible thing.",
  "The scoreboard at round's end read: {studentA} {scoreA} — {studentB} {scoreB}. A draw. A reckoning postponed.",
  "Two warriors, evenly matched. The duel continues, unresolved and magnificent.",
  "A draw. The word tastes like unfinished business.",
];

const MIDDLE_LINES = [
  "In the clash of {boutTitle}, champions were tested and legends were forged.",
  "Whispers in the corridors turned to roars as the bout of {boutTitle} unfolded.",
  "The clash of {boutTitle} will be remembered long after the season ends.",
  "Teachers turned a blind eye. The real lesson was in {boutTitle}.",
  "No rubric can measure what was at stake in {boutTitle}.",
  "History will archive {boutTitle} as the defining bout of Round {week}.",
];

const CLOSING_LINES_A_LEADS = [
  "The season is far from over. {studentB} sharpens their blade in silence.",
  "Every story needs a rival. {studentB} hasn't decided which role they're playing yet.",
  "{studentA} leads, but empires have fallen before.",
  "The archive grows. The legend of {studentA} is still being written — ink still wet.",
  "Next round, the arena resets. Nothing is permanent — except the record.",
];

const CLOSING_LINES_B_LEADS = [
  "{studentA} has history. {studentB} now has momentum. History vs momentum — the oldest rivalry of all.",
  "The gap closes. The war rekindles.",
  "One round does not decide a season. But it does decide a narrative.",
  "{studentB} sends a message. {studentA} better read it carefully.",
  "The archive doesn't care about last round. It only cares about what happened now.",
];

const CLOSING_LINES_TIED = [
  "The arena awaits. Next round, the stalemate breaks.",
  "Equal forces are the most dangerous kind. Something will give.",
  "Two warriors, one arena, no winner yet. The story continues.",
  "History loves a comeback. Both sides are writing theirs.",
  "The scoreboard reads even. The tension reads unbearable.",
];

const LORE_TITLES_A_LEADS = [
  "The Ascendancy of {studentA}",
  "{studentA} Writes Their Legend",
  "The Round {studentB} Stood Still",
  "Dominion: The {studentA} Chronicle",
  "War Diary, Round {week}: {studentA} Advances",
];

const LORE_TITLES_B_LEADS = [
  "The Uprising of {studentB}",
  "Turning Tide: {studentB} Strikes Back",
  "Round {week}: The {studentB} Renaissance",
  "{studentB} Rewrites the War",
  "Comeback Arc: {studentB} Emerges",
];

const LORE_TITLES_TIED = [
  "The Stalemate of Round {week}",
  "Neither Yields: A Chronicle of Equals",
  "The Draw That Changed Everything",
  "Equilibrium: Round {week}",
  "Two Warriors, One Arena, No Winner",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template: string, ctx: DuelLoreContext): string {
  return template
    .replace(/{studentA}/g, ctx.studentAName)
    .replace(/{studentB}/g, ctx.studentBName)
    .replace(/{scoreA}/g, String(Math.round(ctx.studentAScore)))
    .replace(/{scoreB}/g, String(Math.round(ctx.studentBScore)))
    .replace(/{week}/g, String(ctx.weekNumber))
    .replace(/{boutTitle}/g, ctx.boutTitle || "the arena");
}

export function generateWeeklyLore(ctx: DuelLoreContext): { title: string; narrative: string } {
  const aLeads = ctx.studentAScore > ctx.studentBScore;
  const bLeads = ctx.studentBScore > ctx.studentAScore;
  const tied = ctx.studentAScore === ctx.studentBScore;

  const titleTemplates = aLeads ? LORE_TITLES_A_LEADS : bLeads ? LORE_TITLES_B_LEADS : LORE_TITLES_TIED;
  const openings = aLeads ? OPENING_LINES_A_LEADS : bLeads ? OPENING_LINES_B_LEADS : OPENING_LINES_TIED;
  const closings = aLeads ? CLOSING_LINES_A_LEADS : bLeads ? CLOSING_LINES_B_LEADS : CLOSING_LINES_TIED;

  const title = fill(pick(titleTemplates), ctx);

  const hasBout = !!ctx.boutTitle;
  const parts: string[] = [fill(pick(openings), ctx)];
  if (hasBout) parts.push(fill(pick(MIDDLE_LINES), ctx));
  parts.push(`Standings: ${ctx.studentAName} ${Math.round(ctx.studentAScore)}pts — ${ctx.studentBName} ${Math.round(ctx.studentBScore)}pts after ${ctx.totalBouts} bout${ctx.totalBouts !== 1 ? "s" : ""}.`);
  parts.push(fill(pick(closings), ctx));

  return { title, narrative: parts.join(" ") };
}

export function generateSeasonClosingLore(ctx: DuelLoreContext & { winnerName?: string }): { title: string; narrative: string } {
  const SEASON_TITLES = [
    "The Final Chronicle: Duel Concluded",
    "The Legend Has Been Written",
    "End of Season: The Verdict",
    "The Archive Closes on This Chapter",
  ];

  const title = pick(SEASON_TITLES);
  let narrative = "";

  if (ctx.winnerName) {
    narrative = `After ${ctx.totalBouts} bout${ctx.totalBouts !== 1 ? "s" : ""} of blood, sweat, and academic glory, the duel has drawn to a close. ${ctx.winnerName} stands as the undisputed champion. The arena falls silent — but the archive remembers everything. Final score: ${ctx.studentAName} ${Math.round(ctx.studentAScore)} — ${ctx.studentBName} ${Math.round(ctx.studentBScore)}. Until next season, warriors. Your legend is sealed.`;
  } else {
    narrative = `After ${ctx.totalBouts} bout${ctx.totalBouts !== 1 ? "s" : ""}, the duel ends in a draw that neither warrior will ever fully accept. ${ctx.studentAName} ${Math.round(ctx.studentAScore)} — ${ctx.studentBName} ${Math.round(ctx.studentBScore)}. No winner. No loser. Only two students who refused to yield. The archive records this as the most honourable duel of all.`;
  }

  return { title, narrative };
}
