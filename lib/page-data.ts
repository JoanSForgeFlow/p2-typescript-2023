import { cachedFetchJson } from "../fetch-cache";
import type { PokemonDetails } from "../pokemon-detail";
import { STAT_KEYS, type Ability, type Encounter, type EncounterRow, type EntryGroup, type LearnRow, type PageData, type Variety } from "../shared/model";
import { titleCase } from "../shared/format";
import type { Lang } from "../shared/i18n";
import { genNumber, versionLabel, type GameCatalog } from "./games";
import { areaQualifier, encounterConditionLabel, encounterMethodLabel, localName, locationLabel, nameIn, resourceName, spanishVarietyLabels } from "./localize";
import type { MoveIndex } from "./moves";

export interface BuildContext {
  catalog: GameCatalog;
  dexMembers: Map<string, Set<string>>;
  moves: MoveIndex;
  methods: string[];
  lang: Lang;
}

const en = (list: any[] | undefined): any => (list || []).find((x: any) => x.language?.name === 'en');

const cleanText = (text: string): string =>
  text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();

const methodIndex = (ctx: BuildContext, method: string): number => {
  let i = ctx.methods.indexOf(method);
  if (i === -1) {
    ctx.methods.push(method);
    i = ctx.methods.length - 1;
  }
  return i;
};

export function groupEntries(ctx: BuildContext, entries: { version: string; flavor_text: string; lang?: string }[]): EntryGroup[] {
  const groups = new Map<string, EntryGroup>();
  for (const e of entries) {
    if (!ctx.catalog.versionLabels.has(e.version)) continue;
    const text = cleanText(e.flavor_text);
    if (!groups.has(text)) groups.set(text, { text, versions: [], ...(e.lang ? { lang: e.lang } : {}) });
    if (!groups.get(text)!.versions.includes(e.version)) groups.get(text)!.versions.push(e.version);
  }
  const order = (v: string) => ctx.catalog.versionOrder.get(v) ?? 0;
  for (const g of groups.values()) g.versions.sort((a, b) => order(b) - order(a));
  return Array.from(groups.values()).sort((a, b) => order(b.versions[0]) - order(a.versions[0]));
}

// Flavor text in the page's language, else English marked as such.
function localEntries(list: any[] | undefined, lang: Lang): { version: string; flavor_text: string; lang?: string }[] {
  const pick = (code: string) => (list || []).filter((e: any) => e.language.name === code)
    .map((e: any) => ({ version: e.version.name, flavor_text: e.flavor_text, ...(code !== lang ? { lang: code } : {}) }));
  const own = pick(lang);
  return own.length ? own : pick('en');
}

const areaNames = new Map<string, Promise<string>>();

// Area names in PokeAPI are inconsistent ("Road 1" for Route 1), so the
// location's name is used, plus the floor/section the area adds ("Mt. Moon (1F)").
function areaName(areaUrl: string, lang: Lang): Promise<string> {
  const key = `${lang} ${areaUrl}`;
  if (!areaNames.has(key)) {
    areaNames.set(key, (async () => {
      const area = await cachedFetchJson(areaUrl);
      const location = await cachedFetchJson(area.location.url);
      const base = locationLabel(location, lang);
      const areaLabel: string = en(area.names)?.name || '';
      const paren = areaLabel.match(/\(([^)]+)\)\s*$/);
      // Some areas just repeat the location's name ("Lilycove City (Lilycove City)").
      if (paren && paren[1] === locationLabel(location, 'en')) return base;
      if (paren) return `${base} (${await areaQualifier(paren[1], lang)})`;
      const rest = area.name.startsWith(location.name + '-') ? area.name.slice(location.name.length + 1) : '';
      if (!rest || rest === 'area') return base;
      const pretty = rest.split('-').map((w: string) => /^b?\d+f$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return `${base} (${await areaQualifier(pretty, lang)})`;
    })());
  }
  return areaNames.get(key)!;
}

// Encounters are merged by method and conditions, then stored with their
// display labels, so the page doesn't need the label tables.
async function loadEncounters(ctx: BuildContext, pokemonUrl: string): Promise<Record<string, Encounter[]>> {
  const data = await cachedFetchJson(`${pokemonUrl.replace(/\/$/, '')}/encounters`);
  const byVersion: Record<string, Map<string, Encounter>> = {};
  for (const entry of data) {
    const area = await areaName(entry.location_area.url, ctx.lang);
    for (const vd of entry.version_details) {
      const version = vd.version.name;
      if (!ctx.catalog.versionLabels.has(version) || version.endsWith('-japan')) continue;
      const rows = (byVersion[version] ||= new Map());
      for (const d of vd.encounter_details) {
        const conditions = (d.condition_values || []).map((c: any) => c.name).sort();
        const key = `${area}|${d.method.name}|${conditions.join(',')}`;
        const existing = rows.get(key);
        if (existing) {
          existing.min = Math.min(existing.min, d.min_level);
          existing.max = Math.max(existing.max, d.max_level);
          existing.chance = Math.min(100, existing.chance + d.chance);
        } else {
          rows.set(key, { area, method: d.method.name, min: d.min_level, max: d.max_level, chance: d.chance, conditions });
        }
      }
    }
  }
  const label = (version: string) => versionLabel(ctx.catalog, version, ctx.lang);
  const result: Record<string, Encounter[]> = {};
  for (const [version, rows] of Object.entries(byVersion)) {
    const labelled = await Promise.all(Array.from(rows.values()).map(async (r) => ({
      ...r,
      method: encounterMethodLabel(r.method, ctx.lang),
      conditions: (await Promise.all(r.conditions.map(c => encounterConditionLabel(c, ctx.lang, label)))).filter(Boolean),
    })));
    result[version] = labelled.sort((a, b) => a.area.localeCompare(b.area, ctx.lang, { numeric: true }) || b.chance - a.chance);
  }
  return result;
}

async function loadAbilities(pokemon: any, lang: Lang): Promise<Ability[]> {
  return Promise.all(pokemon.abilities.map(async (a: any): Promise<Ability> => {
    const data = await cachedFetchJson(a.ability.url);
    const flavor = (code: string) => (data.flavor_text_entries || []).filter((e: any) => e.language.name === code).pop()?.flavor_text;
    const effect = en(data.effect_entries)?.effect;
    const text = lang === 'en'
      ? (effect || en(data.flavor_text_entries)?.flavor_text)
      : (flavor(lang) || effect || flavor('en'));
    return {
      name: a.ability.name,
      label: localName(data.names, lang) || titleCase(a.ability.name),
      hidden: a.is_hidden,
      text: text ? cleanText(text) : (lang === 'es' ? 'Sin descripción.' : 'No description available.'),
    };
  }));
}

function learnsets(ctx: BuildContext, pokemon: any): Record<string, LearnRow[]> {
  const byGame: Record<string, Map<string, LearnRow>> = {};
  for (const m of pokemon.moves) {
    const move = ctx.moves.indexOf.get(m.move.name);
    if (move === undefined) continue;
    for (const d of m.version_group_details) {
      const game = ctx.catalog.gameOfVersionGroup.get(d.version_group.name);
      if (!game) continue;
      const method = methodIndex(ctx, d.move_learn_method.name);
      const row: LearnRow = [move, method, d.level_learned_at || 0];
      (byGame[game] ||= new Map()).set(row.join(','), row);
    }
  }
  const result: Record<string, LearnRow[]> = {};
  for (const [game, rows] of Object.entries(byGame)) result[game] = Array.from(rows.values());
  return result;
}

export async function buildPageData(details: PokemonDetails, ctx: BuildContext): Promise<PageData> {
  const species = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-species/${details.id}`);
  const spanishLabels = ctx.lang === 'es' ? await spanishVarietyLabels(details.id) : null;
  const defaultFirst = [...details.varieties].sort((a, b) => Number(b.is_default) - Number(a.is_default));
  const learnsetTable: Record<string, LearnRow[]>[] = [];
  const learnsetKeys: string[] = [];
  const strings: string[] = [];
  const stringIndex = (s: string): number => {
    let i = strings.indexOf(s);
    if (i === -1) i = strings.push(s) - 1;
    return i;
  };
  const encounterSets: EncounterRow[][] = [];
  const encounterKeys: string[] = [];
  const compactEncounters = (byVersion: Record<string, Encounter[]>): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [version, rows] of Object.entries(byVersion)) {
      const compact = rows.map(r => [stringIndex(r.area), stringIndex(r.method), r.min, r.max, r.chance, ...r.conditions.map(stringIndex)]);
      const key = JSON.stringify(compact);
      let set = encounterKeys.indexOf(key);
      if (set === -1) {
        encounterKeys.push(key);
        set = encounterSets.push(compact) - 1;
      }
      result[version] = set;
    }
    return result;
  };

  const varieties: Variety[] = await Promise.all(defaultFirst.map(async (v): Promise<Variety> => {
    const pokemon = await cachedFetchJson(v.is_default ? `https://pokeapi.co/api/v2/pokemon/${details.id}` : v.url);
    const form = v.is_default ? null : await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-form/${v.name}/`).catch(() => null);
    const sprites = pokemon.sprites || {};
    const officialArt = sprites.other?.['official-artwork'] || {};
    const showdown = sprites.other?.showdown || {};
    const bw = sprites.versions?.['generation-v']?.['black-white']?.animated || {};
    const suffix = v.name.startsWith(details.codename + '-') ? v.name.slice(details.codename.length + 1) : v.name.split('-').slice(1).join('-');
    const label = v.is_default
      ? details.name
      : spanishLabels?.get(v.name) || en(form?.names)?.name || `${details.name} (${titleCase(suffix)})`;

    const sets = learnsets(ctx, pokemon);
    const key = JSON.stringify(sets);
    let learnset = learnsetKeys.indexOf(key);
    if (learnset === -1 && Object.keys(sets).length) {
      learnsetKeys.push(key);
      learnsetTable.push(sets);
      learnset = learnsetTable.length - 1;
    }

    const games = new Set(Object.keys(sets));
    if (v.is_default) {
      for (const [game, members] of ctx.dexMembers) if (members.has(details.codename)) games.add(game);
    }

    return {
      name: v.name,
      label,
      title: label,
      hash: v.is_default ? '' : suffix,
      isDefault: v.is_default,
      battleOnly: !!form?.is_battle_only,
      types: pokemon.types.map((t: any) => t.type.name),
      pastTypes: (pokemon.past_types || []).map((p: any) => [genNumber(p.generation.name), p.types.map((t: any) => t.type.name)]),
      stats: STAT_KEYS.map(k => pokemon.stats.find((s: any) => s.stat.name === k)?.base_stat ?? 0),
      evs: STAT_KEYS.map(k => pokemon.stats.find((s: any) => s.stat.name === k)?.effort ?? 0),
      baseExp: pokemon.base_experience ?? null,
      height: pokemon.height,
      weight: pokemon.weight,
      abilities: await loadAbilities(pokemon, ctx.lang),
      art: officialArt.front_default || sprites.front_default || details.officialArtworkUrl,
      shiny: officialArt.front_shiny || sprites.front_shiny || '',
      anim: showdown.front_default || bw.front_default || '',
      animShiny: showdown.front_shiny || bw.front_shiny || '',
      cry: pokemon.cries?.latest || pokemon.cries?.legacy || '',
      games: ctx.catalog.games.filter(g => games.has(g.key)).map(g => g.key),
      learnset,
      encounters: compactEncounters(await loadEncounters(ctx, v.is_default ? `https://pokeapi.co/api/v2/pokemon/${details.id}` : v.url)),
      entries: v.is_default ? null : groupEntries(ctx, form ? localEntries(form.flavor_text_entries, ctx.lang) : []),
    };
  }));

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    dex: details.id,
    name: details.name,
    codename: details.codename,
    defaultGame: '',
    varieties,
    learnsets: learnsetTable,
    strings,
    encounterSets,
    entries: groupEntries(ctx, details.pokedexDescriptions),
    profile: {
      genderRate: details.genderRate,
      genderDiff: !!species.has_gender_differences,
      eggGroups: await Promise.all((species.egg_groups || []).map((g: any) => resourceName(g.url, ctx.lang, g.name))),
      hatchCounter: species.hatch_counter ?? 0,
      captureRate: details.captureRate,
      baseHappiness: details.baseHappiness,
      growthRate: details.growthRate,
      habitat: species.habitat ? capitalize(await resourceName(species.habitat.url, ctx.lang, species.habitat.name)) : '',
      generation: genNumber(details.generation),
    },
  };
}
