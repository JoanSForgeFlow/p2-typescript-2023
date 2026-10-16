export interface GameVersion {
  key: string;
  label: string;
}

export interface Game {
  key: string;
  label: string;
  gen: number;
  order: number;
  versions: GameVersion[];
  hasMoves: boolean;
  hasLocations: boolean;
  hasEntries: boolean;
}

export interface TypeChart {
  upToGen: number;
  multipliers: number[][];
}

export interface Meta {
  games: Game[];
  versionLabels: Record<string, string>;
  types: string[];
  typeIntroduced: number[];
  charts: TypeChart[];
  methods: string[];
  regions: string[];
  typeLabels?: Record<string, string>;
}

export type PastMoveValue = [beforeOrder: number, power: number | null, accuracy: number | null, pp: number | null, type: number | null];

export type MoveRow = [
  name: string,
  type: number,
  damageClass: number,
  power: number | null,
  accuracy: number | null,
  pp: number | null,
  past: PastMoveValue[],
];

export interface MoveTable {
  moves: MoveRow[];
  machines: Record<string, Record<number, string>>;
}

export type LearnRow = [move: number, method: number, level: number];

export interface Ability {
  name: string;
  label: string;
  hidden: boolean;
  text: string;
}

export interface Encounter {
  area: string;
  method: string;
  min: number;
  max: number;
  chance: number;
  conditions: string[];
}

export type EncounterRow = number[];

export interface EntryGroup {
  text: string;
  versions: string[];
  lang?: string;
}

export interface Variety {
  name: string;
  label: string;
  title: string;
  hash: string;
  isDefault: boolean;
  battleOnly: boolean;
  types: string[];
  pastTypes: [upToGen: number, types: string[]][];
  stats: number[];
  evs: number[];
  baseExp: number | null;
  height: number;
  weight: number;
  abilities: Ability[];
  art: string;
  shiny: string;
  anim: string;
  animShiny: string;
  cry: string;
  games: string[];
  learnset: number;
  encounters: Record<string, number>;
  entries: EntryGroup[] | null;
}

export interface Profile {
  genderRate: number;
  genderDiff: boolean;
  eggGroups: string[];
  hatchCounter: number;
  captureRate: number;
  baseHappiness: number;
  growthRate: string;
  habitat: string;
  generation: number;
}

export interface PageData {
  dex: number;
  name: string;
  codename: string;
  defaultGame: string;
  varieties: Variety[];
  learnsets: Record<string, LearnRow[]>[];
  strings: string[];
  encounterSets: EncounterRow[][];
  entries: EntryGroup[];
  profile: Profile;
}

export const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];

export const DAMAGE_CLASSES = ['physical', 'special', 'status'];

export function decodeEncounters(page: Pick<PageData, 'strings' | 'encounterSets'>, set: number): Encounter[] {
  return (page.encounterSets[set] || []).map(([area, method, min, max, chance, ...conditions]) => ({
    area: page.strings[area],
    method: page.strings[method],
    min,
    max,
    chance,
    conditions: conditions.map(c => page.strings[c]),
  }));
}
