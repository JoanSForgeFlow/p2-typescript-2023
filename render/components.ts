import { ALL_TYPES } from "../types";

export const ICON_PATHS: Record<string, string> = {
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

export function icon(name: string, extraClass: string = ''): string {
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

export const POKEBALL_LOGO = `<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#fff" stroke="#111827" stroke-width="2.5"/><path d="M2 16a14 14 0 0 1 28 0z" fill="#e3350d" stroke="#111827" stroke-width="2.5"/><circle cx="16" cy="16" r="4.5" fill="#fff" stroke="#111827" stroke-width="2.5"/></svg>`;

export const BRAND = `${POKEBALL_LOGO}<span class="brand-name">PokeQuick<span>Dex</span></span>`;

export const THEME_TOGGLE = `<button id="dark-mode-toggle" class="icon-btn theme-toggle" type="button" title="Toggle dark mode" aria-label="Toggle dark mode">${icon('moon', 'icon-moon')}${icon('sun', 'icon-sun')}</button>`;

export const PAYPAL_LOGO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502zm-2.96-5.09c.762.868.983 1.81.752 3.285-.019.123-.04.24-.062.36-.735 3.773-3.089 5.446-6.956 5.446H8.957c-.63 0-1.174.414-1.354 1.002l-.014-.002-.93 5.894H3.121a.051.051 0 0 1-.05-.06l2.598-16.51A.95.95 0 0 1 6.607 2h5.976c2.183 0 3.716.469 4.523 1.388z"/></svg>';

export const HEART = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

export const DONATE_WIDGET = `
      <div id="donate-widget" class="donate-widget">
        <div id="donate-card" class="donate-card" role="dialog" aria-label="Support PokeQuickDex" hidden>
          <button type="button" id="donate-close" class="donate-close" aria-label="Close">${icon('close')}</button>
          <p class="donate-title">Enjoying PokeQuickDex?</p>
          <p class="donate-subtitle">Support the project or send suggestions!</p>
          <a href="https://paypal.me/joansis19" target="_blank" rel="noopener noreferrer" class="donate-paypal-btn">${PAYPAL_LOGO}Support with PayPal</a>
        </div>
        <button type="button" id="donate-fab" class="donate-fab" title="Support this project" aria-label="Support this project" aria-expanded="false" aria-controls="donate-card">${HEART}</button>
      </div>
      <script>
        (function() {
          const widget = document.getElementById("donate-widget");
          const fab = document.getElementById("donate-fab");
          const card = document.getElementById("donate-card");
          function setOpen(open) {
            card.hidden = !open;
            fab.setAttribute("aria-expanded", String(open));
            if (open) fab.classList.remove("pulse");
          }
          if (!sessionStorage.getItem("donateDismissed")) {
            setTimeout(function() { fab.classList.add("pulse"); }, 3000);
          }
          fab.addEventListener("click", function() { setOpen(card.hidden); });
          document.getElementById("donate-close").addEventListener("click", function() {
            setOpen(false);
            sessionStorage.setItem("donateDismissed", "true");
          });
          document.addEventListener("click", function(e) {
            if (!widget.contains(e.target)) setOpen(false);
          });
          document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") setOpen(false);
          });
        })();
      </script>`;

export const SITE_FOOTER = `
      <footer class="site-footer">
        <span>Data from <a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a>.</span>
        <span>Pokémon and its trademarks are © Nintendo, Game Freak and The Pokémon Company.</span>
      </footer>`;

export const typeVars = (types: string[]): string =>
  `--tc: var(--type-${types[0]}, #9fa19f); --tc2: var(--type-${types[1] || types[0]}, #9fa19f); --tink: var(--ink-${types[0]}, #16181d)`;

export const GENERATIONS: [string, string, string][] = [
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

export const searchKey = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

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

export const abilityNotes = (abilities: { name: string; is_hidden: boolean }[]): string =>
  abilities
    .filter(a => ABILITY_MATCHUPS[a.name])
    .map(a => `<li><span><b>${titleCase(a.name)}</b>${a.is_hidden ? ' <span class="note-hidden">(hidden ability)</span>' : ''}: ${ABILITY_MATCHUPS[a.name]}.</span></li>`)
    .join('');

export const renderMatchups = (d: { superWeakTo: string[]; weakTo: string[]; resistantTo: string[]; superResistantTo: string[]; immuneTo: string[] }): string => {
  const chip = (type: string, mult: string, extraClass: string = '') =>
    `<span class="tag mu-chip ${type}${extraClass}">${type}<b class="mu-x">${mult}</b></span>`;
  const group = (key: string, label: string, chips: string) =>
    `<div class="mu-group mu-${key}"><div class="mu-label">${label}</div><div class="mu-chips">${chips || '<span class="mu-none">None</span>'}</div></div>`;
  const weak = d.superWeakTo.map(t => chip(t, '4×', ' x4')).join('') + d.weakTo.map(t => chip(t, '2×')).join('');
  const resist = d.superResistantTo.map(t => chip(t, '¼×')).join('') + d.resistantTo.map(t => chip(t, '½×')).join('');
  const immune = d.immuneTo.map(t => chip(t, '0×')).join('');
  return group('weak', 'Weak to', weak) + group('resist', 'Resists', resist) + (immune ? group('immune', 'Immune to', immune) : '');
};

export const titleCase = (s: string): string =>
  s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

export const statColor = (value: number): string =>
  value < 50 ? '#f34444' : value < 80 ? '#ff7f0f' : value < 100 ? '#ffdd57' : value < 120 ? '#a0e515' : value < 150 ? '#23cd5e' : '#00c2b8';

export const typeTags = (types: string[]): string =>
  types.map(type => `<span class="tag ${type}">${type}</span>`).join('');

export function sharedHead(): string {
  return `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
      <link rel="stylesheet" href="css/base.css">
      <script>
        try { if (localStorage.getItem("darkMode") === "true") document.documentElement.classList.add("dark-mode"); } catch (e) {}
      </script>`;
}

export function head(title: string): string {
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
