import { cachedFetchJson } from "../fetch-cache";
import type { Game } from "../shared/model";
import { joinNames, type Lang } from "../shared/i18n";
import { localName } from "./localize";

export interface VersionGroupInfo {
  name: string;
  order: number;
  gen: number;
  versions: string[];
  pokedexes: string[];
}

export interface GameSource extends Game {
  versionGroups: string[];
  pokedexes: string[];
}

export interface GameCatalog {
  games: GameSource[];
  versionGroups: Map<string, VersionGroupInfo>;
  versionLabels: Map<string, string>;
  versionNames: Map<string, any[]>;
  versionOrder: Map<string, number>;
  gameOfVersionGroup: Map<string, string>;
}

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

export const genNumber = (generationName: string): number => ROMAN[generationName.replace('generation-', '')] || 0;

// Some games bundle long version names; keep the selector readable.
const LABEL_OVERRIDES: Record<Lang, Record<string, string>> = {
  en: { 'lets-go-pikachu-lets-go-eevee': "Let's Go Pikachu & Eevee" },
  es: { 'lets-go-pikachu-lets-go-eevee': "Let's Go Pikachu y Eevee" },
};

export const versionLabel = (catalog: GameCatalog, version: string, lang: Lang): string =>
  localName(catalog.versionNames.get(version), lang) || version;

export const gameLabel = (catalog: GameCatalog, game: GameSource, lang: Lang): string =>
  LABEL_OVERRIDES[lang][game.key]
  || joinNames((catalog.versionGroups.get(game.key)?.versions || []).map(v => versionLabel(catalog, v, lang)), lang);

let catalogPromise: Promise<GameCatalog> | null = null;

export function loadGames(): Promise<GameCatalog> {
  if (!catalogPromise) catalogPromise = buildCatalog();
  return catalogPromise;
}

async function buildCatalog(): Promise<GameCatalog> {
  const list = await cachedFetchJson("https://pokeapi.co/api/v2/version-group/?limit=1000");
  const groups: VersionGroupInfo[] = await Promise.all(list.results.map(async (r: any) => {
    const vg = await cachedFetchJson(r.url);
    return {
      name: vg.name,
      order: vg.order,
      gen: genNumber(vg.generation.name),
      versions: vg.versions.map((v: any) => v.name),
      pokedexes: vg.pokedexes.map((p: any) => p.name),
    };
  }));
  groups.sort((a, b) => a.order - b.order);

  const versionLabels = new Map<string, string>();
  const versionNames = new Map<string, any[]>();
  const versionOrder = new Map<string, number>();
  await Promise.all(groups.flatMap(g => g.versions.map(async (v) => {
    const data = await cachedFetchJson(`https://pokeapi.co/api/v2/version/${v}/`);
    versionLabels.set(v, localName(data.names, 'en') || v);
    versionNames.set(v, data.names || []);
    versionOrder.set(v, g.order);
  })));

  // Expansions (Isle of Armor, Teal Mask, Mega Dimension…) come after their
  // base game, only use some of its Pokédexes and have no learnsets of their
  // own, so they're folded into that game. Japan-only releases and spin-offs
  // without a Pokédex (Colosseum, XD) aren't offered as games.
  const parentOf = new Map<string, string>();
  for (const g of groups) {
    if (g.pokedexes.length === 0 || g.versions.every(v => v.endsWith('-japan'))) continue;
    const parent = groups.find(p => p !== g && p.gen === g.gen && p.order < g.order
      && g.pokedexes.length < p.pokedexes.length && g.pokedexes.every(d => p.pokedexes.includes(d))
      && !parentOf.has(p.name));
    if (parent) parentOf.set(g.name, parent.name);
  }

  const games: GameSource[] = [];
  const gameOfVersionGroup = new Map<string, string>();
  for (const g of groups) {
    if (g.pokedexes.length === 0 || g.versions.every(v => v.endsWith('-japan')) || parentOf.has(g.name)) continue;
    const children = groups.filter(c => parentOf.get(c.name) === g.name);
    const members = [g, ...children];
    for (const m of members) gameOfVersionGroup.set(m.name, g.name);
    games.push({
      key: g.name,
      label: LABEL_OVERRIDES.en[g.name] || g.versions.map(v => versionLabels.get(v) || v).join(' & '),
      gen: g.gen,
      order: g.order,
      versions: members.flatMap(m => m.versions.map(v => ({ key: v, label: versionLabels.get(v) || v }))),
      hasMoves: false,
      hasLocations: false,
      hasEntries: false,
      versionGroups: members.map(m => m.name),
      pokedexes: Array.from(new Set(members.flatMap(m => m.pokedexes))),
    });
  }
  games.sort((a, b) => b.order - a.order);
  return {
    games,
    versionGroups: new Map(groups.map(g => [g.name, g])),
    versionLabels,
    versionNames,
    versionOrder,
    gameOfVersionGroup,
  };
}

export async function loadPokedexMembers(catalog: GameCatalog): Promise<Map<string, Set<string>>> {
  const members = new Map<string, Set<string>>();
  for (const game of catalog.games) {
    const species = new Set<string>();
    for (const dex of game.pokedexes) {
      const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokedex/${dex}/`);
      for (const entry of data.pokemon_entries) species.add(entry.pokemon_species.name);
    }
    members.set(game.key, species);
  }
  return members;
}
