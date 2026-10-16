import type { Pokemon } from "../pokemon";
import type { Meta, PageData, Variety } from "../shared/model";
import { detailFile, dexNo, escapeHtml, searchKey, typeTags, typeVars } from "../shared/format";
import { icon } from "../shared/icons";
import { getLang, regionName, t } from "../shared/i18n";
import { BRAND, asset, donateWidget, languageSwitch, pageHead, siteFooter, themeToggle } from "./components";

const GENERATION_REGIONS: [string, string, string][] = [
  ['generation-i', 'I', 'kanto'],
  ['generation-ii', 'II', 'johto'],
  ['generation-iii', 'III', 'hoenn'],
  ['generation-iv', 'IV', 'sinnoh'],
  ['generation-v', 'V', 'unova'],
  ['generation-vi', 'VI', 'kalos'],
  ['generation-vii', 'VII', 'alola'],
  ['generation-viii', 'VIII', 'galar'],
  ['generation-ix', 'IX', 'paldea'],
];

const gamesMask = (meta: Meta, variety: Variety | undefined): number =>
  meta.games.reduce((mask, g, i) => (variety?.games.includes(g.key) ? mask | (1 << i) : mask), 0);

// Search matches the page's names and, where a name differs, the English one
// too (Great Tusk is Colmilargo in Spanish).
const searchKeys = (...names: string[]): string => Array.from(new Set(names.map(searchKey))).join(' ');

export function renderPokemonIndex(pokemons: Pokemon[], pages: Map<number, PageData>, meta: Meta, types: string[]): string {
  const english = getLang() === 'en';
  const pokemonCard = (href: string, dex: string, name: string, cardTypes: string[], imageUrl: string, dataAttrs: string, extraClass: string = '', defaultImg: string = ''): string => `
        <a class="pokemon-card${extraClass}" href="${href}" ${dataAttrs} style="${typeVars(cardTypes)}">
          <div class="card-art">
            <span class="pokemon-id">#${dex}</span>
            <img src="${imageUrl}"${defaultImg ? ` data-default-img="${defaultImg}"` : ''} alt="" loading="lazy" decoding="async" crossorigin="anonymous" width="96" height="96" />
          </div>
          <div class="card-body">
            <h2>${escapeHtml(name)}</h2>
            <div class="card-types">${typeTags(cardTypes)}</div>
          </div>
        </a>`;
  const pokemonLinks = pokemons.map((pokemon) => {
    const dex = dexNo(pokemon.id);
    const page = pages.get(pokemon.id);
    const base = page?.varieties[0];
    const name = page?.name || pokemon.name;
    const tags = `data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' data-dex='${pokemon.id}'`;
    const baseCard = `
      <li>${pokemonCard(detailFile(pokemon.id), dex, name, pokemon.types, pokemon.imageUrl,
        `data-types='${JSON.stringify(pokemon.types)}' ${tags} data-generation='${pokemon.generation}' data-id='${pokemon.id}' data-name="${escapeHtml(name)}" data-variety="${base?.name || pokemon.codename}" data-games="${gamesMask(meta, base)}" data-search="${searchKeys(name, pokemon.name)}"`)}
      </li>`;
    // Form cards share the species' dex number/tags but carry the form's own
    // types, and link to the detail page with a #hash so it opens in that form.
    // Hidden until the "All forms" toggle is on.
    const formCards = pokemon.forms.map((form) => {
      const variety = page?.varieties.find(v => v.hash === form.suffix);
      const formName = english ? form.name : variety?.label || form.name;
      return `
      <li style="display: none;">${pokemonCard(`${detailFile(pokemon.id)}#${form.suffix}`, dex, formName, form.types, form.imageUrl,
        `data-types='${JSON.stringify(form.types)}' ${tags} data-generation='${form.generation}' data-id='${form.id}' data-name="${escapeHtml(formName)}" data-variety="${variety?.name || ''}" data-games="${gamesMask(meta, variety)}" data-search="${searchKeys(formName, form.name)}" data-formkind='${form.kind}'`,
        ' form-variant', pokemon.officialArtworkUrl)}
      </li>`;
    }).join('\n');
    return baseCard + formCards;
  }).join('\n');

  const gameOptions = meta.games.map(g => `<option value="${g.key}">${escapeHtml(g.label)}</option>`).join('');
  const typeOptions = types.map(type => `
              <label class="type-option"><input type="radio" name="type" value="${type}">${typeTags([type])}</label>`).join('');
  const generationOptions = GENERATION_REGIONS.map(([value, numeral, region]) => `
              <label class="chip-option"><input type="radio" name="generation" value="${value}"><span><b>${numeral}</b>${regionName(region)}</span></label>`).join('');
  const indexData = {
    total: pokemons.length,
    games: meta.games.map(g => ({ key: g.key, label: g.label })),
    generationLabels: Object.fromEntries(GENERATION_REGIONS.map(([value, numeral, region]) => [value, t('gen.label', { n: numeral, region: regionName(region) })])),
    typeLabels: meta.typeLabels,
  };

  return `<!DOCTYPE html>
  <html lang="${getLang()}">
    ${pageHead({
      title: t('index.metaTitle'),
      description: t('index.metaDescription', { n: pokemons.length }),
      path: '',
      image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      stylesheet: 'styles.css',
      extra: '\n      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5418523060607609" crossorigin="anonymous"></script>',
    })}
    <body>
      <header class="topbar">
        <div class="topbar-inner">
          <a href="index.html" class="brand" aria-label="${t('index.home')}">${BRAND}</a>
          <label class="search">${icon('search')}<input type="search" id="search-input" class="search-input" placeholder="${t('search.placeholder')}" aria-label="${t('search.label')}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" /><kbd>/</kbd></label>
          <div class="topbar-actions">${languageSwitch('index.html')}${themeToggle()}</div>
        </div>
      </header>
      <main class="index">
        <aside id="filters" class="filters" aria-label="${t('filters.title')}">
          <div class="filters-head">
            <h2>${t('filters.title')}</h2>
            <button type="button" id="clear-filters-btn" class="link-btn" hidden>${t('filters.clear')}</button>
            <button type="button" id="filters-close" class="icon-btn filters-close" aria-label="${t('filters.close')}">${icon('close')}</button>
          </div>
          <div class="filters-body">
            <div class="filter-group">
              <label class="filter-legend" for="game-filter">${t('filters.game')}</label>
              <div class="select-wrap game-filter"><select id="game-filter"><option value="">${t('filters.anyGame')}</option>${gameOptions}</select></div>
            </div>
            <fieldset class="filter-group">
              <legend>${t('filters.type')}</legend>
              <div class="type-options">
                <label class="type-option"><input type="radio" name="type" value="" checked><span class="any">${t('filters.allTypes')}</span></label>${typeOptions}
              </div>
            </fieldset>
            <fieldset class="filter-group">
              <legend>${t('filters.generation')}</legend>
              <div class="gen-options">
                <label class="chip-option"><input type="radio" name="generation" value="" checked><span>${t('filters.all')}</span></label>${generationOptions}
              </div>
            </fieldset>
            <fieldset class="filter-group toolbar-tags">
              <legend>${t('filters.category')}</legend>
              <div class="chip-options">
                <label class="chip-option"><input type="checkbox" id="baby-filter"><span>${t('cat.baby')}</span></label>
                <label class="chip-option"><input type="checkbox" id="legendary-filter"><span>${t('cat.legendary')}</span></label>
                <label class="chip-option"><input type="checkbox" id="mythical-filter"><span>${t('cat.mythical')}</span></label>
              </div>
            </fieldset>
            <fieldset class="filter-group toolbar-forms">
              <legend>${t('filters.show')}</legend>
              <div class="chip-options">
                <label class="chip-option"><input type="checkbox" id="species-filter" checked><span>${t('show.species')}</span></label>
                <label class="chip-option"><input type="checkbox" id="regional-filter"><span>${t('show.regional')}</span></label>
                <label class="chip-option"><input type="checkbox" id="battle-filter"><span>${t('show.battle')}</span></label>
                <label class="chip-option"><input type="checkbox" id="other-filter"><span>${t('show.other')}</span></label>
              </div>
            </fieldset>
          </div>
          <div class="filters-foot">
            <button type="button" id="filters-apply" class="btn btn-primary">${t('filters.showResults')}</button>
          </div>
        </aside>
        <div class="sheet-backdrop" id="filters-backdrop"></div>
        <section class="results" aria-label="${t('index.list')}">
          <div class="index-head">
            <div>
              <h1>Pokédex</h1>
              <p class="results-count" id="results-count" aria-live="polite">${t('index.count', { n: pokemons.length })}</p>
            </div>
            <div class="index-actions">
              <button type="button" id="filters-open" class="btn filters-open" aria-controls="filters">${icon('sliders')}<span>${t('filters.title')}</span><span class="badge" id="filters-badge" hidden></span></button>
              <button type="button" id="compare-mode-btn" class="btn compare-mode-btn" aria-pressed="false">${icon('swords')}<span>${t('compare.button')}</span></button>
            </div>
          </div>
          <div class="active-filters" id="active-filters" hidden></div>
          <p class="compare-hint" id="compare-hint" hidden>${t('compare.hint')}</p>
          <ul class="pokemon-grid">${pokemonLinks}</ul>
          <div class="empty-state" id="empty-state" hidden>
            <h2>${t('empty.title')}</h2>
            <p>${t('empty.text')}</p>
            <button type="button" class="btn" id="empty-clear">${t('empty.clear')}</button>
          </div>
        </section>
      </main>
      ${siteFooter()}
      <div id="compare-bar" class="compare-bar" style="display: none;" role="region" aria-label="${t('compare.region')}">
        <div class="compare-slots">
          <span id="compare-pokemon-1" class="compare-slot">${t('compare.pick1')}</span>
          <span class="vs-text">vs</span>
          <span id="compare-pokemon-2" class="compare-slot">${t('compare.pick2')}</span>
        </div>
        <div class="compare-actions">
          <button id="clear-compare-btn" class="btn" type="button">${t('compare.cancel')}</button>
          <button id="compare-btn" class="btn btn-primary" type="button" disabled>${t('compare.button')}</button>
        </div>
      </div>
      <div id="compare-modal" class="compare-modal" style="display: none;">
        <div class="compare-modal-content" role="dialog" aria-modal="true" aria-labelledby="compare-title">
          <div class="compare-modal-head">
            <h2 id="compare-title">${t('compare.button')}</h2>
            <button class="close-modal icon-btn" type="button" aria-label="${t('common.close')}">${icon('close')}</button>
          </div>
          <div id="compare-results" class="compare-results"></div>
        </div>
      </div>
      ${donateWidget()}
      <script type="application/json" id="index-data">${JSON.stringify(indexData)}</script>
      <script type="module" src="${asset('js/index.js')}"></script>
    </body>
  </html>`;
}
