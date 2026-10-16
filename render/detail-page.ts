import type { PokemonDetails } from "../pokemon-detail";
import type { Meta, MoveTable, PageData } from "../shared/model";
import { detailFile, dexNo, escapeHtml, titleCase, typeTags, typeVars } from "../shared/format";
import { icon } from "../shared/icons";
import { defensiveMatchups, typesFor } from "../shared/type-chart";
import {
  catchRateHtml, eggCyclesText, evYield, gameByKey, genderHtml, heightText, renderAbilities, renderAbilityNotes,
  renderDefense, renderEntries, renderEraNote, renderLocations, renderMoves, renderOffense, renderStatsRows,
  statTotal, weightText,
} from "../shared/sections";
import { renderEvolution } from "./evolution";
import { BRAND, DONATE_WIDGET, SITE_FOOTER, THEME_TOGGLE, asset, pageHead } from "./components";

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const SECTIONS: [id: string, label: string][] = [
  ['matchups', 'Matchups'],
  ['stats', 'Stats'],
  ['evolution', 'Evolution'],
  ['abilities', 'Abilities'],
  ['profile', 'Profile'],
  ['moves', 'Moves'],
  ['locations', 'Locations'],
  ['pokedex', 'Pokédex'],
];

export function renderPokemonDetail(details: PokemonDetails, page: PageData, meta: Meta, moves: MoveTable, total: number): string {
  const variety = page.varieties[0];
  const game = gameByKey(meta, page.defaultGame) || meta.games[0];
  const evolution = renderEvolution(details, page);
  const prevFile = detailFile(page.dex > 1 ? page.dex - 1 : total);
  const nextFile = detailFile(page.dex < total ? page.dex + 1 : 1);
  const weak = defensiveMatchups(meta, game.gen, variety.types);
  const weakText = [...weak.x4.map(t => `${titleCase(t)} (4×)`), ...weak.x2.map(titleCase)].join(', ');
  const description = `${page.name} (#${dexNo(page.dex)}) is a ${variety.types.map(titleCase).join('/')} Pokémon. Weak to ${weakText || 'nothing'}. Base stat total ${statTotal(variety)}. Moves, evolutions and where to find it in every game.`;
  const selectable = evolution.selectable
    .map(name => page.varieties.find(v => v.name === name))
    .filter(Boolean) as typeof page.varieties;
  const sectionLinks = SECTIONS.map(([id, label]) => `<a href="#${id}" data-section="${id}">${label}</a>`).join('');
  const sectionOptions = SECTIONS.map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
  const gameOptions = meta.games.filter(g => variety.games.includes(g.key))
    .map(g => `<option value="${g.key}"${g.key === game.key ? ' selected' : ''}>${escapeHtml(g.label)}</option>`).join('');
  const p = page.profile;

  return `<!DOCTYPE html>
<html lang="en">
  ${pageHead({ title: `${page.name} #${dexNo(page.dex)} · PokeQuickDex`, description, path: detailFile(page.dex), image: variety.art, stylesheet: 'pokemon_styles.css' })}
  <body data-dex="${page.dex}">
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
      <section id="hero" class="hero" style="${typeVars(variety.types)}">
        <div class="hero-inner">
          <div class="hero-head">
            <div class="hero-kicker"><span class="dex-no">#${dexNo(page.dex)}</span><span class="hero-gen">Gen ${ROMAN[p.generation] || p.generation}</span></div>
            <h1 id="pokemon-title-name">${escapeHtml(page.name)}</h1>
            <p class="pokemon-genus">${escapeHtml(details.genus)}</p>
            <div class="hero-types" id="pokemon-types">${typeTags(variety.types)}</div>
          </div>
          <div class="hero-art">
            <img id="pokemon-artwork" src="${variety.art}" alt="${escapeHtml(page.name)}" crossorigin="anonymous" />
          </div>
          <div class="hero-actions">${selectable.length > 1 ? `
            <div class="form-picker">
              <label for="form-select">Form</label>
              <div class="select-wrap"><select id="form-select">${selectable.map(v => `<option value="${v.name}"${v.isDefault ? ' selected' : ''}>${escapeHtml(v.label)}</option>`).join('')}</select></div>
            </div>` : ''}
            <div class="image-controls">
              <button id="shiny-toggle" type="button" class="hero-btn shiny-toggle" title="Toggle shiny" aria-pressed="false"${variety.shiny ? '' : ' hidden'}>${icon('sparkles')}<span>Shiny</span></button>
              <button id="animated-toggle" type="button" class="hero-btn animated-toggle" title="Toggle animated sprite" aria-pressed="false"${variety.anim ? '' : ' hidden'}>${icon('play')}<span>Animated</span></button>
              <button id="cry-button" type="button" class="hero-btn cry-button" title="Play cry"${variety.cry ? '' : ' hidden'}>${icon('volume')}<span>Cry</span></button>
            </div>
            <audio id="pokemon-cry" src="${variety.cry}" preload="none"></audio>
          </div>
        </div>
      </section>
      <div class="detail-body">
        <nav class="context-bar" aria-label="Game and sections">
          <div class="context-game">
            <label for="game-select" class="context-label">${icon('gamepad')}<span>Game</span></label>
            <div class="select-wrap"><select id="game-select">${gameOptions}</select></div>
          </div>
          <div class="section-links">${sectionLinks}</div>
          <div class="select-wrap jump-wrap"><select id="jump-select" aria-label="Jump to section"><option value="">Jump to…</option>${sectionOptions}</select></div>
        </nav>
        <p class="game-note" id="game-note" hidden></p>
        <div class="card-row">
          <section id="matchups" class="card matchups">
            <div class="card-head">
              <h2 class="card-title">Type matchups</h2>
              <span class="card-hint">Damage taken when attacked</span>
            </div>
            <div id="era-note">${renderEraNote(meta, game, variety)}</div>
            <div class="matchups-list" id="type-defenses">${renderDefense(meta, game.gen, typesFor(variety, game.gen))}</div>
            <ul class="ability-notes" id="ability-notes">${renderAbilityNotes(variety.abilities)}</ul>
            <div class="offense">
              <h3 class="sub-title">Its STAB attacks</h3>
              <div id="offense">${renderOffense(meta, game.gen, typesFor(variety, game.gen))}</div>
            </div>
          </section>
          <section id="stats" class="card">
            <div class="card-head"><h2 class="card-title">Base stats</h2></div>
            <table class="stats-table">
              <tbody id="stats-body">${renderStatsRows(variety)}</tbody>
              <tfoot>
                <tr class="bst-row">
                  <th scope="row">Total</th>
                  <td class="stat-num bst-value" id="pokemon-bst">${statTotal(variety)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <dl class="stat-extras">
              <div><dt>EV yield</dt><dd id="ev-yield">${evYield(variety)}</dd></div>
              <div><dt>Base experience</dt><dd id="base-exp">${variety.baseExp ?? '—'}</dd></div>
            </dl>
          </section>
        </div>
        <section id="evolution" class="card">
          <div class="card-head"><h2 class="card-title">Evolution</h2></div>
          <div class="evolution-chain">
            ${evolution.rowsHtml}
            ${evolution.formsHtml}
          </div>
        </section>
        <div class="card-row">
          <section id="abilities" class="card">
            <div class="card-head"><h2 class="card-title">Abilities</h2></div>
            <div class="ability-list" id="abilities-body">${renderAbilities(variety)}</div>
          </section>
          <section id="profile" class="card profile">
            <div class="card-head"><h2 class="card-title">Profile</h2></div>
            <div class="profile-grid">
              <dl class="info-list">
                <div class="info-row"><dt>Height</dt><dd id="pokemon-height">${heightText(variety)}</dd></div>
                <div class="info-row"><dt>Weight</dt><dd id="pokemon-weight">${weightText(variety)}</dd></div>
                <div class="info-row info-gender"><dt>Gender</dt><dd>${genderHtml(p)}</dd></div>
                ${p.genderDiff ? '<div class="info-row species-only"><dt>Looks</dt><dd>Males and females differ</dd></div>' : ''}
                <div class="info-row species-only"><dt>Egg groups</dt><dd>${p.eggGroups.map(titleCase).join(', ') || '—'}</dd></div>
                <div class="info-row species-only"><dt>Hatch time</dt><dd>${eggCyclesText(p)}</dd></div>
                ${p.habitat && p.habitat !== 'unknown' ? `<div class="info-row species-only"><dt>Habitat</dt><dd>${titleCase(p.habitat)}</dd></div>` : ''}
              </dl>
              <dl class="info-list" id="detail-training">
                <div class="info-row info-catch"><dt>Catch rate</dt><dd id="catch-rate">${catchRateHtml(p, game)}</dd></div>
                <div class="info-row"><dt>Base friendship</dt><dd>${p.baseHappiness}</dd></div>
                <div class="info-row"><dt>Growth rate</dt><dd>${titleCase(p.growthRate)}</dd></div>
              </dl>
            </div>
          </section>
        </div>
        <section id="moves" class="card moves">
          <div class="card-head"><h2 class="card-title">Moves</h2><span class="card-hint game-label">${escapeHtml(game.label)}</span></div>
          <div id="moves-body">${renderMoves(meta, moves, page, variety, game)}</div>
        </section>
        <div class="card-row">
          <section id="locations" class="card">
            <div class="card-head"><h2 class="card-title">Where to find it</h2><span class="card-hint game-label">${escapeHtml(game.label)}</span></div>
            <div id="locations-body">${renderLocations(meta, page, variety, game)}</div>
          </section>
          <section id="pokedex" class="card entries"${page.entries.length ? '' : ' hidden'}>
            <div class="card-head"><h2 class="card-title">Pokédex entries</h2></div>
            <div id="entries-body">${renderEntries(meta, page.entries, game)}</div>
          </section>
        </div>
      </div>
    </main>
    ${SITE_FOOTER}
    ${DONATE_WIDGET}
    <script type="module" src="${asset('js/detail.js')}"></script>
  </body>
</html>`;
}
