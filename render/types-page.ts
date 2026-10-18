import type { Meta } from "../shared/model";
import { escapeHtml } from "../shared/format";
import { icon } from "../shared/icons";
import { getLang, t, typeLabel } from "../shared/i18n";
import { renderTypeChart } from "../shared/sections";
import { BRAND, asset, donateWidget, languageSwitch, pageHead, siteFooter, themeToggle } from "./components";

// Type chart page: a calculator for one or two types (what the Pokémon you
// are facing is weak to) and the full chart of the chosen game.
export function renderTypesPage(meta: Meta): string {
  const game = meta.games.find(g => g.hasMoves && g.hasEntries) || meta.games[0];
  const gameOptions = meta.games.map(g => `<option value="${g.key}"${g.key === game.key ? ' selected' : ''}>${escapeHtml(g.label)}</option>`).join('');
  const picker = meta.types.map(type =>
    `<button type="button" class="tag ${type} type-pick" data-type="${type}" aria-pressed="false">${typeLabel(type)}</button>`).join('');

  return `<!DOCTYPE html>
<html lang="${getLang()}">
  ${pageHead({
    title: t('chart.metaTitle'),
    description: t('chart.metaDescription'),
    path: 'types.html',
    image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    stylesheet: 'pokemon_styles.css',
  })}
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <a href="index.html" class="icon-btn back-to-menu" title="${t('nav.back')}" aria-label="${t('nav.back')}">${icon('arrowLeft')}</a>
        <a href="index.html" class="brand">${BRAND}</a>
        <div class="topbar-actions">
          ${languageSwitch('types.html')}
          ${themeToggle()}
        </div>
      </div>
    </header>
    <main class="chart-main">
      <div class="chart-hero">
        <h1>${t('chart.title')}</h1>
        <p class="chart-intro">${t('chart.intro')}</p>
      </div>
      <section class="card calc" aria-label="${t('chart.pick')}">
        <div class="calc-head">
          <div class="context-game">
            <label for="game-select" class="context-label">${icon('gamepad')}<span>${t('detail.game')}</span></label>
            <div class="select-wrap"><select id="game-select">${gameOptions}</select></div>
          </div>
          <button type="button" class="link-btn" id="calc-clear" hidden>${t('chart.clear')}</button>
        </div>
        <div class="type-picker" role="group" aria-label="${t('chart.pick')}">${picker}</div>
        <div class="calc-result" id="calc-result" aria-live="polite"><p class="calc-empty">${t('chart.empty')}</p></div>
      </section>
      <section class="card chart-card" id="chart">
        <div class="card-head"><h2 class="card-title">${t('chart.full')}</h2><span class="card-hint">${t('chart.legend')}</span></div>
        <div id="chart-era"></div>
        <table class="type-chart" id="type-chart" data-gen="${game.gen}">${renderTypeChart(meta, game.gen)}</table>
      </section>
    </main>
    ${siteFooter()}
    ${donateWidget()}
    <script type="module" src="${asset('js/types.js')}"></script>
  </body>
</html>`;
}
