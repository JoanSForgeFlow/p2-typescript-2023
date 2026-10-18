import type { Meta } from "../shared/model";
import { escapeHtml } from "../shared/format";
import { icon } from "../shared/icons";
import { t } from "../shared/i18n";
import { gameByKey, renderDefense, renderOffense, renderTypeChart } from "../shared/sections";
import { eraLabel, typesInGen } from "../shared/type-chart";
import { $, initCommon, loadMeta, storeGame, storedGame } from "./common";

async function init(): Promise<void> {
  initCommon();
  const picks = Array.from(document.querySelectorAll<HTMLButtonElement>(".type-pick"));
  const picker = document.querySelector<HTMLElement>(".type-picker")!;
  const gameSelect = $<HTMLSelectElement>("game-select");
  const result = $("calc-result");
  const clear = $("calc-clear");
  const chart = $("type-chart");
  const chartEra = $("chart-era");

  let meta: Meta;
  try {
    meta = await loadMeta();
  } catch (e) {
    return;
  }
  if (gameByKey(meta, storedGame())) gameSelect.value = storedGame();
  // The selection lives in the URL hash (types.html#water-ground), so it can be shared.
  let selected = decodeURIComponent(location.hash.slice(1)).split("-").filter(type => meta.types.includes(type)).slice(0, 2);

  const update = () => {
    const game = gameByKey(meta, gameSelect.value) || meta.games[0];
    const available = typesInGen(meta, game.gen);
    selected = selected.filter(type => available.includes(type));
    for (const button of picks) {
      const type = button.dataset.type!;
      button.setAttribute("aria-pressed", String(selected.includes(type)));
      button.disabled = !available.includes(type);
      button.title = button.disabled ? t("chart.unavailable") : "";
    }
    picker.classList.toggle("has-pick", selected.length > 0);
    clear.hidden = selected.length === 0;

    const era = eraLabel(meta, game.gen);
    const eraNote = era ? `<p class="era-note">${icon("info")}<span>${t("era.chart", { era, game: escapeHtml(game.label) })}</span></p>` : "";
    result.innerHTML = selected.length
      ? `${eraNote}<h3 class="sub-title">${t("chart.defense")}</h3><div class="matchups-list">${renderDefense(meta, game.gen, selected)}</div>`
        + `<div class="offense"><h3 class="sub-title">${t("offense.title")}</h3>${renderOffense(meta, game.gen, selected)}</div>`
      : `<p class="calc-empty">${t("chart.empty")}</p>`;

    if (chart.dataset.gen !== String(game.gen)) {
      chart.innerHTML = renderTypeChart(meta, game.gen);
      chart.dataset.gen = String(game.gen);
    }
    chartEra.innerHTML = eraNote;
    // Highlight the selected types' columns (how they take damage).
    chart.querySelectorAll(".sel").forEach(cell => cell.classList.remove("sel"));
    for (const type of selected) {
      const column = available.indexOf(type) + 2;
      chart.querySelectorAll(`tr > :nth-child(${column})`).forEach(cell => cell.classList.add("sel"));
    }
    history.replaceState(null, "", selected.length ? `#${selected.join("-")}` : location.pathname + location.search);
  };

  for (const button of picks) {
    button.addEventListener("click", () => {
      const type = button.dataset.type!;
      selected = selected.includes(type) ? selected.filter(s => s !== type) : [...selected, type].slice(-2);
      update();
    });
  }
  clear.addEventListener("click", () => {
    selected = [];
    update();
  });
  gameSelect.addEventListener("change", () => {
    storeGame(gameSelect.value);
    update();
  });
  update();
}

init();
