import {
  DAMAGE_CLASSES, STAT_KEYS, STAT_LABELS, decodeEncounters,
  type Ability, type EntryGroup, type Game, type Meta, type MoveTable, type PageData, type Profile, type Variety,
} from './model';
import { escapeHtml, formatNumber, percent, statColor, titleCase, typeTags } from './format';
import { categoryIcon, icon } from './icons';
import { defensiveMatchups, eraLabel, offensiveCoverage, typesFor } from './type-chart';

export const ABILITY_MATCHUPS: Record<string, string> = {
  levitate: 'immune to Ground',
  'earth-eater': 'immune to Ground',
  'flash-fire': 'immune to Fire',
  'well-baked-body': 'immune to Fire',
  'water-absorb': 'immune to Water',
  'storm-drain': 'immune to Water',
  'dry-skin': 'immune to Water, takes 1.25× from Fire',
  'volt-absorb': 'immune to Electric',
  'lightning-rod': 'immune to Electric',
  'motor-drive': 'immune to Electric',
  'sap-sipper': 'immune to Grass',
  'thick-fat': 'takes ½ damage from Fire and Ice',
  heatproof: 'takes ½ damage from Fire',
  'water-bubble': 'takes ½ damage from Fire',
  'purifying-salt': 'takes ½ damage from Ghost',
  fluffy: 'takes 2× from Fire, ½ from contact moves',
  'wonder-guard': 'only super-effective moves can hit it',
  filter: 'takes ¾ damage from super-effective moves',
  'solid-rock': 'takes ¾ damage from super-effective moves',
  'prism-armor': 'takes ¾ damage from super-effective moves',
  'tera-shell': 'every hit is not very effective while at full HP',
};

export const gameByKey = (meta: Meta, key: string): Game | undefined => meta.games.find(g => g.key === key);

// The newest main-series game with learnsets and Pokédex entries wins, so a
// Pokémon in Scarlet & Violet defaults to it rather than to a newer spin-off.
export function bestGame(meta: Meta, variety: Variety): Game {
  const available = meta.games.filter(g => variety.games.includes(g.key));
  return available.find(g => g.hasMoves && g.hasEntries) || available.find(g => g.hasMoves) || available[0] || meta.games[0];
}

export function effectiveGame(meta: Meta, variety: Variety, preferred: string): { game: Game; unavailable: Game | null } {
  const wanted = preferred ? gameByKey(meta, preferred) : undefined;
  if (wanted && variety.games.includes(wanted.key)) return { game: wanted, unavailable: null };
  return { game: bestGame(meta, variety), unavailable: wanted || null };
}

const chip = (type: string, mult: string, extraClass: string = '') =>
  `<span class="tag mu-chip ${type}${extraClass}">${type}<b class="mu-x">${mult}</b></span>`;

const group = (key: string, label: string, chips: string) =>
  `<div class="mu-group mu-${key}"><div class="mu-label">${label}</div><div class="mu-chips">${chips || '<span class="mu-none">None</span>'}</div></div>`;

export function renderDefense(meta: Meta, gen: number, types: string[]): string {
  const m = defensiveMatchups(meta, gen, types);
  const weak = m.x4.map(t => chip(t, '4×', ' x4')).join('') + m.x2.map(t => chip(t, '2×')).join('');
  const resist = m.x025.map(t => chip(t, '¼×')).join('') + m.x05.map(t => chip(t, '½×')).join('');
  const immune = m.x0.map(t => chip(t, '0×')).join('');
  return group('weak', 'Weak to', weak) + group('resist', 'Resists', resist) + (immune ? group('immune', 'Immune to', immune) : '');
}

export function renderOffense(meta: Meta, gen: number, types: string[]): string {
  const c = offensiveCoverage(meta, gen, types);
  const tags = (list: string[]) => list.length ? typeTags(list) : '<span class="mu-none">None</span>';
  return `<div class="offense-row"><span class="offense-label">Super effective against</span><div class="offense-tags">${tags(c.superEffective)}</div></div>`
    + `<div class="offense-row"><span class="offense-label">Walled by</span><div class="offense-tags">${tags(c.walledBy)}</div></div>`;
}

export function renderEraNote(meta: Meta, game: Game, variety: Variety): string {
  const era = eraLabel(meta, game.gen);
  const oldTypes = typesFor(variety, game.gen);
  const typeChanged = oldTypes.join() !== variety.types.join();
  if (!era && !typeChanged) return '';
  const parts: string[] = [];
  if (era) parts.push(`Using the ${era} type chart for ${escapeHtml(game.label)}.`);
  if (typeChanged) parts.push(`In this game it is ${oldTypes.map(titleCase).join('/')} type.`);
  return `<p class="era-note">${icon('info')}<span>${parts.join(' ')}</span></p>`;
}

export function renderAbilityNotes(abilities: Ability[]): string {
  return abilities
    .filter(a => ABILITY_MATCHUPS[a.name])
    .map(a => `<li><span><b>${escapeHtml(a.label)}</b>${a.hidden ? ' <span class="note-hidden">(hidden ability)</span>' : ''}: ${ABILITY_MATCHUPS[a.name]}.</span></li>`)
    .join('');
}

export function renderStatsRows(variety: Variety): string {
  return STAT_KEYS.map((key, i) => {
    const value = variety.stats[i];
    const width = Math.min(100, Math.round((value / 255) * 100));
    return `<tr><th scope="row">${STAT_LABELS[key]}</th><td class="stat-num">${value}</td><td class="stat-bar-cell"><div class="stat-bar"><div class="stat-value" style="width: ${width}%; background-color: ${statColor(value)};"></div></div></td></tr>`;
  }).join('');
}

export const statTotal = (variety: Variety): number => variety.stats.reduce((a, b) => a + b, 0);

export function evYield(variety: Variety): string {
  const parts = STAT_KEYS.map((key, i) => variety.evs[i] ? `${variety.evs[i]} ${STAT_LABELS[key]}` : '').filter(Boolean);
  return parts.join(', ') || '—';
}

export function renderAbilities(variety: Variety): string {
  return variety.abilities.map(a => `
          <div class="ability">
            <div class="ability-name">${escapeHtml(a.label)}${a.hidden ? '<span class="hidden-ability">Hidden</span>' : ''}</div>
            <p class="ability-desc">${escapeHtml(a.text)}</p>
          </div>`).join('');
}

export interface ResolvedMove {
  name: string;
  type: string;
  damageClass: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

// Before Gen 4 a damaging move's category came from its type.
const SPECIAL_TYPES_BEFORE_GEN4 = ['fire', 'water', 'grass', 'electric', 'ice', 'psychic', 'dragon', 'dark'];

export function moveForGame(meta: Meta, table: MoveTable, index: number, game: Game): ResolvedMove {
  const [name, type, damageClass, power, accuracy, pp, past] = table.moves[index];
  const later = past.filter(p => p[0] > game.order);
  const pick = <T>(field: number, current: T): T => {
    const found = later.find(p => p[field] !== null);
    return found ? (found[field] as T) : current;
  };
  const typeName = meta.types[pick(4, type)];
  let cls = DAMAGE_CLASSES[damageClass];
  if (game.gen < 4 && cls !== 'status') cls = SPECIAL_TYPES_BEFORE_GEN4.includes(typeName) ? 'special' : 'physical';
  return { name, type: typeName, damageClass: cls, power: pick(1, power), accuracy: pick(2, accuracy), pp: pick(3, pp) };
}

const MOVE_TABS: [key: string, label: string][] = [
  ['level-up', 'Level up'],
  ['machine', 'TM'],
  ['egg', 'Egg'],
  ['tutor', 'Tutor'],
  ['other', 'Other'],
];

const MACHINE_ORDER = ['TM', 'TR', 'HM'];

const dash = (n: number | null) => (n === null || n === undefined ? '—' : String(n));

export function renderMoves(meta: Meta, table: MoveTable, page: PageData, variety: Variety, game: Game): string {
  if (!game.hasMoves) return `<p class="empty-note">PokeAPI has no move data for ${escapeHtml(game.label)} yet.</p>`;
  const rows = variety.learnset >= 0 ? page.learnsets[variety.learnset][game.key] || [] : [];
  if (rows.length === 0) return `<p class="empty-note">No moves listed for ${escapeHtml(variety.label)} in ${escapeHtml(game.label)}.</p>`;

  const byTab: Record<string, { label: string; sort: string | number; method: string; move: ResolvedMove }[]> = {};
  for (const [moveIndex, methodIndex, level] of rows) {
    const method = meta.methods[methodIndex];
    const tab = MOVE_TABS.some(([k]) => k === method) ? method : 'other';
    const move = moveForGame(meta, table, moveIndex, game);
    let label = '';
    let sort: string | number = move.name;
    if (tab === 'level-up') {
      label = level === 0 ? 'Evo' : String(level);
      sort = level * 1000;
    } else if (tab === 'machine') {
      label = table.machines[game.key]?.[moveIndex] || 'TM';
      sort = (MACHINE_ORDER.indexOf(label.slice(0, 2)) + 1) * 10000 + (parseInt(label.slice(2), 10) || 0);
    } else if (tab === 'other') {
      label = titleCase(method);
    }
    (byTab[tab] ||= []).push({ label, sort, method, move });
  }

  const tabs = MOVE_TABS.filter(([k]) => byTab[k]?.length);
  const head = (key: string) => key === 'level-up' ? 'Lv.' : key === 'machine' ? 'TM' : key === 'other' ? 'How' : '';
  const panels = tabs.map(([key], i) => {
    const list = byTab[key].sort((a, b) => typeof a.sort === 'number' && typeof b.sort === 'number'
      ? a.sort - b.sort || a.move.name.localeCompare(b.move.name)
      : String(a.sort).localeCompare(String(b.sort), 'en', { numeric: true }) || a.move.name.localeCompare(b.move.name));
    const showLabel = head(key) !== '';
    const body = list.map(r => `<tr>${showLabel ? `<td class="mv-lv">${escapeHtml(r.label)}</td>` : ''}<td class="mv-name">${escapeHtml(r.move.name)}</td><td class="mv-type">${typeTags([r.move.type])}</td><td class="mv-cat">${categoryIcon(r.move.damageClass)}</td><td class="mv-num">${dash(r.move.power)}</td><td class="mv-num">${r.move.accuracy === null ? '—' : r.move.accuracy}</td><td class="mv-num mv-pp">${dash(r.move.pp)}</td></tr>`).join('');
    return `<div class="moves-panel" data-tab="${key}"${i === 0 ? '' : ' hidden'}><table class="moves-table"><thead><tr>${showLabel ? `<th class="mv-lv">${head(key)}</th>` : ''}<th class="mv-name">Move</th><th class="mv-type">Type</th><th class="mv-cat">Cat.</th><th class="mv-num">Pwr</th><th class="mv-num">Acc</th><th class="mv-num mv-pp">PP</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }).join('');
  const tabButtons = tabs.map(([key, label], i) =>
    `<button type="button" role="tab" class="moves-tab${i === 0 ? ' active' : ''}" data-tab="${key}" aria-selected="${i === 0}">${label}<span class="count">${byTab[key].length}</span></button>`).join('');
  return `<div class="moves-tabs" role="tablist" aria-label="How it learns moves">${tabButtons}</div>${panels}`;
}

const METHOD_LABELS: Record<string, string> = {
  walk: 'Walking',
  surf: 'Surfing',
  'old-rod': 'Old Rod',
  'good-rod': 'Good Rod',
  'super-rod': 'Super Rod',
  'rock-smash': 'Rock Smash',
  'only-one': 'Static encounter',
  'gift-egg': 'Gift egg',
  'grass-spots': 'Rustling grass',
  'cave-spots': 'Dust clouds',
  'bridge-spots': 'Bird shadows',
  'surf-spots': 'Rippling water',
  'super-rod-spots': 'Fishing spots',
  'sos-encounter': 'SOS battle',
  pokeflute: 'Poké Flute',
};

const conditionLabel = (c: string): string => {
  if (/-(no|off|none)$/.test(c)) return '';
  const [kind, ...rest] = c.split('-');
  if (kind === 'slot2') return `${titleCase(rest.join('-'))} in GBA slot`;
  if (kind === 'swarm') return 'Swarm';
  if (kind === 'radar') return 'Poké Radar';
  return titleCase(rest.join('-') || kind);
};

const VISIBLE_PLACES = 8;

// When a game has no encounters for it, point to the newest one that does.
function locationsElsewhere(meta: Meta, variety: Variety, game: Game): string {
  const other = meta.games.find(g => g.key !== game.key && g.versions.some(v => variety.encounters[v.key] !== undefined));
  return other ? `<p class="empty-hint">Latest game with locations: <button type="button" class="link-btn switch-game" data-game="${other.key}">${escapeHtml(other.label)}</button></p>` : '';
}

export function renderLocations(meta: Meta, page: PageData, variety: Variety, game: Game): string {
  if (!game.hasLocations) return `<p class="empty-note">PokeAPI has no location data for ${escapeHtml(game.label)} yet.</p>${locationsElsewhere(meta, variety, game)}`;
  const blocks = new Map<number, string[]>();
  for (const version of game.versions) {
    const set = variety.encounters[version.key];
    if (set === undefined) continue;
    if (!blocks.has(set)) blocks.set(set, []);
    blocks.get(set)!.push(version.label);
  }
  if (blocks.size === 0) {
    return `<p class="empty-note">Not found in the wild in ${escapeHtml(game.label)}. It may be obtained by evolving, breeding, trading or as a gift.</p>${locationsElsewhere(meta, variety, game)}`;
  }
  return Array.from(blocks, ([set, versions]) => {
    const places = new Map<string, string[]>();
    for (const e of decodeEncounters(page, set)) {
      const bits = [METHOD_LABELS[e.method] || titleCase(e.method), e.min === e.max ? `Lv. ${e.min}` : `Lv. ${e.min}–${e.max}`];
      if (e.chance) bits.push(`${e.chance}%`);
      bits.push(...e.conditions.map(conditionLabel).filter(Boolean));
      if (!places.has(e.area)) places.set(e.area, []);
      places.get(e.area)!.push(bits.join(' · '));
    }
    const items = Array.from(places, ([area, lines]) =>
      `<li class="loc"><span class="loc-area">${escapeHtml(area)}</span>${lines.map(l => `<span class="loc-detail">${escapeHtml(l)}</span>`).join('')}</li>`);
    const visible = items.slice(0, VISIBLE_PLACES).join('');
    const rest = items.slice(VISIBLE_PLACES);
    const more = rest.length ? `<details class="more"><summary>Show ${rest.length} more place${rest.length === 1 ? '' : 's'}</summary><ul class="loc-list">${rest.join('')}</ul></details>` : '';
    return `<div class="loc-version"><h3 class="loc-title">${escapeHtml(versions.join(' & '))}</h3><ul class="loc-list">${visible}</ul>${more}</div>`;
  }).join('');
}

const entryHtml = (meta: Meta, e: EntryGroup) =>
  `<blockquote class="entry"><p>${escapeHtml(e.text)}</p><footer>${e.versions.map(v => escapeHtml(meta.versionLabels[v] || titleCase(v))).join(' · ')}</footer></blockquote>`;

export function renderEntries(meta: Meta, entries: EntryGroup[], game: Game): string {
  if (entries.length === 0) return '';
  const versions = new Set(game.versions.map(v => v.key));
  const current = entries.filter(e => e.versions.some(v => versions.has(v)));
  const shown = current.length ? current : [entries[0]];
  const note = current.length ? '' : `<p class="empty-note">No Pokédex entry in ${escapeHtml(game.label)}; showing the latest one.</p>`;
  const all = entries.length > shown.length
    ? `<details class="more"><summary>All ${entries.length} Pokédex entries</summary><div class="entry-list">${entries.map(e => entryHtml(meta, e)).join('')}</div></details>`
    : '';
  return note + shown.map(e => entryHtml(meta, e)).join('') + all;
}

export function catchChance(rate: number, gen: number): number | null {
  if (gen <= 2) return null;
  const a = rate / 3;
  if (a >= 255) return 100;
  return (gen <= 4 ? a / 255 : Math.pow(a / 255, 0.75)) * 100;
}

const catchDifficulty = (rate: number): string =>
  rate >= 200 ? 'Very easy' : rate >= 120 ? 'Easy' : rate >= 60 ? 'Medium' : rate >= 25 ? 'Hard' : 'Very hard';

const imperialHeight = (dm: number): string => {
  let inches = Math.round(dm * 3.937);
  const feet = Math.floor(inches / 12);
  inches -= feet * 12;
  return `${feet}′${String(inches).padStart(2, '0')}″`;
};

export function heightText(variety: Variety): string {
  return `${(variety.height / 10).toFixed(1)} m <span class="unit-alt">${imperialHeight(variety.height)}</span>`;
}

export function weightText(variety: Variety): string {
  return `${(variety.weight / 10).toFixed(1)} kg <span class="unit-alt">${(variety.weight * 0.220462).toFixed(1)} lbs</span>`;
}

export function genderHtml(profile: Profile): string {
  if (profile.genderRate === -1) return '<span class="gender-icon genderless">Genderless</span>';
  const female = (profile.genderRate / 8) * 100;
  const male = 100 - female;
  return `<div class="gender-bar" role="img" aria-label="${percent(male)} male, ${percent(female)} female"><span class="male" style="width: ${male}%;"></span><span class="female" style="width: ${female}%;"></span></div>
              <div class="gender-legend"><span class="gender-icon male">♂ ${percent(male)}</span><span class="gender-icon female">♀ ${percent(female)}</span></div>`;
}

export function catchRateHtml(profile: Profile, game: Game): string {
  const chance = catchChance(profile.captureRate, game.gen);
  return `<span class="catch-value-text">${profile.captureRate} <span class="unit-alt">${catchDifficulty(profile.captureRate)}</span></span>`
    + (chance === null ? '' : `<span class="catch-chance">≈ ${percent(Math.min(100, chance))} with a Poké Ball at full HP</span>`);
}

export function eggCyclesText(profile: Profile): string {
  if (!profile.hatchCounter) return '—';
  return `${profile.hatchCounter} cycles <span class="unit-alt">~${formatNumber(Math.round((profile.hatchCounter * 256) / 100) * 100)} steps</span>`;
}
