import { cachedFetchJson } from "../fetch-cache";
import { regionOf } from "../regions";
import { titleCase } from "../shared/format";
import type { Lang } from "../shared/i18n";

// PokeAPI names every resource in several languages, but Spanish coverage is
// partial: what's missing (form names, encounter methods and conditions, most
// location names) is filled in here, falling back to English.

export const nameIn = (names: any[] | undefined, lang: Lang): string | undefined =>
  (names || []).find((n: any) => n.language?.name === lang)?.name;

export const localName = (names: any[] | undefined, lang: Lang): string | undefined =>
  nameIn(names, lang) || nameIn(names, 'en');

export async function resourceName(url: string | undefined, lang: Lang, slug: string): Promise<string> {
  if (!url) return titleCase(slug);
  try {
    return localName((await cachedFetchJson(url)).names, lang) || titleCase(slug);
  } catch (e) {
    return titleCase(slug);
  }
}

// Spanish form names: PokeAPI has them for many forms ("Mega-Charizard X",
// "Forma de Galar"), the rest are built from the English name's pattern.
const REGION_ADJECTIVES: Record<string, string> = { Alolan: 'Alola', Galarian: 'Galar', Hisuian: 'Hisui', Paldean: 'Paldea' };

const QUALIFIERS_ES: Record<string, string> = {
  'Combat Breed': 'Raza Combatiente',
  'Blaze Breed': 'Raza Ardiente',
  'Aqua Breed': 'Raza Acuática',
  Amped: 'Forma Aguda',
  'Low Key': 'Forma Grave',
  'Single Strike': 'Estilo Brusco',
  'Rapid Strike': 'Estilo Fluido',
  Origin: 'Forma Origen',
  Therian: 'Forma Tótem',
  Female: 'Hembra',
  'White-Striped': 'Forma Raya Blanca',
  'Hero Form': 'Forma Heroica',
  Curly: 'Forma Curvada',
  Droopy: 'Forma Lánguida',
  'Droopy Form': 'Forma Lánguida',
  Stretchy: 'Forma Recta',
  'Stretchy Form': 'Forma Recta',
  'Three-Segment Form': 'Forma Trinodular',
  'Roaming Form': 'Forma Andante',
  'Family of Three': 'Familia de Tres',
  'Blue Plumage': 'Plumaje Azul',
  'Yellow Plumage': 'Plumaje Amarillo',
  'White Plumage': 'Plumaje Blanco',
  'Limited Build': 'Forma Limitada',
  'Sprinting Build': 'Forma Carrera',
  'Swimming Build': 'Forma Nado',
  'Gliding Build': 'Forma Planeo',
  'Low-Power Mode': 'Modo Limitado',
  'Drive Mode': 'Modo Conducción',
  'Aquatic Mode': 'Modo Flotación',
  'Glide Mode': 'Modo Planeo',
  'Battle Bond': 'Fuerte Afecto',
  'Own Tempo': 'Ritmo Propio',
  Original: 'Color Vetusto',
  Disguised: 'Encubierta',
  Busted: 'Descubierta',
};

// Qualifiers that read as part of the name rather than in brackets.
const NAME_QUALIFIERS_ES: Record<string, string> = {
  Partner: 'compañero',
  'Rock Star': 'Roquera',
  Belle: 'Aristócrata',
  'Pop Star': 'Superstar',
  'Ph.D.': 'Erudita',
  Libre: 'Enmascarada',
  Cosplay: 'Coqueta',
};

const COLORS_ES: Record<string, string> = {
  Red: 'rojo', Orange: 'naranja', Yellow: 'amarillo', Green: 'verde', Blue: 'azul', Indigo: 'añil', Violet: 'violeta',
};

const REGION_NAMES_ES: Record<string, string> = { alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea' };

function withQualifier(base: string, qualifier: string): string {
  const q = qualifier.replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  if (!q) return base;
  if (NAME_QUALIFIERS_ES[q]) return `${base} ${NAME_QUALIFIERS_ES[q]}`;
  return `${base} (${QUALIFIERS_ES[q] || q})`;
}

function spanishFromEnglish(english: string, speciesEn: string, speciesEs: string, regionBase: string): string {
  const strip = (s: string) => s.replace(speciesEn, ' ').replace(/\s+/g, ' ').trim();
  let m = english.match(/^Mega (.*?)(?: ([XYZ]))?$/);
  if (m) return withQualifier(`Mega-${speciesEs}${m[2] ? ` ${m[2]}` : ''}`, strip(m[1]));
  m = english.match(/^Gigantamax (.*)$/);
  if (m) return withQualifier(`${speciesEs} Gigamax`, strip(m[1]));
  m = english.match(/^Totem (.*)$/);
  if (m) return `${spanishFromEnglish(m[1], speciesEn, speciesEs, regionBase)} dominante`;
  m = english.match(/^(Alolan|Galarian|Hisuian|Paldean) (.*)$/);
  if (m) return withQualifier(`${speciesEs} de ${REGION_ADJECTIVES[m[1]]}`, strip(m[2]));
  return withQualifier(regionBase, strip(english));
}

// Every variety's Spanish label for a species, with duplicates told apart
// (all six Minior meteor forms are "Forma Meteorito" in Spanish).
const spanishLabels = new Map<number, Promise<Map<string, string>>>();

export function spanishVarietyLabels(speciesId: number): Promise<Map<string, string>> {
  if (!spanishLabels.has(speciesId)) spanishLabels.set(speciesId, (async () => {
    const species = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}`);
    const speciesEs = localName(species.names, 'es') || titleCase(species.name);
    const speciesEn = nameIn(species.names, 'en') || titleCase(species.name);
    const labels = new Map<string, string>();
    const english = new Map<string, string>();
    for (const v of species.varieties || []) {
      const name: string = v.pokemon.name;
      if (v.is_default) {
        labels.set(name, speciesEs);
        continue;
      }
      const fd = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-form/${name}/`).catch(() => null);
      const region = regionOf(name);
      const regionBase = REGION_NAMES_ES[region] ? `${speciesEs} de ${REGION_NAMES_ES[region]}` : speciesEs;
      const formEs = nameIn(fd?.form_names, 'es');
      const englishName = nameIn(fd?.names, 'en') || nameIn(fd?.form_names, 'en') || titleCase(name.replace(`${species.name}-`, ''));
      english.set(name, englishName);
      let label: string;
      if (formEs && formEs.includes(speciesEs)) label = formEs;
      else if (formEs && /^Forma de /.test(formEs)) label = `${speciesEs} de ${formEs.slice(9)}`;
      else if (formEs) label = `${regionBase} (${formEs})`;
      else label = spanishFromEnglish(englishName, speciesEn, speciesEs, regionBase);
      labels.set(name, label);
    }
    const counts = new Map<string, number>();
    for (const label of labels.values()) counts.set(label, (counts.get(label) || 0) + 1);
    for (const [name, label] of labels) {
      if ((counts.get(label) || 0) < 2) continue;
      const color = COLORS_ES[(english.get(name) || '').split(' ')[0]];
      if (color) labels.set(name, label.endsWith(')') ? `${label.slice(0, -1)}, ${color})` : `${label} (${color})`);
    }
    return labels;
  })());
  return spanishLabels.get(speciesId)!;
}

// Encounter methods and conditions: English keeps the site's short labels;
// Spanish has its own, with PokeAPI's English description as a last resort.
const METHODS_EN: Record<string, string> = {
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

const METHODS_ES: Record<string, string> = {
  walk: 'Caminando',
  surf: 'Surfeando',
  'old-rod': 'Caña Vieja',
  'good-rod': 'Caña Buena',
  'super-rod': 'Supercaña',
  'rock-smash': 'Golpe Roca',
  headbutt: 'Golpe Cabeza',
  'headbutt-low': 'Golpe Cabeza (árbol poco frecuente)',
  'headbutt-normal': 'Golpe Cabeza (árbol normal)',
  'headbutt-high': 'Golpe Cabeza (árbol frecuente)',
  'dark-grass': 'Hierba espesa',
  'grass-spots': 'Hierba que se agita',
  'cave-spots': 'Nubes de polvo',
  'bridge-spots': 'Sombras en el puente',
  'super-rod-spots': 'Supercaña en aguas agitadas',
  'surf-spots': 'Surfeando en aguas agitadas',
  'bubbling-spots': 'Pescando en aguas burbujeantes',
  'yellow-flowers': 'Flores amarillas',
  'purple-flowers': 'Flores moradas',
  'red-flowers': 'Flores rojas',
  'rough-terrain': 'Terreno escarpado',
  gift: 'Regalo',
  'gift-egg': 'Huevo de regalo',
  static: 'Encuentro fijo',
  'only-one': 'Encuentro fijo',
  pokeflute: 'Poké Flauta',
  'squirt-bottle': 'Regadera',
  'wailmer-pail': 'Regadera Wailmer',
  seaweed: 'Buceando entre algas',
  'roaming-grass': 'Errante (hierba)',
  'roaming-water': 'Errante (agua)',
  'devon-scope': 'Detector Devon',
  'feebas-tile-fishing': 'Pescando en las casillas de Feebas',
  'island-scan': 'Escáner Isla',
  sos: 'Combate SOS',
  'sos-encounter': 'Combate SOS',
  'sos-from-bubbling-spot': 'Combate SOS en aguas burbujeantes',
  'berry-trees': 'Árbol de bayas',
  'npc-trade': 'Intercambio en el juego',
  overworld: 'En el mapa',
  'overworld-water': 'En el agua',
  'overworld-flying': 'En el cielo',
  'overworld-dirt': 'Bajo tierra',
  'overworld-special': 'Aparición rara en la hierba',
  'overworld-flying-special': 'Aparición rara en el cielo',
  'overworld-water-special': 'Aparición rara en el agua',
  wanderer: 'Aparición fija en el mapa',
  'wanderer-water': 'Aparición fija en el agua',
  'chase-water': 'Te persigue en el agua',
  horde: 'Horda',
  'hidden-grotto': 'Claro Oculto',
  'honey-tree': 'Árbol de miel',
  'max-raid': 'Incursión Dinamax',
  'dynamax-adventure': 'Aventura Dinamax',
  'trash-can-ambush': 'Emboscada desde una papelera',
  'rustling-bush-ambush': 'Emboscada desde un arbusto',
  'ceiling-ambush': 'Emboscada desde el techo',
  'ground-ambush': 'Emboscada desde el suelo',
  'sky-ambush': 'Emboscada desde el cielo',
  snag: 'Captor (Pokémon oscuro)',
  'snag-rematch': 'Captor (segundo intento)',
  pokespot: 'Pokepunto',
  'colosseum-bonus-disc-us': 'Disco extra de Colosseum',
  'colosseum-bonus-disc-jpn': 'Disco extra de Colosseum',
  'pokemon-channel-pal': 'Pokémon Channel',
  'pokemon-ranger': 'Pokémon Ranger',
};

export function encounterMethodLabel(method: string, lang: Lang): string {
  return (lang === 'es' ? METHODS_ES[method] : METHODS_EN[method]) || titleCase(method);
}

function englishConditionLabel(c: string): string {
  if (/-(no|off|none)$/.test(c)) return '';
  const [kind, ...rest] = c.split('-');
  if (kind === 'slot2') return `${titleCase(rest.join('-'))} in GBA slot`;
  if (kind === 'swarm') return 'Swarm';
  if (kind === 'radar') return 'Poké Radar';
  return titleCase(rest.join('-') || kind);
}

const CONDITION_WORDS_ES: Record<string, string> = {
  'time-morning': 'Mañana',
  'time-day': 'Día',
  'time-night': 'Noche',
  'weather-normal': 'Despejado',
  'weather-overcast': 'Nublado',
  'weather-raining': 'Lluvia',
  'weather-thunderstorm': 'Tormenta',
  'weather-intense-sun': 'Sol abrasador',
  'weather-snowing': 'Nieve',
  'weather-snowstorm': 'Ventisca',
  'weather-sandstorm': 'Tormenta de arena',
  'weather-fog': 'Niebla',
  'season-spring': 'Primavera',
  'season-summer': 'Verano',
  'season-autumn': 'Otoño',
  'season-winter': 'Invierno',
  'weekday-monday': 'Lunes',
  'weekday-tuesday': 'Martes',
  'weekday-wednesday': 'Miércoles',
  'weekday-thursday': 'Jueves',
  'weekday-friday': 'Viernes',
  'weekday-saturday': 'Sábado',
  'weekday-sunday': 'Domingo',
  'swarm-yes': 'Enjambre',
  'radar-on': 'Pokéradar',
  'radio-hoenn': 'Radio: sonido de Hoenn',
  'radio-sinnoh': 'Radio: sonido de Sinnoh',
  'max-den-rarity-common': 'Incursión común',
  'max-den-rarity-rare': 'Incursión rara',
  'max-den-rarity-special': 'Incursión especial',
  'story-progress-hall-of-fame': 'Tras entrar en el Hall de la Fama',
  'story-progress-before-hall-of-fame': 'Antes de entrar en el Hall de la Fama',
  'story-progress-national-dex': 'Con la Pokédex Nacional',
  'story-progress-before-national-dex': 'Antes de la Pokédex Nacional',
  'bug-catching-contest-yes': 'Concurso de Captura de Bichos',
  'headbutt-tree-common': 'Árbol común',
  'headbutt-tree-rare': 'Árbol raro',
  'headbutt-tree-secret': 'Árbol secreto',
  'first-party-pokemon-high-friendship': 'El primer Pokémon del equipo tiene mucha amistad',
  'save-data-from-lets-go-pikachu': 'Con datos de Let’s Go, Pikachu!',
  'save-data-from-lets-go-eevee': 'Con datos de Let’s Go, Eevee!',
  'backlot-mentioned': 'Tras mencionarlo Mr. Backlot',
  'backlot-not-mentioned': 'Sin que Mr. Backlot lo haya mencionado',
  'story-progress-beat-team-galactic-iron-island': 'Tras vencer al Equipo Galaxia en la Isla Hierro',
  'story-progress-beat-red': 'Tras vencer a Rojo',
  'story-progress-oak-eterna-city': 'Tras hablar con el Prof. Oak en Ciudad Vetusta',
  'story-progress-awakened-beasts': 'Tras despertar a las bestias legendarias de la Torre Quemada',
  'story-progress-beat-elite-four-round-two': 'Tras vencer al Alto Mando por segunda vez',
  'special-encounter-couldnt-capture-before': 'Si no se capturó en un encuentro anterior',
  'other-found-11-times-roaming': 'Tras 11 encuentros sin capturarlo',
  'other-received-kanto-starter': 'Tras recibir un inicial de Kanto',
  'other-complete-mt-battle': 'Al completar el Monte Batalla',
  'other-event-arceus-in-party': 'Con un Arceus de evento en el equipo',
  'other-level-100-pokemon-in-party': 'Con un Pokémon de nivel 100 en el equipo',
  'other-virtual-console': 'En la Consola Virtual',
  'trash-can-type-daily': 'Papelera que se mueve (a diario)',
  'trash-can-type-tuesday': 'Papelera que se mueve (martes)',
  'trash-can-type-thursday': 'Papelera que se mueve (jueves)',
};

const BERRY_COLORS_ES: Record<string, string> = {
  red: 'roja', blue: 'azul', yellow: 'amarilla', green: 'verde', pink: 'rosa', purple: 'morada',
};

// Long-tail conditions only have an English sentence; the usual shapes are
// rephrased, anything else stays in English.
function spanishFromEnglishCondition(english: string): string {
  let m = english.match(/^Have (.+?) in (?:the )?party$/);
  if (m) return `Con ${m[1].replace(/,? and /, ' y ').replace(/ or /, ' o ')} en el equipo`;
  m = english.match(/^Have (.+) in bag$/);
  if (m) return `Con ${m[1]} en la mochila`;
  m = english.match(/^(?:Defeat|Beat) (.+?)(?: for the first time)?$/);
  if (m) return `Tras vencer a ${m[1]}`;
  return english;
}

const SAFARI_AREAS_ES: Record<string, string> = { forest: 'bosque', water: 'agua', plains: 'llanura', peak: 'cima' };

let conditionNames: Promise<Map<string, string>> | null = null;

// English descriptions of every condition value, fetched once from the list so
// unknown names are never requested one by one.
function englishConditionNames(): Promise<Map<string, string>> {
  if (!conditionNames) conditionNames = (async () => {
    const list = await cachedFetchJson('https://pokeapi.co/api/v2/encounter-condition-value/?limit=1000');
    const names = new Map<string, string>();
    for (const r of list.results) {
      const data = await cachedFetchJson(r.url).catch(() => null);
      const name = nameIn(data?.names, 'en');
      if (name) names.set(r.name, name);
    }
    return names;
  })();
  return conditionNames;
}

let itemSlugs: Promise<Set<string>> | null = null;

function knownItems(): Promise<Set<string>> {
  if (!itemSlugs) itemSlugs = cachedFetchJson('https://pokeapi.co/api/v2/item/?limit=5000')
    .then((list: any) => new Set<string>(list.results.map((r: any) => r.name)));
  return itemSlugs;
}

export async function encounterConditionLabel(c: string, lang: Lang, versionLabel: (v: string) => string): Promise<string> {
  if (lang === 'en') return englishConditionLabel(c);
  if (/-(no|off|none|inactive)$/.test(c)) return '';
  if (CONDITION_WORDS_ES[c]) return CONDITION_WORDS_ES[c];
  let m = c.match(/^slot2-(.+)$/);
  if (m) return `${versionLabel(m[1])} en la ranura de GBA`;
  m = c.match(/^max-den-rating-(\d)-star$/);
  if (m) return `Incursión de ${m[1]}★`;
  m = c.match(/^time-minute-(\d+)-to-(\d+)$/);
  if (m) return `Minutos ${m[1]}–${m[2]}`;
  m = c.match(/^time-(\d\d)-(\d\d)-to-(\d\d)-(\d\d)$/);
  if (m) return `${m[1]}:${m[2]}–${m[3]}:${m[4]}`;
  m = c.match(/^honey-tree-group-(\w)$/);
  if (m) return `Árbol de miel, grupo ${m[1].toUpperCase()}`;
  m = c.match(/^great-marsh-daily-slot-(\d+)-of-32$/);
  if (m) return `Gran Pantano: ${m[1]} de 32 al día`;
  m = c.match(/^friend-safari-slot-(\d)$/);
  if (m) return `Safari Amistad, hueco ${m[1]}`;
  m = c.match(/^johto-safari-blocks-(\w+)-min-(\d+)$/);
  if (m) return `Zona Safari: ${m[2]}+ objetos de ${SAFARI_AREAS_ES[m[1]] || m[1]}`;
  m = c.match(/^coins-(\d+)$/);
  if (m) return `${m[1]} fichas`;
  m = c.match(/^trade-(.+)$/);
  if (m) return `A cambio de ${titleCase(m[1])}`;
  m = c.match(/^starter-(.+)$/);
  if (m) return `Inicial: ${titleCase(m[1])}`;
  m = c.match(/^alolan-diglett-found-(\d+)$/);
  if (m) return `${m[1]} Diglett de Alola encontrados`;
  m = c.match(/^berry-tree-type-(\w+)$/);
  if (m) return `Árbol de bayas (${BERRY_COLORS_ES[m[1]] || m[1]})`;
  m = c.match(/^item-(.+)$/);
  if (m && (await knownItems()).has(m[1])) {
    return `Con ${await resourceName(`https://pokeapi.co/api/v2/item/${m[1]}/`, 'es', m[1])} en la mochila`;
  }
  const english = (await englishConditionNames()).get(c);
  return english ? spanishFromEnglishCondition(english) : englishConditionLabel(c);
}

// The part in brackets after an area name ("Max Den A", "south, towards
// Viridian City", "Electric" in the Friend Safari). Unmatched text stays as is.
const DIRECTIONS_ES: Record<string, string> = {
  north: 'norte', south: 'sur', east: 'este', west: 'oeste',
  northwest: 'noroeste', northeast: 'noreste', southwest: 'suroeste', southeast: 'sureste',
};

const SIDES_ES: Record<string, string> = { top: 'arriba', left: 'izquierda', right: 'derecha' };

const direction = (word: string): string => DIRECTIONS_ES[word.toLowerCase()] || word;

const AREA_PHRASES_ES: [RegExp, (...m: string[]) => string][] = [
  [/^Max Den (\w+)$/, (_, den) => `Guarida ${den}`],
  [/^Main Area$/i, () => 'zona principal'],
  [/^Main$/i, () => 'principal'],
  [/^All Areas$/i, () => 'todas las zonas'],
  [/^unknown area (\d+)$/i, (_, n) => `zona ${n}`],
  [/^Area (\d+)$/, (_, n) => `zona ${n}`],
  [/^Area (\d+), (\w+)$/, (_, n, dir) => `zona ${n}, ${direction(dir)}`],
  [/^(north|south|east|west|northwest|northeast|southwest|southeast)$/i, (_, dir) => direction(dir)],
  [/^(north|south|east|west), towards (.+)$/i, (_, dir, place) => `${direction(dir)}, hacia ${place}`],
  [/^(B?\d+F) (top|left|right)$/, (_, floor, side) => `${floor} ${SIDES_ES[side]}`],
  [/^inside$/i, () => 'interior'],
  [/^inside (B?\d+F)$/, (_, floor) => `interior ${floor}`],
  [/^outside$/i, () => 'exterior'],
  [/^entrance$/i, () => 'entrada'],
  [/^(.+) entrance$/, (_, place) => `entrada de ${place}`],
  [/^Elite Four Defeated$/, () => 'tras vencer al Alto Mando'],
  [/^(\w+) Island Reached$/, (_, island) => `tras llegar a la isla ${island}`],
  [/^before Galactic intervention$/, () => 'antes del Equipo Galaxia'],
  [/^after Galactic intervention$/, () => 'después del Equipo Galaxia'],
  [/^Hidden Grotto – (.+)$/, (_, rest) => `Claro Oculto, ${rest}`],
  [/^Hidden Grotto$/, () => 'Claro Oculto'],
  [/^Prize Corner$/, () => 'tienda de premios'],
];

let typeNamesEs: Promise<Map<string, string>> | null = null;

function spanishTypeNames(): Promise<Map<string, string>> {
  if (!typeNamesEs) typeNamesEs = (async () => {
    const list = await cachedFetchJson('https://pokeapi.co/api/v2/type/?limit=1000');
    const names = new Map<string, string>();
    for (const r of list.results) {
      const data = await cachedFetchJson(r.url);
      names.set(nameIn(data.names, 'en') || r.name, nameIn(data.names, 'es') || r.name);
    }
    return names;
  })();
  return typeNamesEs;
}

export async function areaQualifier(text: string, lang: Lang): Promise<string> {
  if (lang === 'en') return text;
  const type = (await spanishTypeNames()).get(text);
  if (type) return type;
  for (const [pattern, phrase] of AREA_PHRASES_ES) {
    const m = text.match(pattern);
    if (m) return phrase(...m);
  }
  return text;
}

// Location names: PokeAPI has Spanish for about a third of them; routes and a
// few common places are translated by pattern, the rest stay in English.
const PLACES_ES: Record<string, string> = {
  'Victory Road': 'Calle Victoria',
  'Safari Zone': 'Zona Safari',
  'Pokémon League': 'Liga Pokémon',
  'Pokémon Mansion': 'Mansión Pokémon',
  'Pokémon Tower': 'Torre Pokémon',
  'Great Marsh': 'Gran Pantano',
  'Friend Safari': 'Safari Amistad',
  'Johto Safari Zone': 'Zona Safari de Johto',
};

export function locationLabel(location: any, lang: Lang): string {
  const english = nameIn(location.names, 'en') || titleCase(location.name);
  if (lang === 'en') return english;
  const spanish = nameIn(location.names, 'es');
  if (spanish) return spanish;
  const route = english.match(/^(?:Sea )?Route (\d+)$/);
  if (route) return `Ruta ${route[1]}`;
  const roaming = english.match(/^Roaming (?:the )?(.+)$/);
  if (roaming) return `Errante por ${roaming[1]}`;
  return PLACES_ES[english] || english;
}
