

export type LoreContext = {
  classAName: string;
  classBName: string;
  weekNumber: number;
  classAScore: number;
  classBScore: number;
  boutTitle?: string;
  boutWinnerName?: string;
  boutLoserName?: string;
  totalBouts: number;
};

const OPENING_LINES_A_LEADS = [
  "The halls fell silent as {classA} tightened their iron grip on the battlefield.",
  "Chronicles speak of a week where {classA} marched unopposed through enemy lines.",
  "Scouts from {classB} returned with grim news — {classA} had grown stronger.",
  "Week {week}. The war diary of {classA} was written in victory ink.",
  "Legends grow in the shadow of defeat. This week, {classB} lived in that shadow.",
];

const OPENING_LINES_B_LEADS = [
  "The tide turned in Week {week}. {classB} struck with fury and precision.",
  "No war is ever truly won until the final whistle. {classB} made sure of that.",
  "From the ashes of last week, {classB} rose like something the curriculum forgot to teach.",
  "The scoreboard does not lie. Week {week} belonged to {classB}.",
  "History remembers those who endure. {classA} may want to forget this week.",
];

const OPENING_LINES_TIED = [
  "Week {week}. Neither fortress fell. Neither banner was torn.",
  "They met on the battlefield and found each other equal — a rare and terrible thing.",
  "The scoreboard at week's end read: {classA} {scoreA} — {classB} {scoreB}. A draw. A reckoning postponed.",
  "Two forces, evenly matched. The war continues, unresolved and magnificent.",
  "Peace is a myth between rivals. This week was not peace — it was tension, crystallised.",
];

const MIDDLE_LINES = [
  "In the arena of {boutTitle}, champions were tested and legends were forged.",
  "Whispers in the corridors turned to roars as the bout of {boutTitle} unfolded.",
  "The clash of {boutTitle} will be remembered long after the season ends.",
  "Teachers turned a blind eye. The real lesson was in {boutTitle}.",
  "No rubric can measure what was at stake in {boutTitle}.",
  "History will archive {boutTitle} as the defining bout of Week {week}.",
];

const CLOSING_LINES_A_LEADS = [
  "The season is far from over. {classB} sharpens their blades in silence.",
  "Every story needs a villain. {classB} hasn't decided which role they're playing yet.",
  "{classA} leads, but empires have fallen before.",
  "The archive grows. The legend of {classA} is still being written — ink still wet.",
  "Next week, the battlefield resets. Nothing is permanent — except the record.",
];

const CLOSING_LINES_B_LEADS = [
  "{classA} has history. {classB} now has momentum. History vs momentum — the oldest rivalry in sports.",
  "The gap closes. The war rekindles.",
  "One week does not decide a season. But it does decide a narrative.",
  "{classB} sends a message. {classA} better read it carefully.",
  "The archive doesn't care about last week. It only cares about what happened now.",
];

const CLOSING_LINES_TIED = [
  "The battlefield awaits. Next week, the stalemate breaks.",
  "Equal forces are the most dangerous kind. Something will give.",
  "Two classes, one battlefield, no winner yet. The story continues.",
  "Draw. The word tastes like unfinished business.",
  "History loves a comeback. Both sides are writing theirs.",
];

const LORE_TITLES_A_LEADS = [
  "The Ascendancy of {classA}",
  "{classA} Writes Its Legend",
  "The Week {classB} Stood Still",
  "Dominion: The {classA} Chronicle",
  "War Diary, Week {week}: {classA} Advances",
];

const LORE_TITLES_B_LEADS = [
  "The Uprising of {classB}",
  "Turning Tide: {classB} Strikes Back",
  "Week {week}: The {classB} Renaissance",
  "{classB} Rewrites the War",
  "Comeback Arc: {classB} Emerges",
];

const LORE_TITLES_TIED = [
  "The Stalemate of Week {week}",
  "Neither Yields: A Chronicle of Equals",
  "The Draw That Changed Everything",
  "Equilibrium: Week {week}",
  "Two Armies, One Battlefield, No Winner",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template: string, ctx: LoreContext): string {
  return template
    .replace(/{classA}/g, ctx.classAName)
    .replace(/{classB}/g, ctx.classBName)
    .replace(/{scoreA}/g, String(Math.round(ctx.classAScore)))
    .replace(/{scoreB}/g, String(Math.round(ctx.classBScore)))
    .replace(/{week}/g, String(ctx.weekNumber))
    .replace(/{boutTitle}/g, ctx.boutTitle || "the arena")
    .replace(/{winner}/g, ctx.boutWinnerName || "the victors")
    .replace(/{loser}/g, ctx.boutLoserName || "the defeated");
}

export function generateWeeklyLore(ctx: LoreContext): { title: string; narrative: string } {
  const aLeads = ctx.classAScore > ctx.classBScore;
  const bLeads = ctx.classBScore > ctx.classAScore;
  const tied = ctx.classAScore === ctx.classBScore;

  const titleTemplates = aLeads ? LORE_TITLES_A_LEADS : bLeads ? LORE_TITLES_B_LEADS : LORE_TITLES_TIED;
  const openings = aLeads ? OPENING_LINES_A_LEADS : bLeads ? OPENING_LINES_B_LEADS : OPENING_LINES_TIED;
  const closings = aLeads ? CLOSING_LINES_A_LEADS : bLeads ? CLOSING_LINES_B_LEADS : CLOSING_LINES_TIED;

  const title = fill(pick(titleTemplates), ctx);

  const hasBout = !!ctx.boutTitle;
  const parts: string[] = [fill(pick(openings), ctx)];
  if (hasBout) parts.push(fill(pick(MIDDLE_LINES), ctx));
  parts.push(`Standings: ${ctx.classAName} ${Math.round(ctx.classAScore)}pts — ${ctx.classBName} ${Math.round(ctx.classBScore)}pts after ${ctx.totalBouts} bout${ctx.totalBouts !== 1 ? "s" : ""}.`);
  parts.push(fill(pick(closings), ctx));

  return { title, narrative: parts.join(" ") };
}

export function generateSeasonClosingLore(ctx: LoreContext & { winnerName?: string }): { title: string; narrative: string } {
  const SEASON_TITLES = [
    "The Final Chronicle: Season Concluded",
    "The Legend Has Been Written",
    "End of Season: The Verdict",
    "The Archive Closes on This Chapter",
  ];

  const title = pick(SEASON_TITLES);
  let narrative = "";

  if (ctx.winnerName) {
    narrative = `After ${ctx.totalBouts} bout${ctx.totalBouts !== 1 ? "s" : ""} of blood, sweat, and academic glory, the season has drawn to a close. ${ctx.winnerName} stands as the undisputed champion of this rivalry. The battlefield falls silent — but the archive remembers everything. Final score: ${ctx.classAName} ${Math.round(ctx.classAScore)} — ${ctx.classBName} ${Math.round(ctx.classBScore)}. Until next season, warriors. Your legend is sealed.`;
  } else {
    narrative = `After ${ctx.totalBouts} bout${ctx.totalBouts !== 1 ? "s" : ""}, the season ends in a draw that neither side will ever fully accept. ${ctx.classAName} ${Math.round(ctx.classAScore)} — ${ctx.classBName} ${Math.round(ctx.classBScore)}. No winner. No loser. Only two classes who refused to yield. The archive records this as the most honourable season of all.`;
  }

  return { title, narrative };
}

export const BANNED_WORDS_PATTERN = /\b(idiot|stupid|trash|loser|dumb|hate|ugly|failure|worthless|clown|moron|pathetic)\b/gi;

export function containsBannedWords(text: string): boolean {
  return BANNED_WORDS_PATTERN.test(text);
}
