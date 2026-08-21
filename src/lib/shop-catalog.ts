

import { ORB_VARIANTS } from "./orb-avatars";

export type DiceBearCategory =
  | "abstract"
  | "characters"
  | "fun"
  | "robots"
  | "artistic"
  | "pixel"
  | "orbs";

export interface CatalogItem {
  id: string;
  style: string;
  seed: string;
  name: string;
  category: DiceBearCategory;
  cost: number;
}

function variants(
  style: string,
  category: DiceBearCategory,
  cost: number,
  entries: Array<[seed: string, label: string]>
): CatalogItem[] {
  return entries.map(([seed, label]) => ({
    id: `${style}--${seed}`,
    style,
    seed,
    name: label,
    category,
    cost,
  }));
}

export const DICEBEAR_CATALOG: CatalogItem[] = [

  ...variants("pixel-art", "pixel", 80, [
    ["warrior",      "Pixel Warrior"],
    ["mage",         "Pixel Mage"],
    ["rogue",        "Pixel Rogue"],
    ["archer",       "Pixel Archer"],
    ["paladin",      "Pixel Paladin"],
    ["druid",        "Pixel Druid"],
    ["bard",         "Pixel Bard"],
    ["necromancer",  "Pixel Necromancer"],
    ["ranger",       "Pixel Ranger"],
    ["monk",         "Pixel Monk"],
    ["alchemist",    "Pixel Alchemist"],
    ["berserker",    "Pixel Berserker"],
  ]),

  ...variants("pixel-art-neutral", "pixel", 70, [
    ["ghost",    "Pixel Ghost"],
    ["golem",    "Pixel Golem"],
    ["demon",    "Pixel Demon"],
    ["angel",    "Pixel Angel"],
    ["spirit",   "Pixel Spirit"],
    ["phantom",  "Pixel Phantom"],
    ["revenant", "Pixel Revenant"],
    ["elemental","Pixel Elemental"],
  ]),

  ...variants("adventurer", "characters", 75, [
    ["ocean",   "Ocean Adventurer"],
    ["forest",  "Forest Adventurer"],
    ["shadow",  "Shadow Adventurer"],
    ["frost",   "Frost Adventurer"],
    ["ember",   "Ember Adventurer"],
    ["storm",   "Storm Adventurer"],
    ["dawn",    "Dawn Adventurer"],
    ["dusk",    "Dusk Adventurer"],
  ]),

  ...variants("adventurer-neutral", "characters", 65, [
    ["neutral-a", "Adventurer Neutral A"],
    ["neutral-b", "Adventurer Neutral B"],
    ["neutral-c", "Adventurer Neutral C"],
    ["neutral-d", "Adventurer Neutral D"],
    ["neutral-e", "Adventurer Neutral E"],
    ["neutral-f", "Adventurer Neutral F"],
  ]),

  ...variants("avataaars", "characters", 75, [
    ["felix",   "Avataar Felix"],
    ["alex",    "Avataar Alex"],
    ["jordan",  "Avataar Jordan"],
    ["casey",   "Avataar Casey"],
    ["morgan",  "Avataar Morgan"],
    ["riley",   "Avataar Riley"],
    ["quinn",   "Avataar Quinn"],
    ["taylor",  "Avataar Taylor"],
  ]),

  ...variants("avataaars-neutral", "characters", 65, [
    ["neutral-1", "Avataar Neutral 1"],
    ["neutral-2", "Avataar Neutral 2"],
    ["neutral-3", "Avataar Neutral 3"],
    ["neutral-4", "Avataar Neutral 4"],
    ["neutral-5", "Avataar Neutral 5"],
    ["neutral-6", "Avataar Neutral 6"],
  ]),

  ...variants("big-ears", "characters", 70, [
    ["sunny",  "Sunny Big Ears"],
    ["cloud",  "Cloud Big Ears"],
    ["river",  "River Big Ears"],
    ["stone",  "Stone Big Ears"],
    ["wind",   "Wind Big Ears"],
    ["rain",   "Rain Big Ears"],
  ]),

  ...variants("big-ears-neutral", "characters", 60, [
    ["be-neutral-a", "Big Ears Neutral A"],
    ["be-neutral-b", "Big Ears Neutral B"],
    ["be-neutral-c", "Big Ears Neutral C"],
    ["be-neutral-d", "Big Ears Neutral D"],
    ["be-neutral-e", "Big Ears Neutral E"],
    ["be-neutral-f", "Big Ears Neutral F"],
  ]),

  ...variants("lorelei", "characters", 75, [
    ["aurora",   "Lorelei Aurora"],
    ["crystal",  "Lorelei Crystal"],
    ["jade",     "Lorelei Jade"],
    ["ruby",     "Lorelei Ruby"],
    ["sapphire", "Lorelei Sapphire"],
    ["topaz",    "Lorelei Topaz"],
  ]),

  ...variants("lorelei-neutral", "characters", 60, [
    ["ln-alpha", "Lorelei Neutral α"],
    ["ln-beta",  "Lorelei Neutral β"],
    ["ln-gamma", "Lorelei Neutral γ"],
    ["ln-delta", "Lorelei Neutral δ"],
  ]),

  ...variants("micah", "characters", 75, [
    ["atlas",   "Micah Atlas"],
    ["cedar",   "Micah Cedar"],
    ["echo",    "Micah Echo"],
    ["grove",   "Micah Grove"],
    ["haven",   "Micah Haven"],
    ["indigo",  "Micah Indigo"],
  ]),

  ...variants("miniavs", "characters", 60, [
    ["ace",   "Miniav Ace"],
    ["base",  "Miniav Base"],
    ["core",  "Miniav Core"],
    ["dome",  "Miniav Dome"],
    ["edge",  "Miniav Edge"],
    ["flux",  "Miniav Flux"],
  ]),

  ...variants("open-peeps", "characters", 70, [
    ["aria",  "Peep Aria"],
    ["blake", "Peep Blake"],
    ["crew",  "Peep Crew"],
    ["duke",  "Peep Duke"],
    ["eve",   "Peep Eve"],
    ["fox",   "Peep Fox"],
  ]),

  ...variants("personas", "characters", 75, [
    ["alpha",   "Persona Alpha"],
    ["bravo",   "Persona Bravo"],
    ["charlie", "Persona Charlie"],
    ["delta",   "Persona Delta"],
    ["echo",    "Persona Echo"],
    ["foxtrot", "Persona Foxtrot"],
  ]),

  ...variants("toon-head", "characters", 80, [
    ["bounce", "Toon Bounce"],
    ["coil",   "Toon Coil"],
    ["dart",   "Toon Dart"],
    ["edge",   "Toon Edge"],
    ["flash",  "Toon Flash"],
    ["gale",   "Toon Gale"],
  ]),

  ...variants("big-smile", "fun", 60, [
    ["happy",  "Happy Smile"],
    ["cheer",  "Cheer Smile"],
    ["grin",   "Big Grin"],
    ["beam",   "Beam Smile"],
    ["glow",   "Glow Smile"],
    ["radiant","Radiant Smile"],
  ]),

  ...variants("dylan", "fun", 60, [
    ["nova",  "Dylan Nova"],
    ["sol",   "Dylan Sol"],
    ["vex",   "Dylan Vex"],
    ["yay",   "Dylan Yay"],
    ["zen",   "Dylan Zen"],
    ["blaze", "Dylan Blaze"],
  ]),

  ...variants("fun-emoji", "fun", 55, [
    ["star",    "Star Emoji"],
    ["heart",   "Heart Emoji"],
    ["fire",    "Fire Emoji"],
    ["cool",    "Cool Emoji"],
    ["zap",     "Zap Emoji"],
    ["rainbow", "Rainbow Emoji"],
    ["moon",    "Moon Emoji"],
    ["thunder", "Thunder Emoji"],
  ]),

  ...variants("croodles", "fun", 55, [
    ["swirl", "Croodle Swirl"],
    ["loop",  "Croodle Loop"],
    ["wave",  "Croodle Wave"],
    ["curl",  "Croodle Curl"],
    ["twist", "Croodle Twist"],
    ["spiral","Croodle Spiral"],
  ]),

  ...variants("croodles-neutral", "fun", 45, [
    ["echo",  "Croodle Echo"],
    ["fade",  "Croodle Fade"],
    ["haze",  "Croodle Haze"],
    ["mist",  "Croodle Mist"],
  ]),

  ...variants("bottts", "robots", 70, [
    ["r2d2",     "Bot R2-D2"],
    ["c3po",     "Bot C-3PO"],
    ["bb8",      "Bot BB-8"],
    ["k1",       "Bot K-1"],
    ["t800",     "Bot T-800"],
    ["optimus",  "Bot Optimus"],
    ["wall-e",   "Bot WALL·E"],
    ["bender",   "Bot Bender"],
  ]),

  ...variants("bottts-neutral", "robots", 60, [
    ["proto",   "Proto Bot"],
    ["nexus",   "Nexus Bot"],
    ["vertex",  "Vertex Bot"],
    ["axis",    "Axis Bot"],
    ["helix",   "Helix Bot"],
    ["matrix",  "Matrix Bot"],
  ]),

  ...variants("notionists", "artistic", 100, [
    ["sketch",  "Notion Sketch"],
    ["draft",   "Notion Draft"],
    ["line",    "Notion Line"],
    ["stroke",  "Notion Stroke"],
    ["pen",     "Notion Pen"],
    ["ink",     "Notion Ink"],
  ]),

  ...variants("notionists-neutral", "artistic", 90, [
    ["blank", "Notion Blank"],
    ["void",  "Notion Void"],
    ["null",  "Notion Null"],
    ["zero",  "Notion Zero"],
  ]),

  ...variants("glass", "abstract", 50, [
    ["prism",   "Glass Prism"],
    ["lens",    "Glass Lens"],
    ["crystal", "Glass Crystal"],
    ["mirror",  "Glass Mirror"],
    ["frost",   "Glass Frost"],
    ["shatter", "Glass Shatter"],
  ]),

  ...variants("rings", "abstract", 50, [
    ["saturn", "Saturn Rings"],
    ["orbit",  "Orbit Rings"],
    ["vortex", "Vortex Rings"],
    ["halo",   "Halo Rings"],
    ["nebula", "Nebula Rings"],
    ["comet",  "Comet Rings"],
  ]),

  ...variants("shapes", "abstract", 45, [
    ["cube",     "Shape Cube"],
    ["diamond",  "Shape Diamond"],
    ["star",     "Shape Star"],
    ["hexagon",  "Shape Hexagon"],
    ["triangle", "Shape Triangle"],
    ["circle",   "Shape Circle"],
  ]),

  ...variants("thumbs", "abstract", 45, [
    ["blue",    "Thumb Blue"],
    ["red",     "Thumb Red"],
    ["gold",    "Thumb Gold"],
    ["silver",  "Thumb Silver"],
    ["cosmic",  "Thumb Cosmic"],
    ["emerald", "Thumb Emerald"],
  ]),

  ...variants("icons", "abstract", 35, [
    ["alpha",   "Icon Alpha"],
    ["beta",    "Icon Beta"],
    ["gamma",   "Icon Gamma"],
    ["delta",   "Icon Delta"],
    ["epsilon", "Icon Epsilon"],
    ["zeta",    "Icon Zeta"],
  ]),

  ...variants("identicon", "abstract", 30, [
    ["id-a", "Identicon A"],
    ["id-b", "Identicon B"],
    ["id-c", "Identicon C"],
    ["id-d", "Identicon D"],
    ["id-e", "Identicon E"],
    ["id-f", "Identicon F"],
  ]),

  ...variants("initials", "abstract", 25, [
    ["ab", "Initials AB"],
    ["cd", "Initials CD"],
    ["xy", "Initials XY"],
    ["zz", "Initials ZZ"],
  ]),

  ...ORB_VARIANTS.map((orb) => ({
    id: `orb--${orb.seed}`,
    style: "orb",
    seed: orb.seed,
    name: orb.name,
    category: "orbs" as DiceBearCategory,
    cost: orb.cost,
  })),
];
