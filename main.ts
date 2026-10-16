import { writeFile } from "fs/promises";
import { loadPokemons, Pokemon } from "./pokemon";
import { loadPokemonDetails, PokemonDetails } from "./pokemon-detail"
import { mapWithConcurrency } from "./concurrency";
import { regionOf, ensureRegionsLoaded, REGION_TOKENS } from "./regions";
import { ensureTypesLoaded, ALL_TYPES } from "./types";

const ICON_PATHS: Record<string, string> = {
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowLeftRight: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  swords: '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>',
  sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"/>',
  play: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
};

function icon(name: string, extraClass: string = ''): string {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

const POKEBALL_LOGO = `<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#fff" stroke="#111827" stroke-width="2.5"/><path d="M2 16a14 14 0 0 1 28 0z" fill="#e3350d" stroke="#111827" stroke-width="2.5"/><circle cx="16" cy="16" r="4.5" fill="#fff" stroke="#111827" stroke-width="2.5"/></svg>`;

const BRAND = `${POKEBALL_LOGO}<span class="brand-name">PokeQuick<span>Dex</span></span>`;

const THEME_TOGGLE = `<button id="dark-mode-toggle" class="icon-btn theme-toggle" type="button" title="Toggle dark mode" aria-label="Toggle dark mode">${icon('moon', 'icon-moon')}${icon('sun', 'icon-sun')}</button>`;

const SITE_FOOTER = `
      <footer class="site-footer">
        <span>Data from <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a>.</span>
        <span>Pokémon and its trademarks are © Nintendo, Game Freak and The Pokémon Company.</span>
      </footer>`;

const typeVars = (types: string[]): string =>
  `--tc: var(--type-${types[0]}, #9fa19f); --tc2: var(--type-${types[1] || types[0]}, #9fa19f); --tink: var(--ink-${types[0]}, #16181d)`;

const GENERATIONS: [string, string, string][] = [
  ['generation-i', 'I', 'Kanto'],
  ['generation-ii', 'II', 'Johto'],
  ['generation-iii', 'III', 'Hoenn'],
  ['generation-iv', 'IV', 'Sinnoh'],
  ['generation-v', 'V', 'Unova'],
  ['generation-vi', 'VI', 'Kalos'],
  ['generation-vii', 'VII', 'Alola'],
  ['generation-viii', 'VIII', 'Galar'],
  ['generation-ix', 'IX', 'Paldea'],
];

const searchKey = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

const ABILITY_MATCHUPS: Record<string, string> = {
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

const abilityNotes = (abilities: { name: string; is_hidden: boolean }[]): string =>
  abilities
    .filter(a => ABILITY_MATCHUPS[a.name])
    .map(a => `<li><span><b>${titleCase(a.name)}</b>${a.is_hidden ? ' <span class="note-hidden">(hidden ability)</span>' : ''}: ${ABILITY_MATCHUPS[a.name]}.</span></li>`)
    .join('');

const renderMatchups = (d: { superWeakTo: string[]; weakTo: string[]; resistantTo: string[]; superResistantTo: string[]; immuneTo: string[] }): string => {
  const chip = (type: string, mult: string, extraClass: string = '') =>
    `<span class="tag mu-chip ${type}${extraClass}">${type}<b class="mu-x">${mult}</b></span>`;
  const group = (key: string, label: string, chips: string) =>
    `<div class="mu-group mu-${key}"><div class="mu-label">${label}</div><div class="mu-chips">${chips || '<span class="mu-none">None</span>'}</div></div>`;
  const weak = d.superWeakTo.map(t => chip(t, '4×', ' x4')).join('') + d.weakTo.map(t => chip(t, '2×')).join('');
  const resist = d.superResistantTo.map(t => chip(t, '¼×')).join('') + d.resistantTo.map(t => chip(t, '½×')).join('');
  const immune = d.immuneTo.map(t => chip(t, '0×')).join('');
  return group('weak', 'Weak to', weak) + group('resist', 'Resists', resist) + (immune ? group('immune', 'Immune to', immune) : '');
};

const titleCase = (s: string): string =>
  s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

const statColor = (value: number): string =>
  value < 50 ? '#f34444' : value < 80 ? '#ff7f0f' : value < 100 ? '#ffdd57' : value < 120 ? '#a0e515' : value < 150 ? '#23cd5e' : '#00c2b8';

const typeTags = (types: string[]): string =>
  types.map(type => `<span class="tag ${type}">${type}</span>`).join('');

function sharedHead(): string {
  return `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
      <link rel="stylesheet" href="css/base.css">
      <script>
        try { if (localStorage.getItem("darkMode") === "true") document.documentElement.classList.add("dark-mode"); } catch (e) {}
      </script>`;
}

function renderPokemonIndex(pokemons: Array<Pokemon>): string {
    const pokemonCard = (href: string, dexNo: string, name: string, types: string[], imageUrl: string, dataAttrs: string, extraClass: string = '', defaultImg: string = ''): string => `
        <a class="pokemon-card${extraClass}" href="${href}" ${dataAttrs} style="${typeVars(types)}">
          <div class="card-art">
            <span class="pokemon-id">#${dexNo}</span>
            <img src="${imageUrl}"${defaultImg ? ` data-default-img="${defaultImg}"` : ''} alt="" loading="lazy" decoding="async" width="96" height="96" />
          </div>
          <div class="card-body">
            <h2>${name}</h2>
            <div class="card-types">${typeTags(types)}</div>
          </div>
        </a>`;
    const pokemonLinks = pokemons.map((pokemon) => {
      const dexNo = String(pokemon.id).padStart(4, '0');
      const tags = `data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' data-dex='${pokemon.id}'`;
      const baseCard = `
      <li>${pokemonCard(`${dexNo}_details.html`, dexNo, pokemon.name, pokemon.types, pokemon.imageUrl,
        `data-types='${JSON.stringify(pokemon.types)}' ${tags} data-generation='${pokemon.generation}' data-id='${pokemon.id}' data-name="${pokemon.name}" data-search="${searchKey(pokemon.name)}"`)}
      </li>`;
      // Form cards share the species' dex number/tags but carry the form's own
      // types, and link to the detail page with a #hash so it opens in that form.
      // Hidden until the "All forms" toggle is on.
      const formCards = pokemon.forms.map((form) => `
      <li style="display: none;">${pokemonCard(`${dexNo}_details.html#${form.suffix}`, dexNo, form.name, form.types, form.imageUrl,
        `data-types='${JSON.stringify(form.types)}' ${tags} data-generation='${form.generation}' data-id='${form.id}' data-name="${form.name}" data-search="${searchKey(form.name)}" data-formkind='${form.kind}'`,
        ' form-variant', pokemon.officialArtworkUrl)}
      </li>`).join('\n');
      return baseCard + formCards;
    }).join('\n');

    const typeOptions = ALL_TYPES.map(type => `
              <label class="type-option"><input type="radio" name="type" value="${type}"><span class="tag ${type}">${type}</span></label>`).join('');
    const generationOptions = GENERATIONS.map(([value, numeral, region]) => `
              <label class="chip-option"><input type="radio" name="generation" value="${value}"><span><b>${numeral}</b>${region}</span></label>`).join('');
    const generationLabels = Object.fromEntries(GENERATIONS.map(([value, numeral, region]) => [value, `Gen ${numeral} · ${region}`]));

    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
      <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='47' fill='%23f0f0f0' stroke='%23333' stroke-width='6'/><path d='M3 50 A47 47 0 0 1 97 50' fill='%23ee1515'/><rect x='0' y='46' width='100' height='8' fill='%23333'/><circle cx='50' cy='50' r='12' fill='%23fff' stroke='%23333' stroke-width='6'/><circle cx='50' cy='50' r='5' fill='%23333'/></svg>">
      <title>PokeQuickDex</title>
      <meta name="description" content="PokeQuickDex - Your quick reference for all Pokémon stats, types, abilities, and evolution chains. Browse all 1025 Pokémon!">
      <meta property="og:title" content="PokeQuickDex - Complete Pokémon Database">
      <meta property="og:description" content="Browse all 1025 Pokémon with stats, types, abilities, and evolution chains.">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://pokequickdex.vercel.app">${sharedHead()}
      <link rel="stylesheet" href="css/styles.css">
      <link rel="stylesheet" href="css/types.css">
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5418523060607609" crossorigin="anonymous"></script>
      <link rel="canonical" href="https://pokequickdex.vercel.app" />
      <script defer src="/_vercel/insights/script.js"></script>
      <script>
        // On image error, retry the official artwork a few times (transient
        // github hiccups) before falling back to Dream World, then the sprite.
        // Capture phase, so it catches cards loading before other scripts run.
        document.addEventListener('error', function (ev) {
          var img = ev.target;
          if (!img || img.tagName !== 'IMG') return;
          var src = img.src.split('?')[0];
          if (src.indexOf('/other/official-artwork/') !== -1) {
            var tries = +(img.getAttribute('data-oa-retry') || 0);
            if (tries < 3) {
              img.setAttribute('data-oa-retry', tries + 1);
              setTimeout(function () { img.src = src + '?r=' + (tries + 1); }, 300 * (tries + 1));
            } else if (src.indexOf('/official-artwork/shiny/') !== -1) {
              img.src = src.replace('/other/official-artwork/', '/');            // shiny: go to shiny sprite
            } else {
              img.src = src.replace('/other/official-artwork/', '/other/dream-world/').replace(/\\.png$/, '.svg');  // -> Dream World
            }
          } else if (src.indexOf('/other/dream-world/') !== -1) {
            img.src = src.replace('/other/dream-world/', '/').replace(/\\.svg$/, '.png');   // -> game sprite
          } else {
            var di = img.getAttribute('data-default-img');                       // -> default form's image
            if (di && di !== src) { img.removeAttribute('data-default-img'); img.setAttribute('data-oa-retry', 0); img.src = di; }
          }
        }, true);
      </script>
    </head>
    <body>
      <header class="topbar">
        <div class="topbar-inner">
          <a href="index.html" class="brand" aria-label="PokeQuickDex home">${BRAND}</a>
          <label class="search">${icon('search')}<input type="search" id="search-input" class="search-input" placeholder="Search by name or number" aria-label="Search Pokémon by name or number" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" /><kbd>/</kbd></label>
          <div class="topbar-actions">${THEME_TOGGLE}</div>
        </div>
      </header>
      <main class="index">
        <aside id="filters" class="filters" aria-label="Filters">
          <div class="filters-head">
            <h2>Filters</h2>
            <button type="button" id="clear-filters-btn" class="link-btn" hidden>Clear all</button>
            <button type="button" id="filters-close" class="icon-btn filters-close" aria-label="Close filters">${icon('close')}</button>
          </div>
          <div class="filters-body">
            <fieldset class="filter-group">
              <legend>Type</legend>
              <div class="type-options">
                <label class="type-option"><input type="radio" name="type" value="" checked><span class="any">All types</span></label>${typeOptions}
              </div>
            </fieldset>
            <fieldset class="filter-group">
              <legend>Generation</legend>
              <div class="gen-options">
                <label class="chip-option"><input type="radio" name="generation" value="" checked><span>All</span></label>${generationOptions}
              </div>
            </fieldset>
            <fieldset class="filter-group toolbar-tags">
              <legend>Category</legend>
              <div class="chip-options">
                <label class="chip-option"><input type="checkbox" id="baby-filter"><span>Baby</span></label>
                <label class="chip-option"><input type="checkbox" id="legendary-filter"><span>Legendary</span></label>
                <label class="chip-option"><input type="checkbox" id="mythical-filter"><span>Mythical</span></label>
              </div>
            </fieldset>
            <fieldset class="filter-group toolbar-forms">
              <legend>Show</legend>
              <div class="chip-options">
                <label class="chip-option"><input type="checkbox" id="species-filter" checked><span>Species</span></label>
                <label class="chip-option"><input type="checkbox" id="regional-filter"><span>Regional forms</span></label>
                <label class="chip-option"><input type="checkbox" id="battle-filter"><span>Battle forms</span></label>
                <label class="chip-option"><input type="checkbox" id="other-filter"><span>Other forms</span></label>
              </div>
            </fieldset>
          </div>
          <div class="filters-foot">
            <button type="button" id="filters-apply" class="btn btn-primary">Show results</button>
          </div>
        </aside>
        <div class="sheet-backdrop" id="filters-backdrop"></div>
        <section class="results" aria-label="Pokémon list">
          <div class="index-head">
            <div>
              <h1>Pokédex</h1>
              <p class="results-count" id="results-count" aria-live="polite">${pokemons.length} Pokémon</p>
            </div>
            <div class="index-actions">
              <button type="button" id="filters-open" class="btn filters-open" aria-controls="filters">${icon('sliders')}<span>Filters</span><span class="badge" id="filters-badge" hidden></span></button>
              <button type="button" id="compare-mode-btn" class="btn compare-mode-btn" aria-pressed="false">${icon('swords')}<span>Compare</span></button>
            </div>
          </div>
          <div class="active-filters" id="active-filters" hidden></div>
          <p class="compare-hint" id="compare-hint" hidden>Pick two Pokémon to compare their base stats, or just one to compare its forms.</p>
          <ul class="pokemon-grid">${pokemonLinks}</ul>
          <div class="empty-state" id="empty-state" hidden>
            <h2>No Pokémon found</h2>
            <p>Try another name or number, or remove some filters.</p>
            <button type="button" class="btn" id="empty-clear">Clear filters</button>
          </div>
        </section>
      </main>
      ${SITE_FOOTER}
      <div id="compare-bar" class="compare-bar" style="display: none;" role="region" aria-label="Compare Pokémon">
        <div class="compare-slots">
          <span id="compare-pokemon-1" class="compare-slot">Pick a Pokémon</span>
          <span class="vs-text">vs</span>
          <span id="compare-pokemon-2" class="compare-slot">Pick another</span>
        </div>
        <div class="compare-actions">
          <button id="clear-compare-btn" class="btn" type="button">Cancel</button>
          <button id="compare-btn" class="btn btn-primary" type="button" disabled>Compare</button>
        </div>
      </div>
      <div id="compare-modal" class="compare-modal" style="display: none;">
        <div class="compare-modal-content" role="dialog" aria-modal="true" aria-labelledby="compare-title">
          <div class="compare-modal-head">
            <h2 id="compare-title">Compare</h2>
            <button class="close-modal icon-btn" type="button" aria-label="Close">${icon('close')}</button>
          </div>
          <div id="compare-results" class="compare-results"></div>
        </div>
      </div>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          document.getElementById("dark-mode-toggle").addEventListener("click", function() {
            const isDark = document.documentElement.classList.toggle("dark-mode");
            localStorage.setItem("darkMode", isDark);
          });

          const TOTAL = ${pokemons.length};
          const GENERATION_LABELS = ${JSON.stringify(generationLabels)};
          const STAT_LABELS = ${JSON.stringify(STAT_LABELS)};
          const STAT_NAMES = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
          const CLOSE_ICON = ${JSON.stringify(icon('close'))};
          const VOLUME_ICON = ${JSON.stringify(icon('volume'))};
          const cards = Array.prototype.slice.call(document.querySelectorAll(".pokemon-card"));
          const searchInput = document.getElementById("search-input");
          const filtersPanel = document.getElementById("filters");
          const filtersBackdrop = document.getElementById("filters-backdrop");
          const filtersApply = document.getElementById("filters-apply");
          const filtersBadge = document.getElementById("filters-badge");
          const clearFiltersBtn = document.getElementById("clear-filters-btn");
          const resultsCount = document.getElementById("results-count");
          const activeFilters = document.getElementById("active-filters");
          const emptyState = document.getElementById("empty-state");
          const categoryBoxes = Array.prototype.slice.call(document.querySelectorAll('.toolbar-tags input[type="checkbox"]'));

          function normalize(text) {
            return text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
          }

          function checkedValue(name) {
            const input = document.querySelector('input[name="' + name + '"]:checked');
            return input ? input.value : "";
          }

          function setRadio(name, value) {
            const input = document.querySelector('input[name="' + name + '"][value="' + value + '"]') || document.querySelector('input[name="' + name + '"][value=""]');
            input.checked = true;
          }

          function isChecked(id) {
            return document.getElementById(id).checked;
          }

          function setChecked(id, value) {
            document.getElementById(id).checked = value;
          }

          function readFilters() {
            return {
              search: searchInput.value,
              type: checkedValue("type"),
              generation: checkedValue("generation"),
              baby: isChecked("baby-filter"),
              legendary: isChecked("legendary-filter"),
              mythical: isChecked("mythical-filter"),
              species: isChecked("species-filter"),
              regional: isChecked("regional-filter"),
              battle: isChecked("battle-filter"),
              other: isChecked("other-filter")
            };
          }

          function saveFilters() {
            sessionStorage.setItem("pokemonFilters", JSON.stringify(readFilters()));
          }

          function loadFilters() {
            const saved = sessionStorage.getItem("pokemonFilters");
            if (!saved) return;
            const filters = JSON.parse(saved);
            searchInput.value = filters.search || "";
            setRadio("type", filters.type || "");
            setRadio("generation", filters.generation || "");
            setChecked("baby-filter", !!filters.baby);
            setChecked("legendary-filter", !!filters.legendary);
            setChecked("mythical-filter", !!filters.mythical);
            setChecked("species-filter", filters.species !== false);
            setChecked("regional-filter", !!filters.regional);
            setChecked("battle-filter", !!filters.battle);
            setChecked("other-filter", !!filters.other);
          }

          function formsChanged(filters) {
            return !filters.species || filters.regional || filters.battle || filters.other;
          }

          function plural(count) {
            return count + (count === 1 ? " result" : " results");
          }

          function filterPokemons() {
            const filters = readFilters();
            const query = filters.search.trim();
            const key = normalize(query);
            const number = /^#?\\d+$/.test(query) ? parseInt(query.replace("#", ""), 10) : null;
            const noCategory = !filters.baby && !filters.legendary && !filters.mythical;
            // Every visible card's link (species and forms, in display order), so
            // the detail page's prev/next arrows walk the whole filtered result
            // set; a form's link is its species page plus the form hash.
            const visibleNav = [];
            cards.forEach(function(card) {
              const data = card.dataset;
              const nameMatch = !key || (number !== null ? Number(data.dex) === number : data.search.indexOf(key) !== -1);
              const typeMatch = !filters.type || JSON.parse(data.types).indexOf(filters.type) !== -1;
              const generationMatch = !filters.generation || data.generation === filters.generation;
              const categoryMatch = noCategory || (filters.baby && data.baby === "true") || (filters.legendary && data.legendary === "true") || (filters.mythical && data.mythical === "true");
              // Complementary category toggles: base species, regional forms,
              // battle-only forms, and any other (cosmetic) forms.
              const kindMatch = filters[data.formkind || "species"];
              const visible = nameMatch && typeMatch && generationMatch && categoryMatch && kindMatch;
              card.parentElement.style.display = visible ? "" : "none";
              if (visible) visibleNav.push(card.getAttribute("href"));
            });

            const facets = (filters.type ? 1 : 0) + (filters.generation ? 1 : 0) + (noCategory ? 0 : 1) + (formsChanged(filters) ? 1 : 0);
            const filtered = facets > 0 || key !== "";
            if (filtered) sessionStorage.setItem("filteredPokemonNav", JSON.stringify(visibleNav));
            else sessionStorage.removeItem("filteredPokemonNav");
            resultsCount.textContent = filtered ? plural(visibleNav.length) : TOTAL + " Pokémon";
            filtersApply.textContent = visibleNav.length ? "Show " + plural(visibleNav.length) : "No results";
            filtersBadge.textContent = facets;
            filtersBadge.hidden = facets === 0;
            clearFiltersBtn.hidden = !filtered;
            emptyState.hidden = visibleNav.length > 0;
            renderActiveFilters(filters, noCategory);
          }

          function renderActiveFilters(filters, noCategory) {
            const chips = [];
            if (filters.type) chips.push(["type", '<span class="tag ' + filters.type + '">' + filters.type + '</span>']);
            if (filters.generation) chips.push(["generation", GENERATION_LABELS[filters.generation]]);
            if (!noCategory) chips.push(["category", filters.baby ? "Baby" : filters.legendary ? "Legendary" : "Mythical"]);
            if (formsChanged(filters)) {
              const shown = [];
              if (filters.species) shown.push("Species");
              if (filters.regional) shown.push("Regional");
              if (filters.battle) shown.push("Battle");
              if (filters.other) shown.push("Other");
              chips.push(["forms", "Showing: " + (shown.join(", ") || "none")]);
            }
            activeFilters.innerHTML = chips.map(function(chip) {
              return '<button type="button" class="active-chip" data-clear="' + chip[0] + '" title="Remove filter">' + chip[1] + CLOSE_ICON + '</button>';
            }).join("");
            activeFilters.hidden = chips.length === 0;
          }

          function clearAllFilters() {
            searchInput.value = "";
            setRadio("type", "");
            setRadio("generation", "");
            ["baby-filter", "legendary-filter", "mythical-filter", "regional-filter", "battle-filter", "other-filter"].forEach(function(id) { setChecked(id, false); });
            setChecked("species-filter", true);
            sessionStorage.removeItem("pokemonFilters");
            filterPokemons();
          }

          activeFilters.addEventListener("click", function(e) {
            const chip = e.target.closest("[data-clear]");
            if (!chip) return;
            const facet = chip.dataset.clear;
            if (facet === "type") setRadio("type", "");
            if (facet === "generation") setRadio("generation", "");
            if (facet === "category") categoryBoxes.forEach(function(box) { box.checked = false; });
            if (facet === "forms") {
              setChecked("species-filter", true);
              ["regional-filter", "battle-filter", "other-filter"].forEach(function(id) { setChecked(id, false); });
            }
            filterPokemons();
            saveFilters();
          });

          filtersPanel.addEventListener("change", function(e) {
            // Baby/Legendary/Mythical are mutually exclusive (radio-like).
            if (categoryBoxes.indexOf(e.target) !== -1 && e.target.checked) {
              categoryBoxes.forEach(function(box) { if (box !== e.target) box.checked = false; });
            }
            filterPokemons();
            saveFilters();
          });

          clearFiltersBtn.addEventListener("click", clearAllFilters);
          document.getElementById("empty-clear").addEventListener("click", clearAllFilters);
          searchInput.addEventListener("input", function() { filterPokemons(); saveFilters(); });
          searchInput.addEventListener("keydown", function(e) { if (e.key === "Enter") searchInput.blur(); });

          function openFilters() {
            filtersPanel.classList.add("open");
            filtersBackdrop.classList.add("open");
            document.body.classList.add("no-scroll");
          }

          function closeFilters() {
            filtersPanel.classList.remove("open");
            filtersBackdrop.classList.remove("open");
            document.body.classList.remove("no-scroll");
          }

          document.getElementById("filters-open").addEventListener("click", openFilters);
          document.getElementById("filters-close").addEventListener("click", closeFilters);
          filtersApply.addEventListener("click", closeFilters);
          filtersBackdrop.addEventListener("click", closeFilters);

          // Compare functionality
          let compareList = [];
          let compareMode = false;
          const compareModeBtn = document.getElementById("compare-mode-btn");
          const compareBar = document.getElementById("compare-bar");
          const compareSlot1 = document.getElementById("compare-pokemon-1");
          const compareSlot2 = document.getElementById("compare-pokemon-2");
          const compareBtn = document.getElementById("compare-btn");
          const compareHint = document.getElementById("compare-hint");
          const compareModal = document.getElementById("compare-modal");
          const compareResults = document.getElementById("compare-results");

          function setCompareMode(on) {
            compareMode = on;
            compareModeBtn.classList.toggle("active", on);
            compareModeBtn.setAttribute("aria-pressed", on);
            document.body.classList.toggle("compare-mode", on);
            compareBar.style.display = on ? "flex" : "none";
            compareHint.hidden = !on;
            if (!on) {
              compareList = [];
              document.querySelectorAll(".selected-compare").forEach(function(el) { el.classList.remove("selected-compare"); });
            }
            updateCompareBar();
          }

          function updateCompareBar() {
            compareSlot1.textContent = compareList[0] ? compareList[0].name : "Pick a Pokémon";
            compareSlot1.classList.toggle("filled", compareList.length > 0);
            if (compareList.length === 1) {
              // Mirror the first pick as a faded hint: pressing Go now compares
              // the Pokémon with itself (to pit its forms against each other).
              compareSlot2.textContent = compareList[0].name;
              compareSlot2.classList.add("compare-slot-mirror");
            } else {
              compareSlot2.textContent = compareList[1] ? compareList[1].name : "Pick another";
              compareSlot2.classList.remove("compare-slot-mirror");
            }
            compareSlot2.classList.toggle("filled", compareList.length > 1);
            compareBtn.disabled = compareList.length === 0;
          }

          compareModeBtn.addEventListener("click", function() { setCompareMode(!compareMode); });
          document.getElementById("clear-compare-btn").addEventListener("click", function() { setCompareMode(false); });

          cards.forEach(function(card) {
            card.addEventListener("click", function(e) {
              if (!compareMode) {
                sessionStorage.setItem("indexScroll", String(window.scrollY));
                return;
              }
              e.preventDefault();
              const id = this.dataset.id;
              const name = this.dataset.name;
              const existing = compareList.findIndex(function(p) { return p.id === id; });
              if (existing !== -1) {
                // Clicking an already-selected Pokémon deselects it.
                compareList.splice(existing, 1);
                this.classList.remove("selected-compare");
              } else if (compareList.length < 2) {
                compareList.push({ id: id, name: name });
                this.classList.add("selected-compare");
              }
              updateCompareBar();
            });
          });

          function openCompareModal() {
            compareModal.style.display = "flex";
            document.body.classList.add("no-scroll");
          }

          function closeCompareModal() {
            if (compareModal.style.display === "none") return;
            compareModal.style.display = "none";
            document.body.classList.remove("no-scroll");
            compareModal.querySelectorAll("audio").forEach(function(audio) { audio.pause(); });
          }

          document.querySelector(".close-modal").addEventListener("click", closeCompareModal);
          compareModal.addEventListener("click", function(e) {
            if (e.target === compareModal) closeCompareModal();
          });
          compareResults.addEventListener("click", function(e) {
            const button = e.target.closest("[data-audio]");
            if (!button) return;
            const audio = document.getElementById(button.dataset.audio);
            audio.currentTime = 0;
            audio.play();
          });

          document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
              closeFilters();
              closeCompareModal();
              return;
            }
            const tag = document.activeElement ? document.activeElement.tagName : "";
            if (e.key === "/" && !/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) {
              e.preventDefault();
              searchInput.focus();
            }
          });

          function titleCase(text) {
            return text.split("-").map(function(word) { return word.charAt(0).toUpperCase() + word.slice(1); }).join(" ");
          }

          function formatFormName(name, baseName) {
            if (name === baseName) return titleCase(baseName);
            return titleCase(name.startsWith(baseName + "-") ? name.slice(baseName.length + 1) : name);
          }

          function pokemonLabel(pokemon, species) {
            const entry = species.names.find(function(n) { return n.language.name === "en"; });
            const base = entry ? entry.name : titleCase(species.name);
            const isDefault = species.varieties.some(function(v) { return v.is_default && v.pokemon.name === pokemon.name; });
            return isDefault ? base : base + " (" + formatFormName(pokemon.name, species.name) + ")";
          }

          function typesOf(pokemon) {
            return pokemon.types.map(function(t) { return t.type.name; });
          }

          function artworkOf(pokemon) {
            return pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default;
          }

          function typeTags(types) {
            return types.map(function(t) { return '<span class="tag ' + t + '">' + t + '</span>'; }).join("");
          }

          function buildFormSelect(varieties, baseName, selectId, currentName) {
            if (varieties.length <= 1) return "";
            const options = varieties.map(function(v) {
              return '<option value="' + v.pokemon.url + '"' + (v.pokemon.name === currentName ? " selected" : "") + ">" + formatFormName(v.pokemon.name, baseName) + "</option>";
            }).join("");
            return '<div class="select-wrap"><select id="' + selectId + '" aria-label="Form">' + options + "</select></div>";
          }

          function buildSide(pokemon, species, side) {
            const cry = (pokemon.cries && pokemon.cries.latest) || "";
            return '<div class="compare-pokemon" id="compare-side-' + side + '" style="--tc: var(--type-' + typesOf(pokemon)[0] + ')">' +
              '<div class="compare-art"><img id="compare-img-' + side + '" src="' + artworkOf(pokemon) + '" alt=""></div>' +
              '<h3 id="compare-name-' + side + '">' + pokemonLabel(pokemon, species) + "</h3>" +
              '<div class="compare-types" id="compare-types-' + side + '">' + typeTags(typesOf(pokemon)) + "</div>" +
              buildFormSelect(species.varieties, species.name, "compare-form-" + side, pokemon.name) +
              (cry ? '<div class="compare-cry"><audio id="compare-cry-' + side + '" src="' + cry + '"></audio><button type="button" class="cry-button" data-audio="compare-cry-' + side + '">' + VOLUME_ICON + "<span>Cry</span></button></div>" : "") +
              "</div>";
          }

          function compareRow(label, v1, v2, max, extraClass) {
            const w1 = v1 >= v2 ? " win" : "";
            const w2 = v2 >= v1 ? " win" : "";
            const pct = function(v) { return Math.min(100, Math.round(v / max * 100)); };
            return '<div class="cmp-row' + extraClass + '">' +
              '<span class="cmp-val' + w1 + '">' + v1 + "</span>" +
              '<div class="cmp-bar cmp-left' + w1 + '"><i style="width: ' + pct(v1) + '%"></i></div>' +
              '<span class="cmp-label">' + label + "</span>" +
              '<div class="cmp-bar cmp-right' + w2 + '"><i style="width: ' + pct(v2) + '%"></i></div>' +
              '<span class="cmp-val' + w2 + '">' + v2 + "</span>" +
              "</div>";
          }

          function buildCompareStats(p1, p2) {
            const stats1 = p1.stats.reduce(function(acc, s) { acc[s.stat.name] = s.base_stat; return acc; }, {});
            const stats2 = p2.stats.reduce(function(acc, s) { acc[s.stat.name] = s.base_stat; return acc; }, {});
            let total1 = 0;
            let total2 = 0;
            const rows = STAT_NAMES.map(function(stat) {
              const v1 = stats1[stat] || 0;
              const v2 = stats2[stat] || 0;
              total1 += v1;
              total2 += v2;
              return compareRow(STAT_LABELS[stat], v1, v2, 255, "");
            });
            rows.push(compareRow("Total", total1, total2, Math.max(800, total1, total2), " cmp-total"));
            return rows.join("");
          }

          compareBtn.addEventListener("click", async function() {
            if (compareList.length < 1) return;
            // With a single Pokémon selected, compare it against itself so its
            // forms can be pitted against each other via the per-side selectors.
            const id1 = compareList[0].id;
            const id2 = (compareList[1] || compareList[0]).id;
            compareResults.innerHTML = '<p class="compare-loading">Loading…</p>';
            openCompareModal();

            let pokemon1, pokemon2, species1, species2;
            try {
              [pokemon1, pokemon2] = await Promise.all([
                fetch("https://pokeapi.co/api/v2/pokemon/" + id1).then(function(r) { return r.json(); }),
                fetch("https://pokeapi.co/api/v2/pokemon/" + id2).then(function(r) { return r.json(); }),
              ]);
              // Fetch species from each Pokémon's own species.url so form ids
              // (which have no pokemon-species/{id} endpoint) resolve correctly.
              [species1, species2] = await Promise.all([
                fetch(pokemon1.species.url).then(function(r) { return r.json(); }),
                fetch(pokemon2.species.url).then(function(r) { return r.json(); }),
              ]);
            } catch (err) {
              compareResults.innerHTML = '<p class="compare-loading">Could not load the comparison. Check your connection and try again.</p>';
              return;
            }

            const current = { 1: pokemon1, 2: pokemon2 };
            const species = { 1: species1, 2: species2 };
            compareResults.innerHTML =
              '<div class="compare-header">' + buildSide(pokemon1, species1, 1) + '<div class="vs">VS</div>' + buildSide(pokemon2, species2, 2) + "</div>" +
              '<div class="compare-stats" id="compare-stats"></div>';

            function updateStats() {
              const stats = document.getElementById("compare-stats");
              stats.style.setProperty("--c1", "var(--type-" + typesOf(current[1])[0] + ")");
              stats.style.setProperty("--c2", "var(--type-" + typesOf(current[2])[0] + ")");
              stats.innerHTML = buildCompareStats(current[1], current[2]);
            }
            updateStats();

            [1, 2].forEach(function(side) {
              const select = document.getElementById("compare-form-" + side);
              if (!select) return;
              select.addEventListener("change", async function() {
                const pokemon = await fetch(this.value).then(function(r) { return r.json(); });
                current[side] = pokemon;
                document.getElementById("compare-img-" + side).src = artworkOf(pokemon);
                document.getElementById("compare-name-" + side).textContent = pokemonLabel(pokemon, species[side]);
                document.getElementById("compare-types-" + side).innerHTML = typeTags(typesOf(pokemon));
                document.getElementById("compare-side-" + side).style.setProperty("--tc", "var(--type-" + typesOf(pokemon)[0] + ")");
                const cryEl = document.getElementById("compare-cry-" + side);
                if (cryEl && pokemon.cries && pokemon.cries.latest) cryEl.src = pokemon.cries.latest;
                updateStats();
              });
            });
          });

          loadFilters();
          filterPokemons();
          const savedScroll = sessionStorage.getItem("indexScroll");
          if (savedScroll !== null) {
            sessionStorage.removeItem("indexScroll");
            window.scrollTo(0, Number(savedScroll));
          }
        });
      </script>
    </body>
  </html>`;
  }

  function renderPokemonDetail(pokemon: PokemonDetails, totalPokemons: number): string {
    const types = typeTags((pokemon.types || []).map(type => type.toLowerCase()));
    const dexNo = String(pokemon.id).padStart(4, '0');
    const matchups = renderMatchups(pokemon);
    const notes = abilityNotes(pokemon.abilities);
    const heightInMeters = (pokemon.height / 10).toFixed(1) + " m";
    const weightInKilograms = (pokemon.weight / 10).toFixed(1) + " kg";
    const prevId = pokemon.id > 1 ? pokemon.id - 1 : totalPokemons;
    const nextId = pokemon.id < totalPokemons ? pokemon.id + 1 : 1;
    const prevFile = `${String(prevId).padStart(4, '0')}_details.html`;
    const nextFile = `${String(nextId).padStart(4, '0')}_details.html`;
    
    const bst = pokemon.stats.reduce((sum, stat) => sum + stat.value, 0);
    
    const getGenderDisplay = (genderRate: number): string => {
      if (genderRate === -1) return '<span class="gender-icon genderless">Genderless</span>';
      const femalePercent = (genderRate / 8) * 100;
      const malePercent = 100 - femalePercent;
      const pct = (n: number) => n.toFixed(1).replace(/\.0$/, '') + '%';
      return `<div class="gender-bar" role="img" aria-label="${pct(malePercent)} male, ${pct(femalePercent)} female"><span class="male" style="width: ${malePercent}%;"></span><span class="female" style="width: ${femalePercent}%;"></span></div>
              <div class="gender-legend"><span class="gender-icon male">♂ ${pct(malePercent)}</span><span class="gender-icon female">♀ ${pct(femalePercent)}</span></div>`;
    };

    const habitatDisplay = pokemon.habitat !== 'unknown'
      ? pokemon.habitat.charAt(0).toUpperCase() + pokemon.habitat.slice(1).replace(/-/g, ' ')
      : 'Unknown';

    const generationDisplay = pokemon.generation !== 'unknown'
      ? 'Gen ' + pokemon.generation.replace('generation-', '').toUpperCase()
      : 'Unknown';
    
    const evoNodeAnchor = (evo: any): string => {
      // Gender branches share one dex id (Basculegion male + female), so only
      // the default-form node is highlighted on load; the client re-targets the
      // selected gender by data-hash.
      const isCurrentSpecies = evo.id === pokemon.id;
      return `
        <a href="${String(evo.id).padStart(4, '0')}_details.html${evo.hash ? `#${evo.hash}` : ''}" data-hash="${evo.hash || ''}" class="evo-step ${isCurrentSpecies && !evo.hash ? 'current' : ''}" ${isCurrentSpecies ? 'data-base="1"' : ''}>
          ${evo.hasForms ? `<span class="evo-forms-badge" title="Has other forms"${isCurrentSpecies ? ' style="display:none;"' : ''}>+</span>` : ''}
          <img src="${evo.imageUrl}" data-default-img="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png" alt="${evo.name}" />
          <span>${evo.name}</span>
        </a>`;
    };

    const battleSuffix = (formName: string): string =>
      formName.startsWith(pokemon.codename + '-') ? formName.slice(pokemon.codename.length + 1) : formName.split('-').slice(1).join('-');
    const evoBattleStep = (b: any): string => `
        <button type="button" class="evo-battle-step" data-url="https://pokeapi.co/api/v2/pokemon/${b.id}/" data-form="${battleSuffix(b.formName)}">
          <img src="${b.imageUrl}" alt="${b.name}" loading="lazy" />
          <span>${b.name}</span>
        </button>`;

    // A node's outgoing links: its evolutions ("→") and battle-only
    // transformations ("↔"). With more than one they stack as branches, so a
    // battle form reads as an alternative, not the next stage.
    const renderEvolutionStep = (evo: any, isFirst: boolean = false): string => {
      let html = '';
      if (!isFirst && (evo.triggerDetails || evo.regionLabel || evo.genderLabel)) {
        const capRegion = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const parts: string[] = [];
        if (evo.triggerDetails) parts.push(evo.triggerDetails);
        if (evo.regionLabel) parts.push(`in ${capRegion(evo.regionLabel)}`);
        if (evo.genderLabel) parts.push(evo.genderLabel);
        html += `<div class="evo-arrow">${icon('arrowRight')}<span class="evo-trigger">${parts.join('<br>')}</span></div>`;
      }
      html += evoNodeAnchor(evo);

      const evos = evo.evolvesTo || [];
      const battles = evo.battleForms || [];
      // A battle-only branch: "↔" plus the transformation trigger (mega stone,
      // ability…) underneath, mirroring the "→" + trigger of an evolution.
      const battleArrow = (b: any) =>
        `<div class="evo-arrow evo-arrow-bi">${icon('arrowLeftRight')}${b.trigger ? `<span class="evo-trigger">${b.trigger}</span>` : ''}</div>`;

      // Single evolution, no battle form → keep the chain in one line.
      if (evos.length === 1 && battles.length === 0) {
        html += renderEvolutionStep(evos[0], false);
        return html;
      }
      // A single battle form (terminal node) → inline "↔" + trigger + form.
      if (evos.length === 0 && battles.length === 1) {
        html += battleArrow(battles[0]) + evoBattleStep(battles[0]);
        return html;
      }
      // Multiple outgoing links → stack them: evolutions with "→", battle forms
      // with "↔", each with its own trigger note.
      if (evos.length + battles.length > 1) {
        html += `<div class="evo-branch">`;
        html += evos.map((nextEvo: any) => `
            <div class="evo-branch-row">${renderEvolutionStep(nextEvo, false)}</div>`).join('');
        html += battles.map((b: any) => `
            <div class="evo-branch-row">${battleArrow(b)}${evoBattleStep(b)}</div>`).join('');
        html += `</div>`;
      }
      return html;
    };
    
    // The chain "key" a form belongs to: its region token (galar…), else its
    // suffix relative to the species codename (own-tempo…), else 'default'.
    // Mirrors the client-side chainKeyOf so form selection swaps to its row.
    const keyOfForm = (formName: string, codename: string): string => {
      const suffix = formName.startsWith(codename + '-') ? formName.slice(codename.length + 1) : '';
      if (!suffix) return 'default';
      // Gender variants share the default chain (shown as branches, not a line).
      if (suffix === 'male' || suffix === 'female') return 'default';
      const segs = suffix.split('-');
      // Regional only when a region token LEADS the suffix (meowth-galar), not
      // when it appears later (raticate-totem-alola is a Totem form, not Alola).
      // Ash's Pikachu caps are named after regions but are never regional.
      if (!segs.includes('cap') && REGION_TOKENS.includes(segs[0])) return segs[0];
      return suffix;
    };
    // Which chain a path belongs to: its base form's region (Own Tempo Rockruff →
    // Dusk Lycanroc, Galarian Meowth → Perrserker), else the evolved form's region;
    // a plain evolution with no form data stays on the default line.
    const pathRegion = (p: any, codename: string): string => {
      if (p.baseForm) {
        const k = keyOfForm(p.baseForm, codename);
        if (k !== 'default') return k;
      }
      if (p.evolvedForm) {
        const er = regionOf(p.evolvedForm);
        if (er !== 'default') return er;
      }
      return 'default';
    };
    const variantForRegion = (node: any, region: string): any =>
      node.variants.find((v: any) => keyOfForm(v.formName, node.codename) === region) || node.variants.find((v: any) => v.formName === node.defaultFormName);
    const variantByForm = (node: any, formName: string): any =>
      node.variants.find((v: any) => v.formName === formName);
    const isGenderForm = (formName: string, codename: string): boolean => {
      const suffix = formName.startsWith(codename + '-') ? formName.slice(codename.length + 1) : '';
      return suffix === 'male' || suffix === 'female';
    };
    // Target variant(s) when evolved_form is unspecified: the region's (or
    // default) variety; or, if the target splits by gender (Basculin →
    // Basculegion male/female), the default plus its gender siblings.
    const unspecifiedTargets = (node: any, region: string): any[] => {
      if ((node.variants || []).some((v: any) => isGenderForm(v.formName, node.codename))) {
        return node.variants.filter((v: any) =>
          v.formName === node.defaultFormName || isGenderForm(v.formName, node.codename));
      }
      const one = variantForRegion(node, region);
      return one ? [one] : [];
    };

    // Resolve the raw tree into a concrete chain for a region, as renderEvolutionStep
    // expects. Each distinct evolved form in the region becomes its own branch;
    // region forms drop out of the regions they don't apply to.
    const resolveRegion = (node: any, region: string, displayVariant: any, triggerDetails: string, chainRegions: Set<string>, extraVisible: Set<string> = new Set()): any => {
      const evolvesTo: any[] = [];
      let evolvingForm: string | null = null;  // form of THIS node an included path says evolves
      for (const edge of node.children) {
        const seen = new Map<string, { trigger: string; regionLabel: string }>();  // evolvedForm ('' = unspecified) → info
        for (const p of edge.paths) {
          const pr = pathRegion(p, node.codename);
          // A regional evolution whose region has no chain of its own (the base
          // species lacks that regional form, e.g. Pikachu → Alolan Raichu) is
          // shown on the default chain, tagged with the region under the arrow.
          const orphanRegional = region === 'default' && pr !== 'default' && !chainRegions.has(pr);
          if (pr !== region && !orphanRegional) continue;
          // base_form names which form of THIS node actually evolves (only
          // White-Striped Basculin → Basculegion); remember it so the node is
          // shown as that form even when reached from a descendant's chain.
          if (p.baseForm && p.baseForm !== node.defaultFormName && variantByForm(node, p.baseForm)) evolvingForm = p.baseForm;
          // A granular evolved form with no variety of its own collapses to the default
          // target. The value-less trigger is used only when the base form doesn't pick the
          // result (Alcremie); a form-preserving line sets baseForm and keeps its exact trigger.
          const matched = p.evolvedForm && variantByForm(edge.node, p.evolvedForm);
          const key = matched ? p.evolvedForm : '';
          const trig = (p.evolvedForm && !matched && !p.baseForm) ? p.genericTrigger : p.trigger;
          // Only tag a real region under the arrow ("in Alola"). When several methods reach
          // the same form, keep the most recent generation's (higher version group),
          // e.g. Eevee → Leafeon: Leaf Stone over Moss Rock.
          if (!seen.has(key) || p.vg > seen.get(key).vg) seen.set(key, { trigger: trig, vg: p.vg, regionLabel: orphanRegional && REGION_TOKENS.includes(pr) ? pr : '' });
        }
        // All target variants shown for this edge (plus their battle forms), so a shown
        // sibling isn't badged "+" for a form already visible, whether siblings come from
        // one branch (Basculegion ♂/♀) or several (Toxel → Amped/Low-Key Toxtricity).
        const edgeVisible = new Set<string>();
        for (const [ef] of seen) {
          const cvs = (ef ? [variantByForm(edge.node, ef)] : unspecifiedTargets(edge.node, region)).filter(Boolean);
          for (const cv of cvs) {
            edgeVisible.add(cv.formName);
            for (const b of (edge.node.battleForms || [])) if (b.baseForms.includes(cv.formName)) edgeVisible.add(b.formName);
          }
        }
        for (const [evolvedForm, info] of seen) {
          const childVariants = (evolvedForm ? [variantByForm(edge.node, evolvedForm)] : unspecifiedTargets(edge.node, region)).filter(Boolean);
          for (const childVariant of childVariants) {
            const child = resolveRegion(edge.node, region, childVariant, info.trigger, chainRegions, edgeVisible);
            child.regionLabel = info.regionLabel;
            // Gender-split targets (Basculin → male/female Basculegion) carry no
            // gender on the evolution itself, so tag each branch by its form.
            if (childVariants.length > 1) {
              const suffix = childVariant.formName.startsWith(edge.node.codename + '-') ? childVariant.formName.slice(edge.node.codename.length + 1) : '';
              child.genderLabel = suffix === 'female' ? 'Female' : 'Male';
            }
            evolvesTo.push(child);
          }
        }
      }
      // Show this node as the form that actually evolves when it's otherwise
      // displayed as its default (Basculegion's chain roots at White-Striped
      // Basculin, not the default Red-Striped).
      if (evolvingForm && displayVariant.formName === node.defaultFormName) {
        displayVariant = variantByForm(node, evolvingForm) || displayVariant;
      }
      const battleForms = (node.battleForms || [])
        .filter((b: any) => b.baseForms.includes(displayVariant.formName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      // A persistent form pair (Minior meteor ↔ core) links to its counterpart
      // regardless of is_battle_only.
      if (displayVariant.transform) battleForms.push(displayVariant.transform);
      // Badge this node if its species has a variety not visible in this chain (the
      // shown variant, its "↔" battle forms, gender siblings alongside). The renderer
      // hides it on the current Pokémon, whose forms sit in the Forms list.
      const visible = new Set([displayVariant.formName, ...battleForms.map((b: any) => b.formName), ...extraVisible]);
      const hasForms = (node.allFormNames || []).some((n: string) => !visible.has(n));
      // Suffix (relative to this node's species codename) so the link can carry
      // the exact form and the target page opens in it; '' for the default form.
      const hash = displayVariant.formName === node.defaultFormName
        ? ''
        : (displayVariant.formName.startsWith(node.codename + '-') ? displayVariant.formName.slice(node.codename.length + 1) : displayVariant.formName.split('-').slice(1).join('-'));
      return { id: node.speciesId, name: displayVariant.name, imageUrl: displayVariant.imageUrl, hasForms, hash, triggerDetails, evolvesTo, battleForms };
    };
    const renderRegionChain = (region: string, chainRegions: Set<string>): string => {
      if (!pokemon.evolutionChain) return '<p class="no-evolution">This Pokémon does not evolve.</p>';
      const root = resolveRegion(pokemon.evolutionChain, region, variantForRegion(pokemon.evolutionChain, region), '', chainRegions);
      // Render whenever there's something to show: an evolution or a battle-only
      // transformation hanging off the root (e.g. Zygarde ↔ Mega, no evolution).
      return root.evolvesTo.length === 0 && root.battleForms.length === 0
        ? '<p class="no-evolution">This Pokémon does not evolve.</p>'
        : renderEvolutionStep(root, true);
    };

    // A plain cosmetic form (Gimmighoul Roaming) shares only an *unrestricted*
    // species evolution: a base_form on the path keeps caps a dead end. Rooted at
    // this species, so an upstream stage (Pichu → Pikachu) never leaks in.
    const resolveCosmetic = (node: any, displayVariant: any, chainRegions: Set<string>): any => {
      const evolvesTo: any[] = [];
      for (const edge of node.children) {
        const seen = new Map<string, string>();  // evolvedForm ('' = unspecified) → trigger
        const seenVg = new Map<string, number>();  // and its version group, to keep the newest
        for (const p of edge.paths) {
          if (p.baseForm) continue;  // restricted evolution: doesn't apply to this form
          // A granular evolved form with no variety of its own (Alcremie's
          // per-sweet forms) collapses to the default target with a value-less trigger.
          const matched = p.evolvedForm && variantByForm(edge.node, p.evolvedForm);
          const key = matched ? p.evolvedForm : '';
          const trig = (p.evolvedForm && !matched) ? p.genericTrigger : p.trigger;
          if (!seen.has(key) || p.vg > (seenVg.get(key) || 0)) { seen.set(key, trig); seenVg.set(key, p.vg); }
        }
        for (const [evolvedForm, trigger] of seen) {
          const childVariant = evolvedForm ? variantByForm(edge.node, evolvedForm) : variantForRegion(edge.node, 'default');
          if (!childVariant) continue;
          evolvesTo.push(resolveRegion(edge.node, 'default', childVariant, trigger, chainRegions));
        }
      }
      const battleForms = (node.battleForms || [])
        .filter((b: any) => b.baseForms.includes(displayVariant.formName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      if (displayVariant.transform) battleForms.push(displayVariant.transform);
      const visible = new Set([displayVariant.formName, ...battleForms.map((b: any) => b.formName)]);
      const hasForms = (node.allFormNames || []).some((n: string) => !visible.has(n));
      const hash = displayVariant.formName === node.defaultFormName
        ? ''
        : (displayVariant.formName.startsWith(node.codename + '-') ? displayVariant.formName.slice(node.codename.length + 1) : displayVariant.formName.split('-').slice(1).join('-'));
      return { id: node.speciesId, name: displayVariant.name, imageUrl: displayVariant.imageUrl, hasForms, hash, triggerDetails: '', evolvesTo, battleForms };
    };

    // One chain per region the current species actually has a form for, read
    // straight from the (data-derived) evolution tree, so no region list to
    // maintain. The default is shown first and loadForm() swaps to the others.
    const findEvoNode = (node: any, id: number): any => {
      if (!node) return null;
      if (node.speciesId === id) return node;
      for (const e of node.children) {
        const found = findEvoNode(e.node, id);
        if (found) return found;
      }
      return null;
    };
    const currentEvoNode = findEvoNode(pokemon.evolutionChain, pokemon.id);

    // Battle-only forms move out of the Forms list into the chain; regional
    // variants (incl. default) already have their own region chains.
    const battleOnlyNames: Set<string> = new Set(currentEvoNode ? currentEvoNode.battleForms.map((b: any) => b.formName) : []);
    // Base forms already covered by a region chain (default + regional variants);
    // any other base form of a battle-only transform (e.g. Battle Bond, Power
    // Construct) gets its own standalone chain instead.
    const regionalFormNames: string[] = currentEvoNode
      ? currentEvoNode.variants.filter((v: any) => v.region !== 'default' || v.formName === currentEvoNode.defaultFormName).map((v: any) => v.formName)
      : [];

    // A special base form (Greninja Battle Bond, Zygarde Power Construct, Minior
    // core) is a non-default, non-regional form hosting a battle-only transform; it
    // gets its own row. Gender forms are excluded (already branches on the default chain).
    const specialBaseForms: string[] = [];
    if (currentEvoNode) {
      const seen = new Set<string>();
      for (const b of currentEvoNode.battleForms) {
        for (const bf of b.baseForms) {
          if (!regionalFormNames.includes(bf) && !isGenderForm(bf, currentEvoNode.codename) && !seen.has(bf)) { seen.add(bf); specialBaseForms.push(bf); }
        }
      }
    }

    // Region rows cover the default form and other variants EXCEPT ones rendered
    // elsewhere: the default form itself and special base forms (own rows below).
    // Emitting them here would duplicate rows (or, mid-chain, make an empty one).
    const defaultKey = currentEvoNode ? keyOfForm(currentEvoNode.defaultFormName, currentEvoNode.codename) : 'default';
    const specialBaseKeys = new Set<string>(specialBaseForms.map((bf) => keyOfForm(bf, currentEvoNode.codename)));

    // Every region key some path in the chain actually resolves to (regional
    // forms, and form-locked lines like Own Tempo Rockruff → Dusk Lycanroc). A
    // variant whose key is NOT here has no chain of its own.
    const pathRegionsInChain = new Set<string>();
    const collectPathRegions = (node: any) => {
      for (const edge of node.children) {
        for (const p of edge.paths) pathRegionsInChain.add(pathRegion(p, node.codename));
        collectPathRegions(edge.node);
      }
    };
    if (pokemon.evolutionChain) collectPathRegions(pokemon.evolutionChain);

    // Regions that earn their own chain: every node's non-battle variants, plus
    // regional-token branches that are a separate species (Meowth's galar → Perrserker).
    // Cosmetic form keys (Flabébé colours, Vivillon patterns) stay one chain.
    const chainRegions = new Set<string>(['default']);
    const collectRegionKeys = (node: any) => {
      if (!node) return;
      for (const v of node.variants) chainRegions.add(keyOfForm(v.formName, node.codename));
      for (const e of node.children) collectRegionKeys(e.node);
    };
    collectRegionKeys(pokemon.evolutionChain);
    for (const r of pathRegionsInChain) if (REGION_TOKENS.includes(r)) chainRegions.add(r);

    // Whether the current species appears in a region's resolved chain, so its
    // page shows only the branch(es) it belongs to (Persian: default+alola;
    // Perrserker: galar; Meowth: all three).
    const speciesInRegion = (region: string): boolean => {
      if (!pokemon.evolutionChain) return false;
      const root = resolveRegion(pokemon.evolutionChain, region, variantForRegion(pokemon.evolutionChain, region), '', chainRegions);
      const walk = (n: any): boolean => n.id === pokemon.id || (n.evolvesTo || []).some(walk);
      return walk(root);
    };
    // A non-default region earns a row only if it's a real branch (a path resolves
    // to it, or the current species has a variant there), so target-only forms
    // like Toxtricity's amped/low-key don't spawn empty rows.
    const currentVariantKeys = new Set<string>(
      currentEvoNode ? currentEvoNode.variants.map((v: any) => keyOfForm(v.formName, currentEvoNode.codename)) : []
    );
    const rest = Array.from(chainRegions).filter((r) =>
      r !== 'default' && r !== defaultKey && !specialBaseKeys.has(r)
      && (pathRegionsInChain.has(r) || currentVariantKeys.has(r)));
    const evoRegionsAll = ['default', ...rest].filter(speciesInRegion);
    const evoRegions: string[] = evoRegionsAll.length ? evoRegionsAll : ['default'];

    // A non-regional key with no path of its own (Gimmighoul Roaming): its
    // region row would be empty, so resolveCosmetic handles it instead.
    const cosmeticInheritRegion = (region: string): boolean =>
      region !== 'default' && !REGION_TOKENS.includes(region) && !pathRegionsInChain.has(region);
    const regionRowsHtml = evoRegions.map(region => {
      const cosmeticVar = cosmeticInheritRegion(region) && currentEvoNode
        ? currentEvoNode.variants.find((v: any) => keyOfForm(v.formName, currentEvoNode.codename) === region)
        : null;
      let body: string;
      if (cosmeticVar) {
        const root = resolveCosmetic(currentEvoNode, cosmeticVar, chainRegions);
        body = root.evolvesTo.length === 0 && root.battleForms.length === 0
          ? '<p class="no-evolution">This Pokémon does not evolve.</p>'
          : renderEvolutionStep(root, true);
      } else {
        body = renderRegionChain(region, chainRegions);
      }
      // Open on the first relevant region ('default', else e.g. 'galar' for
      // Perrserker); the rest start hidden and the client swaps on selection.
      return `<div class="evo-row" data-region="${region}"${region === evoRegions[0] ? '' : ' style="display:none;"'}>${body}</div>`;
    }).join('\n');

    // Chain-building helpers shared below.
    const evoSuffixOf = (name: string): string =>
      name.startsWith(pokemon.codename + '-') ? name.slice(pokemon.codename.length + 1) : name.split('-').slice(1).join('-');
    const evoTitleCase = (s: string): string => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const evoArtwork = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

    const varietyIdByName: { [k: string]: number } = {};
    for (const v of pokemon.varieties) varietyIdByName[v.name] = parseInt(v.url.split('/').filter(Boolean).pop() as string);
    const specialRowsHtml = specialBaseForms.map((baseFormName: string) => {
      const attached = currentEvoNode.battleForms
        .filter((b: any) => b.baseForms.includes(baseFormName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      const root = {
        id: pokemon.id,
        name: `${pokemon.name} (${evoTitleCase(evoSuffixOf(baseFormName))})`,
        imageUrl: evoArtwork(varietyIdByName[baseFormName]),
        hasForms: false,
        // The node's own anchor links here (#suffix) so you can return to this
        // base form from its battle-only form; without it the link drops the
        // hash and lands on the default form.
        hash: evoSuffixOf(baseFormName),
        region: evoSuffixOf(baseFormName),
        triggerDetails: '',
        evolvesTo: [],
        battleForms: attached,
      };
      return `<div class="evo-row" data-region="${evoSuffixOf(baseFormName)}" style="display:none;">${renderEvolutionStep(root, true)}</div>`;
    }).join('\n');

    const evolutionRowsHtml = regionRowsHtml + '\n' + specialRowsHtml;

    // The Forms list keeps default + regional + special forms, but not battle-only
    // nor gender-difference forms (those show as gender branches in the chain). A
    // suffix→URL map still lets the chain's Male/Female links switch to them.
    const isGenderVariety = (name: string): boolean => {
      const s = evoSuffixOf(name);
      return s === 'male' || s === 'female';
    };
    const clusterVarieties = pokemon.varieties.filter(v => !battleOnlyNames.has(v.name) && !isGenderVariety(v.name));
    const genderFormUrls: { [suffix: string]: string } = {};
    for (const v of pokemon.varieties) {
      if (!v.is_default && !battleOnlyNames.has(v.name) && isGenderVariety(v.name)) genderFormUrls[evoSuffixOf(v.name)] = v.url;
    }

    // Label a form the way the evolution chain does (official name for regional
    // forms, e.g. "Alolan Persian"), reusing the names already resolved there.
    const evoVariantNames: { [formName: string]: string } = {};
    if (currentEvoNode) for (const v of currentEvoNode.variants) evoVariantNames[v.formName] = v.name;
    const formLabel = (v: any): string => {
      if (v.name === pokemon.codename) return pokemon.name;
      if (evoVariantNames[v.name]) return evoVariantNames[v.name];
      const formPart = v.name.startsWith(pokemon.codename + '-') ? v.name.slice(pokemon.codename.length + 1) : v.name;
      return formPart.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    };

    const abilitiesTableRows = pokemon.abilities
      .map(ability => {
        const hiddenTag = ability.is_hidden ? `<span class="hidden-ability">Hidden</span>` : '';
        return `
          <div class="ability">
            <div class="ability-name">${titleCase(ability.name)}${hiddenTag}</div>
            <p class="ability-desc">${ability.description}</p>
          </div>`;
      })
      .join('\n');

    const formOptions = clusterVarieties.map(v =>
      `<option value="${v.url}" ${v.is_default ? 'selected' : ''}>${formLabel(v)}</option>`
    ).join('\n');

    // Clickable form squares shown below the evolution chain (battle-only forms
    // are excluded, since they live in the chain). The artwork URL is built straight
    // from the variety id (no extra fetch needed).
    const formSquares = clusterVarieties.length > 1 ? `
          <div class="forms-cluster">
            <span class="forms-label">Forms</span>
            <div class="forms-list">
              ${clusterVarieties.map(v => {
                const formId = v.url.split('/').filter(Boolean).pop();
                const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${formId}.png`;
                const label = formLabel(v);
                return `<button type="button" class="form-step ${v.is_default ? 'active' : ''}" data-url="${v.url}" data-region="${evoSuffixOf(v.name)}">
                  <img src="${artwork}" data-default-img="${pokemon.officialArtworkUrl}" alt="${label}" loading="lazy" />
                  <span>${label}</span>
                </button>`;
              }).join('')}
            </div>
          </div>` : '';

    const getStatBar = (value: number, maxValue: number) => {
      const percentage = Math.min(100, Math.round((value / maxValue) * 100));
      return `<div class="stat-bar"><div class="stat-value" style="width: ${percentage}%; background-color: ${statColor(value)};"></div></div>`;
    };

    const getCatchRateBar = (captureRate: number) => {
      const percentage = Math.round((captureRate / 255) * 100);
      let backgroundColor;
      if (percentage >= 50) {
        backgroundColor = '#22c55e';
      } else if (percentage >= 25) {
        backgroundColor = '#f59e0b';
      } else {
        backgroundColor = '#ef4444';
      }
      return `
        <div class="catch-rate-display">
          <div class="catch-bar">
            <div class="catch-value" style="width: ${percentage}%; background-color: ${backgroundColor};"></div>
          </div>
          <span class="catch-percent">${percentage}%</span>
        </div>
      `;
    };

    const statsTableRows = pokemon.stats
      .map(stat => `
        <tr>
          <th scope="row">${STAT_LABELS[stat.name] || titleCase(stat.name)}</th>
          <td class="stat-num">${stat.value}</td>
          <td class="stat-bar-cell">${getStatBar(stat.value, 255)}</td>
        </tr>`)
      .join('\n');

    const descriptionsSelect = pokemon.pokedexDescriptions
      .map(description => `
        <option value="${description.version}">${titleCase(description.version)}</option>`)
      .join('\n');
  
    const descriptionsRows = pokemon.pokedexDescriptions
      .map((description, index) => `
        <p class="description" data-version='${description.version}' style="${index !== 0 ? 'display: none;' : ''}">${description.flavor_text}</p>`)
      .join('\n');
    
    return `<!DOCTYPE html>
    <html lang="en">
      ${head(`${pokemon.name} #${dexNo} · PokeQuickDex`)}
      <body>
        <header class="topbar">
          <div class="topbar-inner">
            <a href="index.html" class="icon-btn back-to-menu" title="Back to the Pokédex" aria-label="Back to the Pokédex">${icon('arrowLeft')}</a>
            <a href="index.html" class="brand">${BRAND}</a>
            <div class="topbar-actions">
              <span id="filter-counter" class="filter-counter"></span>
              <nav class="topbar-nav" aria-label="Previous and next Pokémon">
                <a id="prev-btn" href="${prevFile}" class="icon-btn nav-button" data-default-prev="${prevFile}" title="Previous Pokémon (←)" aria-label="Previous Pokémon">${icon('chevronLeft')}</a>
                <a id="next-btn" href="${nextFile}" class="icon-btn nav-button" data-default-next="${nextFile}" title="Next Pokémon (→)" aria-label="Next Pokémon">${icon('chevronRight')}</a>
              </nav>
              ${THEME_TOGGLE}
            </div>
          </div>
        </header>
        <main class="detail">
          <section id="hero" class="hero" style="${typeVars(pokemon.types)}">
            <div class="hero-inner">
              <div class="hero-head">
                <div class="hero-kicker"><span class="dex-no">#${dexNo}</span><span class="hero-gen">${generationDisplay}</span></div>
                <h1 id="pokemon-title-name">${pokemon.name}</h1>
                <p class="pokemon-genus">${pokemon.genus}</p>
                <div class="hero-types" id="pokemon-types">${types}</div>
              </div>
              <div class="hero-art">
                <img id="pokemon-artwork" src="${pokemon.officialArtworkUrl}" alt="${pokemon.name}" data-normal="${pokemon.officialArtworkUrl}" data-shiny="${pokemon.officialArtworkShinyUrl}" data-animated="${pokemon.animatedSpriteUrl}" />
              </div>
              <div class="hero-actions">${clusterVarieties.length > 1 ? `
                <div class="form-picker">
                  <label for="form-select">Form</label>
                  <div class="select-wrap"><select id="form-select">
                    ${formOptions}
                  </select></div>
                </div>` : ''}
                <div class="image-controls">
                  <button id="shiny-toggle" type="button" class="hero-btn shiny-toggle" title="Toggle shiny"${pokemon.officialArtworkShinyUrl ? '' : ' style="display:none;"'}>${icon('sparkles')}<span>Shiny</span></button>
                  ${pokemon.animatedSpriteUrl ? `<button id="animated-toggle" type="button" class="hero-btn animated-toggle" title="Toggle animated sprite">${icon('play')}<span>Animated</span></button>` : ''}
                  ${pokemon.cryUrl ? `<button id="cry-button" type="button" class="hero-btn cry-button" title="Play cry">${icon('volume')}<span>Cry</span></button>` : ''}
                </div>
                ${pokemon.cryUrl ? `<audio id="pokemon-cry" src="${pokemon.cryUrl}"></audio>` : ''}
              </div>
            </div>
          </section>
          <div class="detail-body">
            <div class="card-row">
              <section class="card matchups">
                <div class="card-head">
                  <h2 class="card-title">Type matchups</h2>
                  <span class="card-hint">Damage taken when attacked</span>
                </div>
                <div class="matchups-list" id="type-defenses">${matchups}</div>
                <ul class="ability-notes" id="ability-notes">${notes}</ul>
              </section>
              <section class="card">
                <div class="card-head"><h2 class="card-title">Base stats</h2></div>
                <table class="stats-table">
                  <tbody id="stats-body">
                  ${statsTableRows}
                  </tbody>
                  <tfoot>
                    <tr class="bst-row">
                      <th scope="row">Total</th>
                      <td class="stat-num bst-value" id="pokemon-bst">${bst}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            </div>
            <section class="card">
              <div class="card-head"><h2 class="card-title">Evolution</h2></div>
              <div class="evolution-chain">
                ${evolutionRowsHtml}
                ${formSquares}
              </div>
            </section>
            <div class="card-row">
              <section class="card">
                <div class="card-head"><h2 class="card-title">Abilities</h2></div>
                <div class="ability-list" id="abilities-body">
                ${abilitiesTableRows}
                </div>
              </section>
              <section class="card profile">
                <div class="card-head"><h2 class="card-title">Profile</h2></div>
                <div class="profile-grid">
                  <dl class="info-list">
                    <div class="info-row"><dt>Height</dt><dd id="pokemon-height">${heightInMeters}</dd></div>
                    <div class="info-row"><dt>Weight</dt><dd id="pokemon-weight">${weightInKilograms}</dd></div>
                    <div class="info-row info-gender"><dt>Gender</dt><dd>${getGenderDisplay(pokemon.genderRate)}</dd></div>
                    <div class="info-row" id="detail-habitat"><dt>Habitat</dt><dd>${habitatDisplay}</dd></div>
                  </dl>
                  <dl class="info-list" id="detail-training">
                    <div class="info-row" id="detail-catch-rate"><dt title="Higher = easier to catch">Catch rate</dt><dd>${getCatchRateBar(pokemon.captureRate)}</dd></div>
                    <div class="info-row" id="detail-base-happiness"><dt>Base happiness</dt><dd>${pokemon.baseHappiness}</dd></div>
                    <div class="info-row" id="detail-growth-rate"><dt>Growth rate</dt><dd>${titleCase(pokemon.growthRate)}</dd></div>
                    <div class="info-row" id="detail-egg-groups"><dt>Egg groups</dt><dd>${pokemon.eggGroups.map(titleCase).join(', ') || '—'}</dd></div>
                  </dl>
                </div>
              </section>
            </div>
            <section class="card entries" id="pokedex-section"${pokemon.pokedexDescriptions.length === 0 ? ' style="display:none;"' : ''}>
              <div class="card-head">
                <h2 class="card-title">Pokédex entries</h2>
                <div class="select-wrap"><select id="version-select" aria-label="Game version">
                  ${descriptionsSelect}
                </select></div>
              </div>
              <div class="description-container">
                ${descriptionsRows}
              </div>
            </section>
          </div>
        </main>
        ${SITE_FOOTER}
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            document.getElementById("dark-mode-toggle").addEventListener("click", function() {
              const isDark = document.documentElement.classList.toggle("dark-mode");
              localStorage.setItem("darkMode", isDark);
            });

            // Filtered navigation: walk every visible card's link (species and
            // forms), locating the current view by this page's file plus form hash.
            // Not in the set: default Pokédex-order arrows. Lone result: none.
            const filteredNav = JSON.parse(sessionStorage.getItem("filteredPokemonNav") || "[]");
            const prevBtn = document.getElementById("prev-btn");
            const nextBtn = document.getElementById("next-btn");
            const filterCounter = document.getElementById("filter-counter");
            const baseFile = "${String(pokemon.id).padStart(4, '0')}_details.html";
            function updateFilteredNav() {
              const idx = filteredNav.indexOf(baseFile + location.hash);
              if (idx === -1) {
                prevBtn.href = prevBtn.dataset.defaultPrev;
                nextBtn.href = nextBtn.dataset.defaultNext;
                prevBtn.style.visibility = "";
                nextBtn.style.visibility = "";
                filterCounter.textContent = "";
                return;
              }
              filterCounter.textContent = filteredNav.length > 1 ? (idx + 1) + "/" + filteredNav.length : "";
              if (idx > 0) { prevBtn.href = filteredNav[idx - 1]; prevBtn.style.visibility = ""; }
              else { prevBtn.style.visibility = "hidden"; }
              if (idx < filteredNav.length - 1) { nextBtn.href = filteredNav[idx + 1]; nextBtn.style.visibility = ""; }
              else { nextBtn.style.visibility = "hidden"; }
            }
            updateFilteredNav();
            window.addEventListener("hashchange", updateFilteredNav);
            document.addEventListener("keydown", function(e) {
              const tag = document.activeElement ? document.activeElement.tagName : "";
              if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
              if (e.key === "ArrowLeft" && prevBtn.style.visibility !== "hidden") location.href = prevBtn.href;
              if (e.key === "ArrowRight" && nextBtn.style.visibility !== "hidden") location.href = nextBtn.href;
            });

            // Shiny toggle
            const shinyToggle = document.getElementById("shiny-toggle");
            const pokemonArtwork = document.getElementById("pokemon-artwork");
            let isShiny = false;
            let isAnimated = false;
            
            shinyToggle.addEventListener("click", function() {
              isShiny = !isShiny;
              isAnimated = false;
              const animatedToggle = document.getElementById("animated-toggle");
              if (animatedToggle) animatedToggle.classList.remove("active");
              pokemonArtwork.src = isShiny ? pokemonArtwork.dataset.shiny : pokemonArtwork.dataset.normal;
              shinyToggle.classList.toggle("active", isShiny);
            });

            // Animated toggle
            const animatedToggle = document.getElementById("animated-toggle");
            if (animatedToggle) {
              animatedToggle.addEventListener("click", function() {
                isAnimated = !isAnimated;
                isShiny = false;
                shinyToggle.classList.remove("active");
                pokemonArtwork.src = isAnimated ? pokemonArtwork.dataset.animated : pokemonArtwork.dataset.normal;
                animatedToggle.classList.toggle("active", isAnimated);
              });
            }

            // Cry button
            const cryButton = document.getElementById("cry-button");
            const pokemonCry = document.getElementById("pokemon-cry");
            if (cryButton && pokemonCry) {
              cryButton.addEventListener("click", function() {
                pokemonCry.currentTime = 0;
                pokemonCry.play();
              });
            }

            // Version filter
            function filterVersions() {
              const selectedVersion = document.getElementById("version-select").value;
              const dexDescriptions = document.querySelectorAll(".description");
              for (const dexDescription of dexDescriptions) {
                const version = dexDescription.dataset.version;
                if (selectedVersion === version) {
                  dexDescription.style.display = "block";
                } else {
                  dexDescription.style.display = "none";
                }
              }
            }
            document.getElementById("version-select").addEventListener("change", filterVersions);

            // Rebuild the Pokédex Description section for a set of entries. A
            // non-default form shows its own entries (empty -> section hidden);
            // the default form shows the species' (SPECIES_DESCRIPTIONS).
            function cleanFlavorText(t) {
              return String(t).replace(/\\s+/g, ' ').trim();
            }
            function renderDescriptions(descs) {
              const section = document.getElementById("pokedex-section");
              const select = document.getElementById("version-select");
              const container = document.querySelector(".description-container");
              if (!section || !select || !container) return;
              if (!descs || descs.length === 0) { section.style.display = "none"; return; }
              section.style.display = "";
              const cap = function(s) { return s.split('-').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); };
              select.innerHTML = descs.map(function(d) { return '<option value="' + d.version + '">' + cap(d.version) + '</option>'; }).join('');
              container.innerHTML = descs.map(function(d, i) { return '<p class="description" data-version="' + d.version + '"' + (i !== 0 ? ' style="display:none;"' : '') + '>' + cleanFlavorText(d.flavor_text) + '</p>'; }).join('');
            }

            // Form selector: the dropdown and the clickable form squares are two
            // views of the same control, kept in sync through selectForm().
            const formSelect = document.getElementById("form-select");
            const formSteps = Array.prototype.slice.call(document.querySelectorAll(".form-step"));
            function markActiveForm(url) {
              formSteps.forEach(function(s) { s.classList.toggle("active", s.dataset.url === url); });
            }
            async function selectForm(url) {
              if (formSelect) formSelect.value = url;
              markActiveForm(url);
              await loadForm(url);
            }
            if (formSelect) {
              formSelect.addEventListener("change", function() { selectForm(this.value); });
            }
            formSteps.forEach(function(step) {
              step.addEventListener("click", function() { selectForm(this.dataset.url); });
            });
            // Battle-only forms live inside the chain; clicking switches the view
            // to that form but keeps the current chain (you're already in it).
            Array.prototype.slice.call(document.querySelectorAll(".evo-battle-step")).forEach(function(step) {
              // Route through the URL hash so switching away and back (e.g. to the
              // base form, whose chain node is a #hash link) always fires, and so
              // battle-only forms are linkable/refresh-safe.
              step.addEventListener("click", function() { location.hash = this.dataset.form; });
            });

            // Form selection is driven by the URL hash so it survives refresh and is linkable,
            // and lets you switch to a battle-only form and back. Empty hash = default; a
            // form-step's region key = base/regional/special; a battle step's data-form = battle-only.
            const BASE_URL = "https://pokeapi.co/api/v2/pokemon/${pokemon.id}/";
            // Gender forms aren't in the Forms list, so they have no form-step to
            // resolve their hash; this maps their suffix to a URL instead.
            const GENDER_FORM_URLS = ${JSON.stringify(genderFormUrls)};
            function applyHash() {
              const hashForm = location.hash.slice(1);
              if (!hashForm) { selectForm(BASE_URL); return; }
              const step = formSteps.filter(function(s) { return s.dataset.region === hashForm; })[0];
              if (step) { selectForm(step.dataset.url); return; }
              if (GENDER_FORM_URLS[hashForm]) { selectForm(GENDER_FORM_URLS[hashForm]); return; }
              const battle = Array.prototype.slice.call(document.querySelectorAll(".evo-battle-step"))
                .filter(function(s) { return s.dataset.form === hashForm; })[0];
              if (battle) {
                // Reveal the chain the battle form lives in, then switch to it.
                const row = battle.closest(".evo-row");
                if (row) {
                  Array.prototype.slice.call(document.querySelectorAll(".evo-row")).forEach(function(r) { r.style.display = "none"; });
                  row.style.display = "";
                }
                loadForm(battle.dataset.url, false);
              }
            }
            window.addEventListener("hashchange", applyHash);
            // On first load act only if a form was requested; an empty hash is the
            // default form, which the page is already rendered as.
            if (location.hash.slice(1)) applyHash();

            function getStatBarHtml(value, maxValue) {
              const percentage = Math.min(100, Math.round((value / maxValue) * 100));
              const backgroundColor = value < 50 ? '#f34444' : value < 80 ? '#ff7f0f' : value < 100 ? '#ffdd57' : value < 120 ? '#a0e515' : value < 150 ? '#23cd5e' : '#00c2b8';
              return \`<div class="stat-bar"><div class="stat-value" style="width: \${percentage}%; background-color: \${backgroundColor};"></div></div>\`;
            }

            async function getTypeWeaknesses(types) {
              const allTypes = ${JSON.stringify(ALL_TYPES)};
              const multipliers = {};
              for (const type of types) {
                const res = await fetch(\`https://pokeapi.co/api/v2/type/\${type}\`);
                const data = await res.json();
                data.damage_relations.double_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 2; });
                data.damage_relations.half_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 0.5; });
                data.damage_relations.no_damage_from.forEach(t => { multipliers[t.name] = 0; });
              }
              const result = { superWeakTo: [], weakTo: [], normal: [], resistantTo: [], superResistantTo: [], immuneTo: [] };
              for (const type of allTypes) {
                const m = multipliers[type];
                if (m === 0) result.immuneTo.push(type);
                else if (m === 4) result.superWeakTo.push(type);
                else if (m === 2) result.weakTo.push(type);
                else if (m === 0.5) result.resistantTo.push(type);
                else if (m === 0.25) result.superResistantTo.push(type);
                else result.normal.push(type);
              }
              return result;
            }

            function renderTags(types) {
              return types.map(t => \`<span class="tag \${t}">\${t}</span>\`).join('');
            }

            function renderDefenses(w) {
              const chip = (type, mult, extraClass) => \`<span class="tag mu-chip \${type}\${extraClass || ''}">\${type}<b class="mu-x">\${mult}</b></span>\`;
              const group = (key, label, chips) => \`<div class="mu-group mu-\${key}"><div class="mu-label">\${label}</div><div class="mu-chips">\${chips || '<span class="mu-none">None</span>'}</div></div>\`;
              const weak = w.superWeakTo.map(t => chip(t, '4×', ' x4')).join('') + w.weakTo.map(t => chip(t, '2×')).join('');
              const resist = w.superResistantTo.map(t => chip(t, '¼×')).join('') + w.resistantTo.map(t => chip(t, '½×')).join('');
              const immune = w.immuneTo.map(t => chip(t, '0×')).join('');
              return group('weak', 'Weak to', weak) + group('resist', 'Resists', resist) + (immune ? group('immune', 'Immune to', immune) : '');
            }

            const ABILITY_MATCHUPS = ${JSON.stringify(ABILITY_MATCHUPS)};
            function renderAbilityNotes(abilities) {
              return abilities.filter(a => ABILITY_MATCHUPS[a.ability.name]).map(a => {
                const name = a.ability.name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<li><span><b>\${name}</b>\${a.is_hidden ? ' <span class="note-hidden">(hidden ability)</span>' : ''}: \${ABILITY_MATCHUPS[a.ability.name]}.</span></li>\`;
              }).join('');
            }

            const BASE_NAME = ${JSON.stringify(pokemon.name)};
            const BASE_CODENAME = ${JSON.stringify(pokemon.codename)};
            const DEFAULT_IMG = ${JSON.stringify(pokemon.officialArtworkUrl)};
            // Species-level Pokédex entries (shown for the default form; a form's
            // own entries, when it has any, replace these; see loadForm).
            const SPECIES_DESCRIPTIONS = ${JSON.stringify(pokemon.pokedexDescriptions)};
            const REGION_TOKENS = ${JSON.stringify(REGION_TOKENS)};
            // Which evolution-chain row a form belongs to (mirrors server-side keyOfForm):
            // a leading region token keys a regional chain (meowth-galar), else the full
            // suffix (Battle Bond, Totem…), else default. Caps and later tokens don't count.
            function chainKeyOf(formName) {
              const suffix = formName.indexOf(BASE_CODENAME + "-") === 0 ? formName.slice(BASE_CODENAME.length + 1) : "";
              if (!suffix) return "default";
              if (suffix === "male" || suffix === "female") return "default";
              const segs = suffix.split("-");
              if (segs.indexOf("cap") < 0 && REGION_TOKENS.indexOf(segs[0]) >= 0) return segs[0];
              return suffix;
            }
            function formTitle(formCodename) {
              if (formCodename === BASE_CODENAME) return BASE_NAME;
              const part = formCodename.startsWith(BASE_CODENAME + '-') ? formCodename.slice(BASE_CODENAME.length + 1) : formCodename;
              const formLabel = part.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
              return BASE_NAME + ' (' + formLabel + ')';
            }

            async function loadForm(url, swapChain) {
              if (swapChain === undefined) swapChain = true;
              const res = await fetch(url);
              const data = await res.json();

              // Artwork: official artwork -> Dream World -> game sprite -> the
              // default form's image (some variants have no image of their own).
              const dreamUrl = data.sprites.other['dream_world'] && data.sprites.other['dream_world'].front_default;
              const normalUrl = data.sprites.other['official-artwork'].front_default || dreamUrl || data.sprites.front_default || DEFAULT_IMG;
              // Shiny official artwork, else the shiny sprite; empty = no shiny.
              const shinyUrl = data.sprites.other['official-artwork'].front_shiny || data.sprites.front_shiny || '';
              const animatedUrl = data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || '';
              const artwork = document.getElementById("pokemon-artwork");
              artwork.src = normalUrl;
              artwork.dataset.normal = normalUrl;
              artwork.dataset.shiny = shinyUrl;
              artwork.dataset.animated = animatedUrl;
              isShiny = false;
              isAnimated = false;
              const shinyToggleBtn = document.getElementById("shiny-toggle");
              // Hide the Shiny toggle for forms with no shiny artwork/sprite.
              if (shinyToggleBtn) { shinyToggleBtn.classList.remove("active"); shinyToggleBtn.style.display = shinyUrl ? "" : "none"; }

              // Title
              const titleEl = document.getElementById("pokemon-title-name");
              if (titleEl) titleEl.textContent = formTitle(data.name);

              // Animated sprite toggle availability
              let animBtn = document.getElementById("animated-toggle");
              if (animatedUrl) {
                if (!animBtn) {
                  const imageControls = document.querySelector(".image-controls");
                  animBtn = document.createElement("button");
                  animBtn.id = "animated-toggle";
                  animBtn.type = "button";
                  animBtn.className = "hero-btn animated-toggle";
                  animBtn.title = "Toggle animated sprite";
                  animBtn.innerHTML = ${JSON.stringify(icon('play') + '<span>Animated</span>')};
                  const cryBtnRef = document.getElementById("cry-button");
                  if (cryBtnRef) imageControls.insertBefore(animBtn, cryBtnRef);
                  else imageControls.appendChild(animBtn);
                  animBtn.addEventListener("click", function() {
                    isAnimated = !isAnimated;
                    isShiny = false;
                    shinyToggle.classList.remove("active");
                    pokemonArtwork.src = isAnimated ? pokemonArtwork.dataset.animated : pokemonArtwork.dataset.normal;
                    animBtn.classList.toggle("active", isAnimated);
                  });
                }
                animBtn.classList.remove("active");
                animBtn.style.display = "";
              } else if (animBtn) {
                animBtn.style.display = "none";
              }

              // Cry
              const formCry = data.cries?.latest || '';
              const existingCryAudio = document.getElementById("pokemon-cry");
              const existingCryBtn = document.getElementById("cry-button");
              if (existingCryAudio) {
                // Base form already wired up the audio + listener; just swap the source.
                if (formCry) {
                  existingCryAudio.src = formCry;
                  if (existingCryBtn) existingCryBtn.style.display = "";
                } else {
                  existingCryAudio.removeAttribute("src");
                  if (existingCryBtn) existingCryBtn.style.display = "none";
                }
              } else if (formCry) {
                // Base form had no cry; create the elements on the fly.
                const imageControls = document.querySelector(".image-controls");
                const newAudio = document.createElement("audio");
                newAudio.id = "pokemon-cry";
                newAudio.src = formCry;
                imageControls.parentNode.appendChild(newAudio);
                const newBtn = document.createElement("button");
                newBtn.id = "cry-button";
                newBtn.type = "button";
                newBtn.className = "hero-btn cry-button";
                newBtn.title = "Play cry";
                newBtn.innerHTML = ${JSON.stringify(icon('volume') + '<span>Cry</span>')};
                newBtn.addEventListener("click", function() { newAudio.currentTime = 0; newAudio.play(); });
                imageControls.appendChild(newBtn);
              }

              // Height / weight
              document.getElementById("pokemon-height").textContent = (data.height / 10).toFixed(1) + " m";
              document.getElementById("pokemon-weight").textContent = (data.weight / 10).toFixed(1) + " kg";

              // Types
              const types = data.types.map(t => t.type.name);
              document.getElementById("pokemon-types").innerHTML = renderTags(types);
              const hero = document.getElementById("hero");
              hero.style.setProperty("--tc", "var(--type-" + types[0] + ", #9fa19f)");
              hero.style.setProperty("--tc2", "var(--type-" + (types[1] || types[0]) + ", #9fa19f)");
              hero.style.setProperty("--tink", "var(--ink-" + types[0] + ", #16181d)");

              // Type weaknesses
              const weaknesses = await getTypeWeaknesses(types);
              document.getElementById("type-defenses").innerHTML = renderDefenses(weaknesses);

              // Abilities
              const abilitiesHtml = await Promise.all(data.abilities.map(async a => {
                const aRes = await fetch(a.ability.url);
                const aData = await aRes.json();
                const entry = aData.effect_entries.find(e => e.language.name === 'en');
                const description = entry ? entry.effect : 'No description available';
                const hiddenTag = a.is_hidden ? '<span class="hidden-ability">Hidden</span>' : '';
                const name = a.ability.name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<div class="ability"><div class="ability-name">\${name}\${hiddenTag}</div><p class="ability-desc">\${description}</p></div>\`;
              }));
              document.getElementById("abilities-body").innerHTML = abilitiesHtml.join('');
              document.getElementById("ability-notes").innerHTML = renderAbilityNotes(data.abilities);

              // Stats
              const stats = data.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));
              const bst = stats.reduce((sum, s) => sum + s.value, 0);
              const statLabels = ${JSON.stringify(STAT_LABELS)};
              document.getElementById("stats-body").innerHTML = stats.map(s => {
                const label = statLabels[s.name] || s.name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<tr><th scope="row">\${label}</th><td class="stat-num">\${s.value}</td><td class="stat-bar-cell">\${getStatBarHtml(s.value, 255)}</td></tr>\`;
              }).join('');
              document.getElementById("pokemon-bst").textContent = bst;

              // Species-level details don't apply to battle-only forms (Mega/Gmax):
              // they can't be caught or bred, so hide those rows for such forms.
              let isBattleOnly = false;
              let formData = null;
              try {
                const formRes = await fetch(data.forms[0].url);
                formData = await formRes.json();
                isBattleOnly = !!formData.is_battle_only;
              } catch (e) { /* keep rows visible if the form lookup fails */ }
              // Pokédex entries: the default form shows the species' entries; a
              // non-default form shows only its own (reusing formData, already
              // fetched above), and the section is hidden when it has none.
              if (data.is_default) {
                renderDescriptions(SPECIES_DESCRIPTIONS);
              } else {
                const formEntries = ((formData && formData.flavor_text_entries) || [])
                  .filter(function(e) { return e.language && e.language.name === 'en'; })
                  .map(function(e) { return { version: e.version.name, flavor_text: e.flavor_text }; });
                renderDescriptions(formEntries);
              }
              ["detail-catch-rate", "detail-habitat", "detail-egg-groups", "detail-base-happiness", "detail-growth-rate", "detail-training"].forEach(id => {
                const row = document.getElementById(id);
                if (row) row.style.display = isBattleOnly ? "none" : "";
              });
              // The Forms list picks base/regional forms; hide it while viewing a
              // battle-only transformation (it's reached from the chain, not here).
              const formsCluster = document.querySelector(".forms-cluster");
              if (formsCluster) formsCluster.style.display = isBattleOnly ? "none" : "";

              // Swap to the evolution chain matching this form (primary selection only; a
              // battle-only click keeps the current chain). Regional → its region chain,
              // special (Battle Bond, Power Construct) → its own, the rest → default.
              if (swapChain) {
                const key = chainKeyOf(data.name);
                const rows = Array.prototype.slice.call(document.querySelectorAll(".evo-row"));
                const target = rows.filter(r => r.dataset.region === key)[0]
                  || rows.filter(r => r.dataset.region === "default")[0] || rows[0];
                rows.forEach(r => { r.style.display = "none"; });
                if (target) target.style.display = "";
              }

              // Move the "current" highlight to the form now shown: its battle
              // step if this is a battle-only form, otherwise the base node.
              const visibleRow = Array.prototype.slice.call(document.querySelectorAll(".evo-row")).filter(r => r.style.display !== "none")[0];
              if (visibleRow) {
                Array.prototype.slice.call(visibleRow.querySelectorAll(".current")).forEach(el => el.classList.remove("current"));
                const battle = visibleRow.querySelector('.evo-battle-step[data-url="' + url + '"]');
                // Highlight the current species' node by hash, scoped to
                // data-base="1" so a same-hash node of another species (Alolan
                // Meowth vs Alolan Persian, both #alola) isn't grabbed instead.
                const suffix = data.name.indexOf(BASE_CODENAME + "-") === 0 ? data.name.slice(BASE_CODENAME.length + 1) : "";
                const formNode = suffix ? visibleRow.querySelector('.evo-step[data-base="1"][data-hash="' + suffix + '"]') : null;
                const base = formNode || visibleRow.querySelector('.evo-step[data-base="1"]');
                if (battle) battle.classList.add("current");
                else if (base) base.classList.add("current");
                // The base node's "+" is hidden while its forms are reachable in
                // the Forms list; show it once that list is hidden (battle-only
                // view), since its other forms are no longer visible anywhere.
                const baseBadge = base && base.querySelector(".evo-forms-badge");
                if (baseBadge) baseBadge.style.display = isBattleOnly ? "" : "none";
              }
            }
          });
        </script>
      </body>
    </html>`;
  }  

function head(title: string): string {
  return `
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='47' fill='%23f0f0f0' stroke='%23333' stroke-width='6'/><path d='M3 50 A47 47 0 0 1 97 50' fill='%23ee1515'/><rect x='0' y='46' width='100' height='8' fill='%23333'/><circle cx='50' cy='50' r='12' fill='%23fff' stroke='%23333' stroke-width='6'/><circle cx='50' cy='50' r='5' fill='%23333'/></svg>">
  <title>${title}</title>${sharedHead()}
  <link rel="stylesheet" href="css/pokemon_styles.css">
  <link rel="stylesheet" href="css/types.css">
  <script defer src="/_vercel/insights/script.js"></script>
  <script>
    // On image error, retry the official artwork a few times (transient github
    // hiccups) before falling back to Dream World, then the sprite. In <head>,
    // capture phase, to catch images that load before the main scripts run.
    document.addEventListener('error', function (ev) {
      var img = ev.target;
      if (!img || img.tagName !== 'IMG') return;
      var src = img.src.split('?')[0];
      if (src.indexOf('/other/official-artwork/') !== -1) {
        // Retry official artwork a few times (transient github hiccups), then step down.
        var tries = +(img.getAttribute('data-oa-retry') || 0);
        if (tries < 3) {
          img.setAttribute('data-oa-retry', tries + 1);
          setTimeout(function () { img.src = src + '?r=' + (tries + 1); }, 300 * (tries + 1));
        } else if (src.indexOf('/official-artwork/shiny/') !== -1) {
          img.src = src.replace('/other/official-artwork/', '/');            // shiny: no Dream World, go to shiny sprite
        } else {
          img.src = src.replace('/other/official-artwork/', '/other/dream-world/').replace(/\\.png$/, '.svg');  // -> Dream World
        }
      } else if (src.indexOf('/other/dream-world/') !== -1) {
        img.src = src.replace('/other/dream-world/', '/').replace(/\\.svg$/, '.png');   // -> game sprite
      } else {
        var di = img.getAttribute('data-default-img');                       // sprite failed too -> the default form's image
        if (di && di !== src) { img.removeAttribute('data-default-img'); img.setAttribute('data-oa-retry', 0); img.src = di; }
      }
    }, true);
  </script>
</head>`;
}

async function generateSite() {
  // Region tokens and the type list are fetched from the API up front so the
  // rendered pages (and the injected client-side lists) don't hardcode them.
  await Promise.all([ensureRegionsLoaded(), ensureTypesLoaded()]);
  const pokemons = await loadPokemons(1025);
  const indexHtml = renderPokemonIndex(pokemons);
  await writeFile("index.html", indexHtml);

  await mapWithConcurrency(pokemons, 10, async (pokemon) => {
    const pokemonDetail = await loadPokemonDetails(pokemon.id);
    if (!pokemonDetail) {
      console.warn(`Failed to load details for Pokémon with ID ${pokemon.id}.`);
      return;
    }
    const detailHtml = renderPokemonDetail(pokemonDetail, 1025);
    await writeFile(`${String(pokemonDetail.id).padStart(4, '0')}_details.html`, detailHtml);
  });
}

export { renderPokemonIndex, renderPokemonDetail, generateSite };

// Only run the full build when invoked directly (`npx tsx main.ts`), so the
// render functions can be imported for testing without triggering a build.
// `process` is read off globalThis so this needs no @types/node to type-check.
const entryPath = (globalThis as any).process?.argv?.[1];
if (entryPath && import.meta.url === `file://${entryPath}`) {
  generateSite();
}
