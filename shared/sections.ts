import {
  DAMAGE_CLASSES, STAT_KEYS, decodeEncounters,
  type Ability, type EntryGroup, type Game, type Meta, type MoveTable, type PageData, type Profile, type Variety,
} from './model';
import { escapeHtml, statColor, titleCase, typeTags } from './format';
import { categoryIcon, icon } from './icons';
import {
  compareText, decimal, getLang, integer, joinNames, learnMethodLabel, machineLabel, percent, plural, statLabel, t,
  typeLabel, typeName, type Lang,
} from './i18n';
import { defensiveMatchups, eraLabel, offensiveCoverage, typesFor } from './type-chart';

export const ABILITY_MATCHUPS: Record<Lang, Record<string, string>> = {
  en: {
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
  },
  es: {
    levitate: 'inmune a Tierra',
    'earth-eater': 'inmune a Tierra',
    'flash-fire': 'inmune a Fuego',
    'well-baked-body': 'inmune a Fuego',
    'water-absorb': 'inmune a Agua',
    'storm-drain': 'inmune a Agua',
    'dry-skin': 'inmune a Agua, recibe 1,25× de Fuego',
    'volt-absorb': 'inmune a Eléctrico',
    'lightning-rod': 'inmune a Eléctrico',
    'motor-drive': 'inmune a Eléctrico',
    'sap-sipper': 'inmune a Planta',
    'thick-fat': 'recibe la mitad de daño de Fuego y Hielo',
    heatproof: 'recibe la mitad de daño de Fuego',
    'water-bubble': 'recibe la mitad de daño de Fuego',
    'purifying-salt': 'recibe la mitad de daño de Fantasma',
    fluffy: 'recibe el doble de Fuego y la mitad de los movimientos de contacto',
    'wonder-guard': 'solo le afectan los movimientos superefectivos',
    filter: 'recibe ¾ del daño de los movimientos superefectivos',
    'solid-rock': 'recibe ¾ del daño de los movimientos superefectivos',
    'prism-armor': 'recibe ¾ del daño de los movimientos superefectivos',
    'tera-shell': 'con los PS al máximo, todos los ataques le son poco eficaces',
  },
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

const none = () => `<span class="mu-none">${t('mu.none')}</span>`;

const chip = (type: string, mult: string, extraClass: string = '') =>
  `<span class="tag mu-chip ${type}${extraClass}">${typeLabel(type)}<b class="mu-x">${mult}</b></span>`;

const group = (key: string, label: string, chips: string) =>
  `<div class="mu-group mu-${key}"><div class="mu-label">${label}</div><div class="mu-chips">${chips || none()}</div></div>`;

export function renderDefense(meta: Meta, gen: number, types: string[]): string {
  const m = defensiveMatchups(meta, gen, types);
  const weak = m.x4.map(t => chip(t, '4×', ' x4')).join('') + m.x2.map(t => chip(t, '2×')).join('');
  const resist = m.x025.map(t => chip(t, '¼×')).join('') + m.x05.map(t => chip(t, '½×')).join('');
  const immune = m.x0.map(t => chip(t, '0×')).join('');
  return group('weak', t('mu.weak'), weak) + group('resist', t('mu.resist'), resist) + (immune ? group('immune', t('mu.immune'), immune) : '');
}

export function renderOffense(meta: Meta, gen: number, types: string[]): string {
  const c = offensiveCoverage(meta, gen, types);
  const tags = (list: string[]) => list.length ? typeTags(list) : none();
  return `<div class="offense-row"><span class="offense-label">${t('offense.super')}</span><div class="offense-tags">${tags(c.superEffective)}</div></div>`
    + `<div class="offense-row"><span class="offense-label">${t('offense.walled')}</span><div class="offense-tags">${tags(c.walledBy)}</div></div>`;
}

export function renderEraNote(meta: Meta, game: Game, variety: Variety): string {
  const era = eraLabel(meta, game.gen);
  const oldTypes = typesFor(variety, game.gen);
  const typeChanged = oldTypes.join() !== variety.types.join();
  if (!era && !typeChanged) return '';
  const parts: string[] = [];
  if (era) parts.push(t('era.chart', { era, game: escapeHtml(game.label) }));
  if (typeChanged) parts.push(t('era.types', { types: oldTypes.map(typeName).join('/') }));
  return `<p class="era-note">${icon('info')}<span>${parts.join(' ')}</span></p>`;
}

export function renderAbilityNotes(abilities: Ability[]): string {
  const notes = ABILITY_MATCHUPS[getLang()];
  return abilities
    .filter(a => notes[a.name])
    .map(a => `<li><span><b>${escapeHtml(a.label)}</b>${a.hidden ? ` <span class="note-hidden">${t('note.hidden')}</span>` : ''}: ${notes[a.name]}.</span></li>`)
    .join('');
}

export function renderStatsRows(variety: Variety): string {
  return STAT_KEYS.map((key, i) => {
    const value = variety.stats[i];
    const width = Math.min(100, Math.round((value / 255) * 100));
    return `<tr><th scope="row">${statLabel(key)}</th><td class="stat-num">${value}</td><td class="stat-bar-cell"><div class="stat-bar"><div class="stat-value" style="width: ${width}%; background-color: ${statColor(value)};"></div></div></td></tr>`;
  }).join('');
}

export const statTotal = (variety: Variety): number => variety.stats.reduce((a, b) => a + b, 0);

export function evYield(variety: Variety): string {
  const parts = STAT_KEYS.map((key, i) => variety.evs[i] ? `${variety.evs[i]} ${statLabel(key)}` : '').filter(Boolean);
  return parts.join(', ') || '—';
}

export function renderAbilities(variety: Variety): string {
  return variety.abilities.map(a => `
          <div class="ability">
            <div class="ability-name">${escapeHtml(a.label)}${a.hidden ? `<span class="hidden-ability">${t('abilities.hidden')}</span>` : ''}</div>
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

const MOVE_TABS = ['level-up', 'machine', 'egg', 'tutor', 'other'] as const;

const MACHINE_ORDER = ['TM', 'TR', 'HM'];

const dash = (n: number | null) => (n === null || n === undefined ? '—' : String(n));

export function renderMoves(meta: Meta, table: MoveTable, page: PageData, variety: Variety, game: Game): string {
  if (!game.hasMoves) return `<p class="empty-note">${t('moves.noData', { game: escapeHtml(game.label) })}</p>`;
  const rows = variety.learnset >= 0 ? page.learnsets[variety.learnset][game.key] || [] : [];
  if (rows.length === 0) return `<p class="empty-note">${t('moves.none', { name: escapeHtml(variety.label), game: escapeHtml(game.label) })}</p>`;

  const byTab: Record<string, { label: string; sort: string | number; method: string; move: ResolvedMove }[]> = {};
  for (const [moveIndex, methodIndex, level] of rows) {
    const method = meta.methods[methodIndex];
    const tab = (MOVE_TABS as readonly string[]).includes(method) ? method : 'other';
    const move = moveForGame(meta, table, moveIndex, game);
    let label = '';
    let sort: string | number = move.name;
    if (tab === 'level-up') {
      label = level === 0 ? t('moves.evo') : String(level);
      sort = level * 1000;
    } else if (tab === 'machine') {
      const machine = table.machines[game.key]?.[moveIndex] || 'TM';
      label = machineLabel(machine);
      sort = (MACHINE_ORDER.indexOf(machine.slice(0, 2)) + 1) * 10000 + (parseInt(machine.slice(2), 10) || 0);
    } else if (tab === 'other') {
      label = learnMethodLabel(method);
    }
    (byTab[tab] ||= []).push({ label, sort, method, move });
  }

  const tabs = MOVE_TABS.filter(k => byTab[k]?.length);
  const head = (key: string) => key === 'level-up' ? t('moves.col.level') : key === 'machine' ? t('moves.tab.machine') : key === 'other' ? t('moves.col.how') : '';
  const panels = tabs.map((key, i) => {
    const list = byTab[key].sort((a, b) => typeof a.sort === 'number' && typeof b.sort === 'number'
      ? a.sort - b.sort || compareText(a.move.name, b.move.name)
      : compareText(String(a.sort), String(b.sort)) || compareText(a.move.name, b.move.name));
    const showLabel = head(key) !== '';
    const body = list.map(r => `<tr>${showLabel ? `<td class="mv-lv">${escapeHtml(r.label)}</td>` : ''}<td class="mv-name">${escapeHtml(r.move.name)}</td><td class="mv-type">${typeTags([r.move.type])}</td><td class="mv-cat">${categoryIcon(r.move.damageClass)}</td><td class="mv-num">${dash(r.move.power)}</td><td class="mv-num">${r.move.accuracy === null ? '—' : r.move.accuracy}</td><td class="mv-num mv-pp">${dash(r.move.pp)}</td></tr>`).join('');
    return `<div class="moves-panel" data-tab="${key}"${i === 0 ? '' : ' hidden'}><table class="moves-table"><thead><tr>${showLabel ? `<th class="mv-lv">${head(key)}</th>` : ''}<th class="mv-name">${t('moves.col.move')}</th><th class="mv-type">${t('moves.col.type')}</th><th class="mv-cat">${t('moves.col.cat')}</th><th class="mv-num">${t('moves.col.power')}</th><th class="mv-num">${t('moves.col.accuracy')}</th><th class="mv-num mv-pp">${t('moves.col.pp')}</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }).join('');
  const tabButtons = tabs.map((key, i) =>
    `<button type="button" role="tab" class="moves-tab${i === 0 ? ' active' : ''}" data-tab="${key}" aria-selected="${i === 0}">${t(`moves.tab.${key}`)}<span class="count">${byTab[key].length}</span></button>`).join('');
  return `<div class="moves-tabs" role="tablist" aria-label="${t('moves.tabs')}">${tabButtons}</div>${panels}`;
}

const VISIBLE_PLACES = 8;

// When a game has no encounters for it, point to the newest one that does.
function locationsElsewhere(meta: Meta, variety: Variety, game: Game): string {
  const other = meta.games.find(g => g.key !== game.key && g.versions.some(v => variety.encounters[v.key] !== undefined));
  return other ? `<p class="empty-hint">${t('locations.elsewhere')} <button type="button" class="link-btn switch-game" data-game="${other.key}">${escapeHtml(other.label)}</button></p>` : '';
}

export function renderLocations(meta: Meta, page: PageData, variety: Variety, game: Game): string {
  if (!game.hasLocations) return `<p class="empty-note">${t('locations.noData', { game: escapeHtml(game.label) })}</p>${locationsElsewhere(meta, variety, game)}`;
  const blocks = new Map<number, string[]>();
  for (const version of game.versions) {
    const set = variety.encounters[version.key];
    if (set === undefined) continue;
    if (!blocks.has(set)) blocks.set(set, []);
    blocks.get(set)!.push(version.label);
  }
  if (blocks.size === 0) {
    return `<p class="empty-note">${t('locations.none', { game: escapeHtml(game.label) })}</p>${locationsElsewhere(meta, variety, game)}`;
  }
  return Array.from(blocks, ([set, versions]) => {
    const places = new Map<string, string[]>();
    for (const e of decodeEncounters(page, set)) {
      const bits = [e.method, e.min === e.max ? t('locations.level', { n: e.min }) : t('locations.levels', { min: e.min, max: e.max })];
      if (e.chance) bits.push(percent(e.chance));
      bits.push(...e.conditions);
      if (!places.has(e.area)) places.set(e.area, []);
      places.get(e.area)!.push(bits.join(' · '));
    }
    const items = Array.from(places, ([area, lines]) =>
      `<li class="loc"><span class="loc-area">${escapeHtml(area)}</span>${lines.map(l => `<span class="loc-detail">${escapeHtml(l)}</span>`).join('')}</li>`);
    const visible = items.slice(0, VISIBLE_PLACES).join('');
    const rest = items.slice(VISIBLE_PLACES);
    const more = rest.length ? `<details class="more"><summary>${plural(rest.length, 'locations.more.one', 'locations.more.many')}</summary><ul class="loc-list">${rest.join('')}</ul></details>` : '';
    return `<div class="loc-version"><h3 class="loc-title">${escapeHtml(joinNames(versions))}</h3><ul class="loc-list">${visible}</ul>${more}</div>`;
  }).join('');
}

const entryHtml = (meta: Meta, e: EntryGroup) =>
  `<blockquote class="entry"${e.lang ? ` lang="${e.lang}"` : ''}><p>${escapeHtml(e.text)}</p><footer>${e.versions.map(v => escapeHtml(meta.versionLabels[v] || titleCase(v))).join(' · ')}</footer></blockquote>`;

export function renderEntries(meta: Meta, entries: EntryGroup[], game: Game): string {
  if (entries.length === 0) return '';
  const versions = new Set(game.versions.map(v => v.key));
  const current = entries.filter(e => e.versions.some(v => versions.has(v)));
  const shown = current.length ? current : [entries[0]];
  const note = current.length ? '' : `<p class="empty-note">${t('entries.missing', { game: escapeHtml(game.label) })}</p>`;
  const all = entries.length > shown.length
    ? `<details class="more"><summary>${t('entries.all', { n: entries.length })}</summary><div class="entry-list">${entries.map(e => entryHtml(meta, e)).join('')}</div></details>`
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
  t(rate >= 200 ? 'difficulty.veryEasy' : rate >= 120 ? 'difficulty.easy' : rate >= 60 ? 'difficulty.medium' : rate >= 25 ? 'difficulty.hard' : 'difficulty.veryHard');

const imperialHeight = (dm: number): string => {
  let inches = Math.round(dm * 3.937);
  const feet = Math.floor(inches / 12);
  inches -= feet * 12;
  return `${feet}′${String(inches).padStart(2, '0')}″`;
};

// Imperial units only on the English pages.
export function heightText(variety: Variety): string {
  const metric = `${decimal(variety.height / 10)} m`;
  return getLang() === 'en' ? `${metric} <span class="unit-alt">${imperialHeight(variety.height)}</span>` : metric;
}

export function weightText(variety: Variety): string {
  const metric = `${decimal(variety.weight / 10)} kg`;
  return getLang() === 'en' ? `${metric} <span class="unit-alt">${(variety.weight * 0.220462).toFixed(1)} lbs</span>` : metric;
}

export function genderHtml(profile: Profile): string {
  if (profile.genderRate === -1) return `<span class="gender-icon genderless">${t('profile.genderless')}</span>`;
  const female = (profile.genderRate / 8) * 100;
  const male = 100 - female;
  return `<div class="gender-bar" role="img" aria-label="${t('profile.genderSplit', { male: percent(male), female: percent(female) })}"><span class="male" style="width: ${male}%;"></span><span class="female" style="width: ${female}%;"></span></div>
              <div class="gender-legend"><span class="gender-icon male">♂ ${percent(male)}</span><span class="gender-icon female">♀ ${percent(female)}</span></div>`;
}

export function catchRateHtml(profile: Profile, game: Game): string {
  const chance = catchChance(profile.captureRate, game.gen);
  return `<span class="catch-value-text">${profile.captureRate} <span class="unit-alt">${catchDifficulty(profile.captureRate)}</span></span>`
    + (chance === null ? '' : `<span class="catch-chance">${t('profile.catchChance', { p: percent(Math.min(100, chance)) })}</span>`);
}

export function eggCyclesText(profile: Profile): string {
  if (!profile.hatchCounter) return '—';
  return `${t('profile.cycles', { n: profile.hatchCounter })} <span class="unit-alt">${t('profile.steps', { n: integer(Math.round((profile.hatchCounter * 256) / 100) * 100) })}</span>`;
}
