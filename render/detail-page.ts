import type { PokemonDetails } from "../pokemon-detail";
import type { Meta, MoveTable, PageData } from "../shared/model";
import { detailFile, dexNo, escapeHtml, typeTags, typeVars } from "../shared/format";
import { icon } from "../shared/icons";
import { getLang, growthRateLabel, t, typeName } from "../shared/i18n";
import { defensiveMatchups, typesFor } from "../shared/type-chart";
import {
  catchRateHtml, eggCyclesText, evYield, gameByKey, genderHtml, heightText, renderAbilities, renderAbilityNotes,
  renderDefense, renderEntries, renderEraNote, renderLocations, renderMoves, renderOffense, renderStatsRows,
  statTotal, weightText,
} from "../shared/sections";
import { renderEvolution } from "./evolution";
import { BRAND, SITE_URL, asset, assetVersion, donateWidget, languageSwitch, pageHead, siteFooter, themeToggle } from "./components";

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const SECTIONS = ['matchups', 'stats', 'evolution', 'abilities', 'profile', 'moves', 'locations', 'pokedex'] as const;

export function renderPokemonDetail(details: PokemonDetails, page: PageData, meta: Meta, moves: MoveTable, total: number): string {
  const variety = page.varieties[0];
  const game = gameByKey(meta, page.defaultGame) || meta.games[0];
  const evolution = renderEvolution(details, page);
  const prevFile = detailFile(page.dex > 1 ? page.dex - 1 : total);
  const nextFile = detailFile(page.dex < total ? page.dex + 1 : 1);
  const weak = defensiveMatchups(meta, game.gen, variety.types);
  const weakText = [...weak.x4.map(type => `${typeName(type)} (4×)`), ...weak.x2.map(typeName)].join(', ');
  const description = t('detail.metaDescription', {
    name: page.name,
    dex: dexNo(page.dex),
    types: variety.types.map(typeName).join('/'),
    weak: weakText || t('detail.weakNone'),
    bst: statTotal(variety),
  });
  const selectable = evolution.selectable
    .map(name => page.varieties.find(v => v.name === name))
    .filter(Boolean) as typeof page.varieties;
  const sectionLinks = SECTIONS.map(id => `<a href="#${id}" data-section="${id}">${t(`section.${id}`)}</a>`).join('');
  const sectionOptions = SECTIONS.map(id => `<option value="${id}">${t(`section.${id}`)}</option>`).join('');
  const gameOptions = meta.games.filter(g => variety.games.includes(g.key))
    .map(g => `<option value="${g.key}"${g.key === game.key ? ' selected' : ''}>${escapeHtml(g.label)}</option>`).join('');
  const p = page.profile;

  return `<!DOCTYPE html>
<html lang="${getLang()}">
  ${pageHead({
    title: t('detail.metaTitle', { name: page.name }),
    description,
    path: detailFile(page.dex),
    image: `${SITE_URL}/api/og?dex=${page.dex}&lang=${getLang()}&v=${assetVersion('api/og.js')}`,
    imageSize: [1200, 630],
    stylesheet: 'pokemon_styles.css',
  })}
  <body data-dex="${page.dex}">
    <header class="topbar">
      <div class="topbar-inner">
        <a href="index.html" class="icon-btn back-to-menu" title="${t('nav.back')}" aria-label="${t('nav.back')}">${icon('arrowLeft')}</a>
        <a href="index.html" class="brand">${BRAND}</a>
        <div class="topbar-actions">
          <span id="filter-counter" class="filter-counter"></span>
          <nav class="topbar-nav" aria-label="${t('nav.prevNext')}">
            <a id="prev-btn" href="${prevFile}" class="icon-btn nav-button" data-default-prev="${prevFile}" title="${t('nav.prev')} (←)" aria-label="${t('nav.prev')}">${icon('chevronLeft')}</a>
            <a id="next-btn" href="${nextFile}" class="icon-btn nav-button" data-default-next="${nextFile}" title="${t('nav.next')} (→)" aria-label="${t('nav.next')}">${icon('chevronRight')}</a>
          </nav>
          ${languageSwitch(detailFile(page.dex))}
          ${themeToggle()}
        </div>
      </div>
    </header>
    <main class="detail">
      <section id="hero" class="hero" style="${typeVars(variety.types)}">
        <button type="button" id="share-btn" class="hero-share" title="${t('share.button')}" aria-label="${t('share.button')}">${icon('share')}</button>
        <div class="hero-inner">
          <div class="hero-head">
            <div class="hero-kicker"><span class="dex-no">#${dexNo(page.dex)}</span><span class="hero-gen">${t('detail.gen', { n: ROMAN[p.generation] || p.generation })}</span></div>
            <h1 id="pokemon-title-name">${escapeHtml(page.name)}</h1>
            <p class="pokemon-genus">${escapeHtml(details.genus)}</p>
            <div class="hero-types" id="pokemon-types">${typeTags(variety.types)}</div>
          </div>
          <div class="hero-art">
            <img id="pokemon-artwork" src="${variety.art}" alt="${escapeHtml(page.name)}" crossorigin="anonymous" />
          </div>
          <div class="hero-actions">${selectable.length > 1 ? `
            <div class="form-picker">
              <label for="form-select">${t('detail.form')}</label>
              <div class="select-wrap"><select id="form-select">${selectable.map(v => `<option value="${v.name}"${v.isDefault ? ' selected' : ''}>${escapeHtml(v.label)}</option>`).join('')}</select></div>
            </div>` : ''}
            <div class="image-controls">
              <button id="shiny-toggle" type="button" class="hero-btn shiny-toggle" title="${t('detail.shinyTitle')}" aria-pressed="false"${variety.shiny ? '' : ' hidden'}>${icon('sparkles')}<span>${t('detail.shiny')}</span></button>
              <button id="animated-toggle" type="button" class="hero-btn animated-toggle" title="${t('detail.animatedTitle')}" aria-pressed="false"${variety.anim ? '' : ' hidden'}>${icon('play')}<span>${t('detail.animated')}</span></button>
              <button id="cry-button" type="button" class="hero-btn cry-button" title="${t('detail.cryTitle')}"${variety.cry ? '' : ' hidden'}>${icon('volume')}<span>${t('detail.cry')}</span></button>
            </div>
            <audio id="pokemon-cry" src="${variety.cry}" preload="none"></audio>
          </div>
        </div>
      </section>
      <div class="detail-body">
        <nav class="context-bar" aria-label="${t('detail.sections')}">
          <div class="context-game">
            <label for="game-select" class="context-label">${icon('gamepad')}<span>${t('detail.game')}</span></label>
            <div class="select-wrap"><select id="game-select">${gameOptions}</select></div>
          </div>
          <div class="section-links">${sectionLinks}</div>
          <div class="select-wrap jump-wrap"><select id="jump-select" aria-label="${t('detail.jumpLabel')}"><option value="">${t('detail.jump')}</option>${sectionOptions}</select></div>
        </nav>
        <p class="game-note" id="game-note" hidden></p>
        <div class="card-row">
          <section id="matchups" class="card matchups">
            <div class="card-head">
              <h2 class="card-title">${t('matchups.title')}</h2>
              <span class="card-hint">${t('matchups.hint')}</span>
            </div>
            <div id="era-note">${renderEraNote(meta, game, variety)}</div>
            <div class="matchups-list" id="type-defenses">${renderDefense(meta, game.gen, typesFor(variety, game.gen))}</div>
            <ul class="ability-notes" id="ability-notes">${renderAbilityNotes(variety.abilities)}</ul>
            <div class="offense">
              <h3 class="sub-title">${t('offense.title')}</h3>
              <div id="offense">${renderOffense(meta, game.gen, typesFor(variety, game.gen))}</div>
            </div>
            <a class="chart-link-inline" href="types.html">${icon('grid')}<span>${t('matchups.chartLink')}</span>${icon('arrowRight')}</a>
          </section>
          <section id="stats" class="card">
            <div class="card-head"><h2 class="card-title">${t('stats.title')}</h2></div>
            <table class="stats-table">
              <tbody id="stats-body">${renderStatsRows(variety)}</tbody>
              <tfoot>
                <tr class="bst-row">
                  <th scope="row">${t('stats.total')}</th>
                  <td class="stat-num bst-value" id="pokemon-bst">${statTotal(variety)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <dl class="stat-extras">
              <div><dt>${t('stats.evYield')}</dt><dd id="ev-yield">${evYield(variety)}</dd></div>
              <div><dt>${t('stats.baseExp')}</dt><dd id="base-exp">${variety.baseExp ?? '—'}</dd></div>
            </dl>
          </section>
        </div>
        <section id="evolution" class="card">
          <div class="card-head"><h2 class="card-title">${t('evolution.title')}</h2></div>
          <div class="evolution-chain">
            ${evolution.rowsHtml}
            ${evolution.formsHtml}
          </div>
        </section>
        <div class="card-row">
          <section id="abilities" class="card">
            <div class="card-head"><h2 class="card-title">${t('abilities.title')}</h2></div>
            <div class="ability-list" id="abilities-body">${renderAbilities(variety)}</div>
          </section>
          <section id="profile" class="card profile">
            <div class="card-head"><h2 class="card-title">${t('profile.title')}</h2></div>
            <div class="profile-grid">
              <dl class="info-list">
                <div class="info-row"><dt>${t('profile.height')}</dt><dd id="pokemon-height">${heightText(variety)}</dd></div>
                <div class="info-row"><dt>${t('profile.weight')}</dt><dd id="pokemon-weight">${weightText(variety)}</dd></div>
                <div class="info-row info-gender"><dt>${t('profile.gender')}</dt><dd>${genderHtml(p)}</dd></div>
                ${p.genderDiff ? `<div class="info-row species-only"><dt>${t('profile.looks')}</dt><dd>${t('profile.genderDiff')}</dd></div>` : ''}
                <div class="info-row species-only"><dt>${t('profile.eggGroups')}</dt><dd>${escapeHtml(p.eggGroups.join(', ')) || '—'}</dd></div>
                <div class="info-row species-only"><dt>${t('profile.hatch')}</dt><dd>${eggCyclesText(p)}</dd></div>
                ${p.habitat ? `<div class="info-row species-only"><dt>${t('profile.habitat')}</dt><dd>${escapeHtml(p.habitat)}</dd></div>` : ''}
              </dl>
              <dl class="info-list" id="detail-training">
                <div class="info-row info-catch"><dt>${t('profile.catchRate')}</dt><dd id="catch-rate">${catchRateHtml(p, game)}</dd></div>
                <div class="info-row"><dt>${t('profile.friendship')}</dt><dd>${p.baseHappiness}</dd></div>
                <div class="info-row"><dt>${t('profile.growth')}</dt><dd>${growthRateLabel(p.growthRate)}</dd></div>
              </dl>
            </div>
          </section>
        </div>
        <section id="moves" class="card moves">
          <div class="card-head"><h2 class="card-title">${t('moves.title')}</h2><span class="card-hint game-label">${escapeHtml(game.label)}</span></div>
          <div id="moves-body">${renderMoves(meta, moves, page, variety, game)}</div>
        </section>
        <div class="card-row">
          <section id="locations" class="card">
            <div class="card-head"><h2 class="card-title">${t('locations.title')}</h2><span class="card-hint game-label">${escapeHtml(game.label)}</span></div>
            <div id="locations-body">${renderLocations(meta, page, variety, game)}</div>
          </section>
          <section id="pokedex" class="card entries"${page.entries.length ? '' : ' hidden'}>
            <div class="card-head"><h2 class="card-title">${t('entries.title')}</h2></div>
            <div id="entries-body">${renderEntries(meta, page.entries, game)}</div>
          </section>
        </div>
      </div>
    </main>
    ${siteFooter()}
    ${donateWidget()}
    <script type="module" src="${asset('js/detail.js')}"></script>
  </body>
</html>`;
}
