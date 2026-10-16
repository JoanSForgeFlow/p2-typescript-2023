import type { Pokemon } from "../pokemon";
import type { Meta, PageData, Variety } from "../shared/model";
import { detailFile, dexNo, searchKey, typeTags, typeVars } from "../shared/format";
import { icon } from "../shared/icons";
import { BRAND, DONATE_WIDGET, SITE_FOOTER, THEME_TOGGLE, asset, pageHead } from "./components";

const GENERATION_REGIONS: [string, string, string][] = [
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

const gamesMask = (meta: Meta, variety: Variety | undefined): number =>
  meta.games.reduce((mask, g, i) => (variety?.games.includes(g.key) ? mask | (1 << i) : mask), 0);

export function renderPokemonIndex(pokemons: Pokemon[], pages: Map<number, PageData>, meta: Meta, types: string[]): string {
  const pokemonCard = (href: string, dex: string, name: string, cardTypes: string[], imageUrl: string, dataAttrs: string, extraClass: string = '', defaultImg: string = ''): string => `
        <a class="pokemon-card${extraClass}" href="${href}" ${dataAttrs} style="${typeVars(cardTypes)}">
          <div class="card-art">
            <span class="pokemon-id">#${dex}</span>
            <img src="${imageUrl}"${defaultImg ? ` data-default-img="${defaultImg}"` : ''} alt="" loading="lazy" decoding="async" crossorigin="anonymous" width="96" height="96" />
          </div>
          <div class="card-body">
            <h2>${name}</h2>
            <div class="card-types">${typeTags(cardTypes)}</div>
          </div>
        </a>`;
  const pokemonLinks = pokemons.map((pokemon) => {
    const dex = dexNo(pokemon.id);
    const page = pages.get(pokemon.id);
    const base = page?.varieties[0];
    const tags = `data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' data-dex='${pokemon.id}'`;
    const baseCard = `
      <li>${pokemonCard(detailFile(pokemon.id), dex, pokemon.name, pokemon.types, pokemon.imageUrl,
        `data-types='${JSON.stringify(pokemon.types)}' ${tags} data-generation='${pokemon.generation}' data-id='${pokemon.id}' data-name="${pokemon.name}" data-variety="${base?.name || pokemon.codename}" data-games="${gamesMask(meta, base)}" data-search="${searchKey(pokemon.name)}"`)}
      </li>`;
    // Form cards share the species' dex number/tags but carry the form's own
    // types, and link to the detail page with a #hash so it opens in that form.
    // Hidden until the "All forms" toggle is on.
    const formCards = pokemon.forms.map((form) => {
      const variety = page?.varieties.find(v => v.hash === form.suffix);
      return `
      <li style="display: none;">${pokemonCard(`${detailFile(pokemon.id)}#${form.suffix}`, dex, form.name, form.types, form.imageUrl,
        `data-types='${JSON.stringify(form.types)}' ${tags} data-generation='${form.generation}' data-id='${form.id}' data-name="${form.name}" data-variety="${variety?.name || ''}" data-games="${gamesMask(meta, variety)}" data-search="${searchKey(form.name)}" data-formkind='${form.kind}'`,
        ' form-variant', pokemon.officialArtworkUrl)}
      </li>`;
    }).join('\n');
    return baseCard + formCards;
  }).join('\n');

  const gameOptions = meta.games.map(g => `<option value="${g.key}">${g.label}</option>`).join('');
  const typeOptions = types.map(type => `
              <label class="type-option"><input type="radio" name="type" value="${type}"><span class="tag ${type}">${type}</span></label>`).join('');
  const generationOptions = GENERATION_REGIONS.map(([value, numeral, region]) => `
              <label class="chip-option"><input type="radio" name="generation" value="${value}"><span><b>${numeral}</b>${region}</span></label>`).join('');
  const indexData = {
    total: pokemons.length,
    games: meta.games.map(g => ({ key: g.key, label: g.label })),
    generationLabels: Object.fromEntries(GENERATION_REGIONS.map(([value, numeral, region]) => [value, `Gen ${numeral} · ${region}`])),
  };

  return `<!DOCTYPE html>
  <html lang="en">
    ${pageHead({
      title: 'PokeQuickDex · Pokédex with type matchups, moves and locations',
      description: `Quick reference for all ${pokemons.length} Pokémon: type weaknesses, stats, moves, evolutions and where to find them in every game.`,
      path: '',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      stylesheet: 'styles.css',
      extra: '\n      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5418523060607609" crossorigin="anonymous"></script>',
    })}
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
            <div class="filter-group">
              <label class="filter-legend" for="game-filter">Game</label>
              <div class="select-wrap game-filter"><select id="game-filter"><option value="">Any game</option>${gameOptions}</select></div>
            </div>
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
      ${DONATE_WIDGET}
      <script type="application/json" id="index-data">${JSON.stringify(indexData)}</script>
      <script type="module" src="${asset('js/index.js')}"></script>
    </body>
  </html>`;
}
