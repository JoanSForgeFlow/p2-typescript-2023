import { cachedFetchJson } from "./fetch-cache";
import { regionOf, ensureRegionsLoaded } from "./regions";
import type { Lang } from "./shared/i18n";
import { localName, resourceName, spanishVarietyLabels } from "./lib/localize";

interface DamageRelation {
  double_damage_from: { name: string }[];
  half_damage_from: { name: string }[];
  no_damage_from: { name: string }[];
}

interface Ability {
  name: string;
  description: string;
  is_hidden: boolean;
}

interface Stat {
  name: string;
  value: number;
}

interface DexDescription {
  version: string;
  flavor_text: string;
  lang?: string;
}

// The evolution chain is a raw tree annotated per region, so the page can render a
// different chain per viewed form (Galarian Slowpoke → Galarian Slowbro/Slowking).
// Each node carries its regional variants; each edge records the trigger per region.
interface EvoFormVariant {
  id: number;
  formName: string;
  name: string;
  imageUrl: string;
  region: string;
  // A persistent sibling this form transforms to/from (Minior meteor ↔ core):
  // still a selectable variety, but the chain draws a "↔" to its counterpart.
  transform?: { id: number; formName: string; name: string; imageUrl: string; trigger: string };
}

// A battle-only form (Mega, Gmax, ability transforms…): a transient change shown
// in the chain with "↔", not in the Forms list. baseForms lists the sibling form(s)
// it transforms from (e.g. Zygarde Complete from both Power Construct forms).
interface EvoBattleForm {
  id: number;
  formName: string;
  name: string;
  imageUrl: string;
  trigger: string;
  baseForms: string[];
}

interface EvoNode {
  speciesId: number;
  codename: string;
  defaultFormName: string;
  variants: EvoFormVariant[];   // non-battle-only varieties (default + regional + cosmetic)
  allFormNames: string[];       // every variety name (for the "+" badge)
  battleForms: EvoBattleForm[];
  children: EvoEdge[];
}

// Each evolution path keeps the raw base/evolved form names so the renderer can
// thread a form-specific chain by matching both ends (needed when a line
// diverges via the evolved form, e.g. Mime Jr. → Galarian Mr. Mime → Mr. Rime).
interface EvoPath {
  baseForm: string | null;
  evolvedForm: string | null;
  trigger: string;
  genericTrigger: string;   // value-less description, used when the evolved form collapses into a set of forms
  vg: number;   // version-group id; higher = more recent, to prefer the newest method
}

interface EvoEdge {
  node: EvoNode;
  paths: EvoPath[];
}

interface Variety {
  name: string;
  url: string;
  is_default: boolean;
}

export class PokemonDetails {
    constructor(
      public id: number,
      public name: string,
      public codename: string,
      public imageUrl: string,
      public officialArtworkUrl: string,
      public officialArtworkShinyUrl: string,
      public animatedSpriteUrl: string,
      public cryUrl: string,
      public height: number,
      public weight: number,
      public types: string[],
      public abilities: Ability[],
      public varieties: Variety[],
      public superWeakTo: string[],
      public weakTo: string[],
      public normal: string[],
      public resistantTo: string[],
      public superResistantTo: string[],
      public immuneTo: string[],
      public pokedexDescriptions: DexDescription[],
      public stats: Stat[],
      public genderRate: number,
      public habitat: string,
      public generation: string,
      public evolutionChain: EvoNode | null,
      public genus: string,
      public eggGroups: string[],
      public captureRate: number,
      public baseHappiness: number,
      public growthRate: string
    ) {}
  }

  export const loadPokemonDetails = async (id: number, lang: Lang = 'en'): Promise<PokemonDetails | undefined> => {
    try {
      const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const speciesData = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const imageUrl = data.sprites.front_default;
      // Prefer official artwork; fall back to the game sprite if absent.
      const officialArtworkUrl = data.sprites.other["official-artwork"].front_default || data.sprites.front_default;
      // Shiny official artwork, else the shiny sprite; empty when there's no
      // shiny at all (so the Shiny toggle can be hidden).
      const officialArtworkShinyUrl = data.sprites.other["official-artwork"].front_shiny || data.sprites.front_shiny || '';
      const cryUrl = data.cries?.latest || '';
      const height = data.height;
      const weight = data.weight;
      const types = data.types.map((type: any) => type.type.name);
      const abilitiesData = data.abilities;
      const abilitiesDescriptions = await getAbilitiesDescriptions(abilitiesData);
      const abilities = abilitiesData.map((abilityData: any, index: number) => {
        return {
          name: abilityData.ability.name,
          description: abilitiesDescriptions[index],
          is_hidden: abilityData.is_hidden,
        };
      });
      const stats = data.stats.map((stat: any) => {
        return {
          name: stat.stat.name,
          value: stat.base_stat
        };
      });
      const damageRelations = await getPokemonDamageRelations(id);
      const pokedexDescriptions = await getPokemonDescriptions(id, lang);
      const codename = data.species.name;
      const name = localName(speciesData.names, lang) || codename.charAt(0).toUpperCase() + codename.slice(1);
      
      const genderRate = speciesData.gender_rate;
      const habitat = speciesData.habitat?.name || 'unknown';
      const generation = speciesData.generation?.name || 'unknown';
      const evolutionChain = await getEvolutionChain(speciesData.evolution_chain?.url, lang);
      
      // New fields
      const animatedSpriteUrl = data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || '';
      const genusEntry = speciesData.genera?.find((g: any) => g.language.name === lang) || speciesData.genera?.find((g: any) => g.language.name === 'en');
      const genus = genusEntry ? genusEntry.genus : '';
      const eggGroups = speciesData.egg_groups?.map((eg: any) => eg.name) || [];
      const captureRate = speciesData.capture_rate || 0;
      const baseHappiness = speciesData.base_happiness || 0;
      const growthRate = speciesData.growth_rate?.name || 'unknown';
      const varieties = speciesData.varieties.map((v: any) => ({
        name: v.pokemon.name,
        url: v.pokemon.url,
        is_default: v.is_default,
      }));

      return new PokemonDetails(
        id,
        name,
        codename,
        imageUrl,
        officialArtworkUrl,
        officialArtworkShinyUrl,
        animatedSpriteUrl,
        cryUrl,
        height,
        weight,
        types,
        abilities,
        varieties,
        damageRelations.superWeakTo,
        damageRelations.weakTo,
        damageRelations.normal,
        damageRelations.resistantTo,
        damageRelations.superResistantTo,
        damageRelations.immuneTo,
        pokedexDescriptions,
        stats,
        genderRate,
        habitat,
        generation,
        evolutionChain,
        genus,
        eggGroups,
        captureRate,
        baseHappiness,
        growthRate
      );
    } catch (error) {
      console.error("Error fetching data from the PokeAPI:", error);
      return undefined;
    }
  };

  function cleanText(text: string): string {
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function getAbilitiesDescriptions(abilities: { ability: { url: string } }[]): Promise<string[]> {
    const descriptions = await Promise.all(
      abilities.map(async ({ ability: { url } }) => {
        const data = await cachedFetchJson(url);
        const englishDescription = data.effect_entries.find((entry: { language: { name: string } }) => entry.language.name === 'en');
        return englishDescription ? englishDescription.effect : 'No description available';
      })
    );
    return descriptions;
  }

  // Pokédex text in the page's language; PokeAPI only has Spanish from X & Y
  // on, so a species without any falls back to English (marked as such).
  async function getPokemonDescriptions(pokemonId: number, lang: Lang): Promise<DexDescription[]> {
    const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    const inLanguage = (code: string) => data.flavor_text_entries.filter((entry: { language: { name: string } }) => entry.language.name === code);
    const own = inLanguage(lang);
    const entries = own.length ? own : inLanguage('en');
    const fallback = own.length ? {} : { lang: 'en' };
    if (entries.length > 0) {
      const pokedexDescriptions: DexDescription[] = entries.map((entry: { flavor_text: string; version: { name: string } }) => {
        return { 'version': entry.version.name, 'flavor_text': cleanText(entry.flavor_text), ...fallback };
      });
      return pokedexDescriptions;
    } else {
      console.error(`No English flavor text entry found for Pokémon ID ${pokemonId}`);
      return [{ 'version': 'no version', 'flavor_text': 'No description available' }];
    }
  }

  async function getPokemonDamageRelations(pokemonId: number): Promise<{
    superWeakTo: string[];
    weakTo: string[];
    normal: string[];
    resistantTo: string[];
    superResistantTo: string[];
    immuneTo: string[];
  }> {
    const data = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    const types = data.types.map((type: { type: { url: string } }) => type.type);

    const damageRelations: DamageRelation[] = await Promise.all(types.map(async (type: { url: string }) => {
      const typeData = await cachedFetchJson(type.url);
      return typeData.damage_relations;
    }));

    const pokemonTypes = [
      'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water',
      'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
    ];

    const typeRelationMultipliers: { [key: string]: number } = {};

    damageRelations.forEach((relations: DamageRelation) => {
      relations.double_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = (typeRelationMultipliers[relation.name] || 1) * 2;
      });
      relations.half_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = (typeRelationMultipliers[relation.name] || 1) * 0.5;
      });
      relations.no_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = 0;
      });
    });

    const superWeakTo: string[] = [];
    const weakTo: string[] = [];
    const normal: string[] = [];
    const resistantTo: string[] = [];
    const superResistantTo: string[] = [];
    const immuneTo: string[] = [];

    for (const type of pokemonTypes) {
      const multiplier = typeRelationMultipliers[type];

      if (multiplier === 0) {
        immuneTo.push(type);
      } else if (multiplier === 4) {
        superWeakTo.push(type);
      } else if (multiplier === 2) {
        weakTo.push(type);
      } else if (multiplier === 0.5) {
        resistantTo.push(type);
      } else if (multiplier === 0.25) {
        superResistantTo.push(type);
      } else {
        normal.push(type);
      }
    }

    return {
      superWeakTo,
      weakTo,
      normal,
      resistantTo,
      superResistantTo,
      immuneTo,
    };
  }

  // Words for evolution and transformation conditions. Item, move, type,
  // species and nature names come from PokeAPI in the page's language.
  const EVO_WORDS_EN = {
    level: (n: number) => `Lv. ${n}`,
    hold: (item: string) => `Hold ${item}`,
    happiness: 'Happiness',
    affection: 'Affection',
    beauty: 'Beauty',
    location: 'Special location',
    rock: 'Near special rock',
    rain: 'During rain',
    upsideDown: 'Turn upside down',
    multiplayer: 'With another player',
    knows: (move: string) => `Knows ${move}`,
    moveType: (type: string) => `${type} move`,
    useMove: (move: string, times: number) => `Use ${move}${times ? ` ${times} times` : ''}`,
    recoil: (hp: number) => `Recoil damage (${hp} HP)`,
    steps: (n: number) => `Walk ${n} steps`,
    attackOver: 'Attack > Defense',
    attackUnder: 'Attack < Defense',
    attackEqual: 'Attack = Defense',
    party: (species: string) => `With ${species} in party`,
    partyType: (type: string) => `With ${type}-type in party`,
    female: 'Female',
    male: 'Male',
    tradeFor: (species: string) => `Trade for ${species}`,
    trade: 'Trade',
    time: {} as Record<string, string>,
    holding: (method: string, kind: string) => `${method} holding a ${kind}`,
    varies: (factors: string) => `form varies${factors ? ` by ${factors}` : ''}`,
    timeOfDay: 'time of day',
    factor: (kind: string) => kind,
    variables: {} as Record<string, string>,
    and: ' and ',
    triggers: {} as Record<string, string>,
    battle: {} as Record<string, string>,
  };

  const EVO_WORDS_ES: typeof EVO_WORDS_EN = {
    level: (n) => `Nv. ${n}`,
    hold: (item) => `Equipado con ${item}`,
    happiness: 'Amistad',
    affection: 'Afecto',
    beauty: 'Belleza',
    location: 'Lugar especial',
    rock: 'Cerca de una roca especial',
    rain: 'Con lluvia',
    upsideDown: 'Con la consola boca abajo',
    multiplayer: 'Con otro jugador',
    knows: (move) => `Conoce ${move}`,
    moveType: (type) => `Movimiento de tipo ${type}`,
    useMove: (move, times) => `Usar ${move}${times ? ` ${times} veces` : ''}`,
    recoil: (hp) => `Daño por retroceso (${hp} PS)`,
    steps: (n) => `Caminar ${n} pasos`,
    attackOver: 'Ataque > Defensa',
    attackUnder: 'Ataque < Defensa',
    attackEqual: 'Ataque = Defensa',
    party: (species) => `Con ${species} en el equipo`,
    partyType: (type) => `Con un Pokémon de tipo ${type} en el equipo`,
    female: 'Hembra',
    male: 'Macho',
    tradeFor: (species) => `Intercambio por ${species}`,
    trade: 'Intercambio',
    time: { day: 'de día', night: 'de noche', dusk: 'al anochecer' },
    holding: (method, kind) => `${method} equipado con un ${kind}`,
    varies: (factors) => `la forma varía${factors ? ` según ${factors}` : ''}`,
    timeOfDay: 'la hora del día',
    factor: (kind) => `el ${kind}`,
    variables: { spin: 'el giro' },
    and: ' y ',
    triggers: {
      'level-up': 'Subir de nivel',
      'use-item': 'Usar objeto',
      shed: 'Muda (con hueco en el equipo y una Poké Ball)',
      spin: 'Girar',
      'tower-of-darkness': 'Entrenar en la Torre de la Oscuridad',
      'tower-of-waters': 'Entrenar en la Torre del Agua',
      'three-critical-hits': 'Asestar tres golpes críticos en un combate',
      'take-damage': 'Ir a un lugar concreto tras recibir daño',
      'in-battle-level-up': 'Subir de nivel en combate',
      'agile-style-move': 'Usar un movimiento con estilo rápido',
      'strong-style-move': 'Usar un movimiento con estilo fuerte',
      'recoil-damage': 'Recibir daño por retroceso',
      'use-move': 'Usar un movimiento',
      'three-defeated-bisharp': 'Derrotar a tres Bisharp con Distintivo de Líder',
      'gimmighoul-coins': 'Reunir 999 monedas de Gimmighoul',
      'meltan-candies': 'Dar 400 caramelos de Meltan en Pokémon GO',
      other: 'Otro',
    },
    battle: { 'gigantamax-factor': 'Factor Gigamax' },
  };

  async function getEvolutionChain(evolutionChainUrl: string | undefined, lang: Lang): Promise<EvoNode | null> {
    if (!evolutionChainUrl) return null;
    await ensureRegionsLoaded();
    const words = lang === 'es' ? EVO_WORDS_ES : EVO_WORDS_EN;

    try {
      const data = await cachedFetchJson(evolutionChainUrl);

      const artwork = (id: number): string =>
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
      const idFromUrl = (url: string): number => parseInt(url.split('/').filter(Boolean).pop() as string);

      const titleCase = (s: string): string =>
        s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const nameOf = (ref: any): Promise<string> => resourceName(ref?.url, lang, ref?.name || '');
      const triggerName = async (trigger: any): Promise<string> =>
        (lang === 'es' && words.triggers[trigger?.name || '']) || (trigger ? resourceName(trigger.url, 'en', trigger.name) : '');
      // The condition to trigger a battle-only transformation (mega stone, Gigantamax
      // Factor, an ability…), shown under the "↔". Deduped (a form may repeat a trigger);
      // the "--held"/"--bag" suffix on Z-crystal item names is dropped for display.
      const buildBattleTrigger = async (conditions: any[]): Promise<string> =>
        Array.from(new Set(
          (await Promise.all((conditions || []).map((c: any) => c.url
            ? resourceName(c.url, lang, (c.name || '').replace(/--(held|bag)$/, ''))
            : words.battle[c.trigger] || titleCase(c.name || c.trigger || ''))))
            .filter(Boolean)
        )).join(' + ');

      const buildTriggerDetails = async (detail: any): Promise<string> => {
        const trigger = detail.trigger?.name || '';
        const detailParts: string[] = [];
        if (detail.min_level) detailParts.push(words.level(detail.min_level));
        if (detail.item) detailParts.push(await nameOf(detail.item));
        if (detail.held_item) detailParts.push(words.hold(await nameOf(detail.held_item)));
        if (detail.min_happiness) detailParts.push(words.happiness);
        if (detail.min_affection) detailParts.push(words.affection);
        if (detail.min_beauty) detailParts.push(words.beauty);
        if (detail.time_of_day) detailParts.push(words.time[detail.time_of_day] || titleCase(detail.time_of_day));
        if (detail.location) detailParts.push(words.location);
        if (detail.near_special_rock) detailParts.push(words.rock);
        if (detail.needs_overworld_rain) detailParts.push(words.rain);
        if (detail.turn_upside_down) detailParts.push(words.upsideDown);
        if (detail.needs_multiplayer) detailParts.push(words.multiplayer);
        if (detail.known_move) detailParts.push(words.knows(await nameOf(detail.known_move)));
        if (detail.known_move_type) detailParts.push(words.moveType(await nameOf(detail.known_move_type)));
        if (detail.used_move) detailParts.push(words.useMove(await nameOf(detail.used_move), detail.min_move_count || 0));
        if (detail.min_damage_taken) detailParts.push(words.recoil(detail.min_damage_taken));
        if (detail.min_steps) detailParts.push(words.steps(detail.min_steps));
        // Tyrogue → Hitmonlee (Atk>Def) / Hitmonchan (Atk<Def) / Hitmontop (Atk=Def).
        if (detail.relative_physical_stats === 1) detailParts.push(words.attackOver);
        else if (detail.relative_physical_stats === -1) detailParts.push(words.attackUnder);
        else if (detail.relative_physical_stats === 0) detailParts.push(words.attackEqual);
        if (detail.party_species) detailParts.push(words.party(await nameOf(detail.party_species)));
        if (detail.party_type) detailParts.push(words.partyType(await nameOf(detail.party_type)));
        // Some evolutions are gender-locked (Combee → Vespiquen ♀, Kirlia → Gallade ♂).
        if (detail.gender === 1) detailParts.push(words.female);
        else if (detail.gender === 2) detailParts.push(words.male);
        if (detail.trade_species) detailParts.push(words.tradeFor(await nameOf(detail.trade_species)));
        else if (trigger === 'trade' && detailParts.length === 0) detailParts.push(words.trade);
        let text = detailParts.join(' + ') || await triggerName(detail.trigger);
        // Nature-gated evolutions (Toxel → Amped/Low-Key Toxtricity): list the
        // qualifying natures below the trigger; skipped when all 25 qualify.
        const natures = detail.allowed_natures || [];
        if (natures.length && natures.length < 25) {
          const names = (await Promise.all(natures.map(nameOf))).join(', ');
          text += `<br>(${names})`;
        }
        return text;
      };

      // Used when the evolved form collapses into a set of forms (Alcremie's per-Sweet
      // forms): name the method and which factors pick the form, not their values. Read
      // from the data (item, time, condition variables), so it needs no per-Pokémon knowledge.
      const buildGenericTrigger = async (detail: any): Promise<string> => {
        const method = await triggerName(detail.trigger || { name: 'level-up', url: 'https://pokeapi.co/api/v2/evolution-trigger/1/' });
        const factors: string[] = [];
        let prefix = method;
        if (detail.held_item) {
          const kind = lang === 'es'
            ? (await nameOf(detail.held_item)).split(' ')[0]
            : titleCase(detail.held_item.name.split('-').pop());
          prefix = words.holding(method, kind);
          factors.push(words.factor(kind));
        }
        if (detail.time_of_day) factors.push(words.timeOfDay);
        for (const v of detail.condition_expression?.variables || []) {
          const w = v.name.split('-')[0];   // e.g. "spin-direction" -> "spin"
          const factor = words.variables[w] || w;
          if (!factors.includes(factor)) factors.push(factor);
        }
        const list = factors.length > 1 ? factors.slice(0, -1).join(', ') + words.and + factors[factors.length - 1] : factors[0] || '';
        return `${prefix}<br>(${words.varies(list)})`;
      };

      const processChain = async (chain: any): Promise<EvoNode> => {
        const codename = chain.species.name;
        const speciesUrl = chain.species.url;
        const speciesId = idFromUrl(speciesUrl);

        const speciesData = await cachedFetchJson(speciesUrl);
        const varieties = speciesData.varieties || [];

        const capName = localName(speciesData.names, lang) || codename.charAt(0).toUpperCase() + codename.slice(1);
        const spanishLabels = lang === 'es' ? await spanishVarietyLabels(speciesId) : null;
        const defaultVar = varieties.find((v: any) => v.is_default) || { pokemon: { name: codename, url: speciesUrl } };
        const defaultName = defaultVar.pokemon.name;
        const allFormNames: string[] = varieties.map((v: any) => v.pokemon.name);
        const varietyNames = new Set<string>(allFormNames);
        const suffixOf = (name: string) =>
          name.startsWith(codename + '-') ? name.slice(codename.length + 1) : name.split('-').slice(1).join('-');
        // The English name of a form ("Galarian Meowth", "Hisuian Growlithe")
        // comes straight from the form endpoint, so the region adjective doesn't
        // need to be hardcoded. `fd` is the fetched pokemon-form (may be null).
        const englishName = (fd: any): string | undefined =>
          (fd?.names || []).find((n: any) => n.language?.name === 'en')?.name;
        const labelFor = (name: string, fd?: any): string => {
          if (name === defaultName) return capName;
          if (spanishLabels) return spanishLabels.get(name) || capName;
          const suffix = suffixOf(name);
          const region = regionOf(name);
          // Pure regional forms (suffix is exactly the region token) use the
          // API's localized name; compound/other forms keep the "(Suffix)" style.
          if (region !== 'default' && suffix === region) {
            return englishName(fd) || `${capName} (${titleCase(suffix)})`;
          }
          return `${capName} (${titleCase(suffix)})`;
        };

        // Fetch every non-default variety's form data once (in parallel) to know
        // which are battle-only and how they're triggered.
        const nonDefault = varieties.filter((v: any) => !v.is_default);
        const formInfos = await Promise.all(nonDefault.map(async (v: any) => {
          try {
            const fd = await cachedFetchJson(`https://pokeapi.co/api/v2/pokemon-form/${v.pokemon.name}/`);
            return { v, fd };
          } catch (e) { return { v, fd: null }; }
        }));

        // Permanent variants (default + regional + cosmetic); battle-only handled
        // separately. The region comes from the form name, so a non-region difference
        // (single-strike, midday…) stays on the default line as a branch, not a chain.
        const defaultId = idFromUrl(defaultVar.pokemon.url);
        const variants: EvoFormVariant[] = [
          { id: defaultId, formName: defaultName, name: capName, imageUrl: artwork(defaultId), region: regionOf(defaultName) },
        ];
        for (const { v, fd } of formInfos) {
          if (fd && fd.is_battle_only) continue;
          const vId = idFromUrl(v.pokemon.url);
          variants.push({ id: vId, formName: v.pokemon.name, name: labelFor(v.pokemon.name, fd), imageUrl: artwork(vId), region: regionOf(v.pokemon.name) });
        }

        // Persistent form pairs (Minior meteor ↔ core): non-battle-only forms that name a
        // sibling in their trigger conditions. The map is bidirectional (covers the default
        // via its counterpart); each variant links to its counterpart for the "↔".
        const idByName: { [n: string]: number } = {};
        for (const vv of varieties) idByName[vv.pokemon.name] = idFromUrl(vv.pokemon.url);
        const transformMap: { [n: string]: { counterpart: string; trigger: string } } = {};
        for (const { v, fd } of formInfos) {
          if (!fd || fd.is_battle_only) continue;  // battle-only handled below
          const conds = fd.trigger_conditions || [];
          const trigger = await buildBattleTrigger(conds);
          for (const c of conds) {
            const b = c.base_form?.name;
            if (b && varietyNames.has(b) && b !== v.pokemon.name) {
              transformMap[v.pokemon.name] = { counterpart: b, trigger };
              if (!transformMap[b]) transformMap[b] = { counterpart: v.pokemon.name, trigger };
            }
          }
        }
        for (const variant of variants) {
          const t = transformMap[variant.formName];
          if (t && idByName[t.counterpart] !== undefined) {
            const cid = idByName[t.counterpart];
            variant.transform = { id: cid, formName: t.counterpart, name: labelFor(t.counterpart), imageUrl: artwork(cid), trigger: t.trigger };
          }
        }

        // Battle-only forms: transient transformations attached to the sibling form(s)
        // they transform from. PokeAPI names those on each trigger condition (base_form);
        // a null base_form means the default form (e.g. Mega Charizard), so fall back to it.
        const battleForms: EvoBattleForm[] = [];
        for (const { v, fd } of formInfos) {
          if (!fd || !fd.is_battle_only) continue;
          const vId = idFromUrl(v.pokemon.url);
          const formName = fd.form_name || suffixOf(v.pokemon.name);
          const conditions = fd.trigger_conditions || [];

          let baseForms: string[] = Array.from(new Set<string>(
            conditions
              .map((c: any) => c.base_form?.name)
              .filter((n: string) => n && varietyNames.has(n))
          ));
          if (baseForms.length === 0) baseForms = [defaultName];
          battleForms.push({
            id: vId,
            formName: v.pokemon.name,
            name: spanishLabels?.get(v.pokemon.name) || `${titleCase(formName)} ${capName}`,
            imageUrl: artwork(vId),
            trigger: await buildBattleTrigger(conditions),
            baseForms,
          });
        }

        const children: EvoEdge[] = await Promise.all(
          chain.evolves_to.map(async (evo: any): Promise<EvoEdge> => {
            const paths: EvoPath[] = await Promise.all((evo.evolution_details || []).map(async (detail: any) => ({
              baseForm: detail.required_pokemon_form?.name || null,
              evolvedForm: detail.evolved_pokemon_form?.name || null,
              trigger: await buildTriggerDetails(detail),
              genericTrigger: await buildGenericTrigger(detail),
              vg: detail.version_group ? idFromUrl(detail.version_group.url) : 0,
            })));
            if (paths.length === 0) paths.push({ baseForm: null, evolvedForm: null, trigger: '', genericTrigger: '', vg: 0 });
            return { node: await processChain(evo), paths };
          })
        );

        return { speciesId, codename, defaultFormName: defaultName, variants, allFormNames, battleForms, children };
      };

      return await processChain(data.chain);
    } catch (error) {
      console.error("Error fetching evolution chain:", error);
      return null;
    }
  }
