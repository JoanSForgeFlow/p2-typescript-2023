import type { PageData, Variety } from "../shared/model";
import { STAT_KEYS } from "../shared/model";
import { escapeHtml, searchKey, typeTags } from "../shared/format";
import { icon } from "../shared/icons";
import { plural, setTypeLabels, statLabel, t } from "../shared/i18n";
import { $, initCommon, loadPage, storeGame, storedGame } from "./common";

interface IndexData {
  total: number;
  games: { key: string; label: string }[];
  generationLabels: Record<string, string>;
  typeLabels?: Record<string, string>;
}

interface Filters {
  search: string;
  type: string;
  generation: string;
  baby: boolean;
  legendary: boolean;
  mythical: boolean;
  species: boolean;
  regional: boolean;
  battle: boolean;
  other: boolean;
}

const data: IndexData = JSON.parse($("index-data").textContent || "{}");
setTypeLabels(data.typeLabels);
const cards = Array.from(document.querySelectorAll<HTMLAnchorElement>(".pokemon-card"));
const searchInput = $<HTMLInputElement>("search-input");
const gameFilter = $<HTMLSelectElement>("game-filter");
const filtersPanel = $("filters");
const filtersBackdrop = $("filters-backdrop");
const filtersApply = $("filters-apply");
const filtersBadge = $("filters-badge");
const clearFiltersBtn = $("clear-filters-btn");
const resultsCount = $("results-count");
const activeFilters = $("active-filters");
const emptyState = $("empty-state");
const categoryBoxes = Array.from(document.querySelectorAll<HTMLInputElement>('.toolbar-tags input[type="checkbox"]'));

const checkedValue = (name: string): string =>
  document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value || "";

function setRadio(name: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)
    || document.querySelector<HTMLInputElement>(`input[name="${name}"][value=""]`);
  if (input) input.checked = true;
}

const isChecked = (id: string): boolean => $<HTMLInputElement>(id).checked;
const setChecked = (id: string, value: boolean): void => { $<HTMLInputElement>(id).checked = value; };

function readFilters(): Filters {
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
    other: isChecked("other-filter"),
  };
}

function saveFilters(): void {
  try { sessionStorage.setItem("pokemonFilters", JSON.stringify(readFilters())); } catch (e) { /* not remembered */ }
}

function loadFilters(): void {
  gameFilter.value = data.games.some(g => g.key === storedGame()) ? storedGame() : "";
  let filters: Partial<Filters> | null = null;
  try { filters = JSON.parse(sessionStorage.getItem("pokemonFilters") || "null"); } catch (e) { /* defaults */ }
  if (!filters) return;
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

const formsChanged = (f: Filters): boolean => !f.species || f.regional || f.battle || f.other;
const resultText = (count: number): string => plural(count, "results.one", "results.many");

function filterPokemons(): void {
  const f = readFilters();
  const query = f.search.trim();
  const key = searchKey(query);
  const number = /^#?\d+$/.test(query) ? parseInt(query.replace("#", ""), 10) : null;
  const gameIndex = data.games.findIndex(g => g.key === gameFilter.value);
  const noCategory = !f.baby && !f.legendary && !f.mythical;
  // Every visible card's link (species and forms, in display order), so the
  // detail page's prev/next arrows walk the whole filtered result set; a
  // form's link is its species page plus the form hash.
  const visibleNav: string[] = [];
  for (const card of cards) {
    const d = card.dataset;
    const nameMatch = !key || (number !== null ? Number(d.dex) === number : d.search!.indexOf(key) !== -1);
    const typeMatch = !f.type || JSON.parse(d.types!).indexOf(f.type) !== -1;
    const generationMatch = !f.generation || d.generation === f.generation;
    const gameMatch = gameIndex === -1 || ((Number(d.games) >>> gameIndex) & 1) === 1;
    const categoryMatch = noCategory || (f.baby && d.baby === "true") || (f.legendary && d.legendary === "true") || (f.mythical && d.mythical === "true");
    // Complementary category toggles: base species, regional forms,
    // battle-only forms, and any other (cosmetic) forms.
    const kindMatch = f[(d.formkind || "species") as keyof Filters];
    const visible = nameMatch && typeMatch && generationMatch && gameMatch && categoryMatch && !!kindMatch;
    card.parentElement!.style.display = visible ? "" : "none";
    if (visible) visibleNav.push(card.getAttribute("href")!);
  }

  const facets = (gameIndex !== -1 ? 1 : 0) + (f.type ? 1 : 0) + (f.generation ? 1 : 0) + (noCategory ? 0 : 1) + (formsChanged(f) ? 1 : 0);
  const filtered = facets > 0 || key !== "";
  try {
    if (filtered) sessionStorage.setItem("filteredPokemonNav", JSON.stringify(visibleNav));
    else sessionStorage.removeItem("filteredPokemonNav");
  } catch (e) { /* the detail arrows fall back to dex order */ }
  resultsCount.textContent = filtered ? resultText(visibleNav.length) : t("index.count", { n: data.total });
  filtersApply.textContent = visibleNav.length ? t("filters.showN", { results: resultText(visibleNav.length) }) : t("filters.noResults");
  filtersBadge.textContent = String(facets);
  filtersBadge.hidden = facets === 0;
  clearFiltersBtn.hidden = !filtered;
  emptyState.hidden = visibleNav.length > 0;
  renderActiveFilters(f, noCategory, gameIndex);
}

function renderActiveFilters(f: Filters, noCategory: boolean, gameIndex: number): void {
  const chips: [string, string][] = [];
  if (gameIndex !== -1) chips.push(["game", `${icon("gamepad")}${escapeHtml(data.games[gameIndex].label)}`]);
  if (f.type) chips.push(["type", typeTags([f.type])]);
  if (f.generation) chips.push(["generation", data.generationLabels[f.generation]]);
  if (!noCategory) chips.push(["category", t(f.baby ? "cat.baby" : f.legendary ? "cat.legendary" : "cat.mythical")]);
  if (formsChanged(f)) {
    const shown = [
      f.species && t("show.short.species"),
      f.regional && t("show.short.regional"),
      f.battle && t("show.short.battle"),
      f.other && t("show.short.other"),
    ].filter(Boolean);
    chips.push(["forms", t("filters.showing", { list: shown.join(", ") || t("filters.none") })]);
  }
  activeFilters.innerHTML = chips.map(([facet, label]) =>
    `<button type="button" class="active-chip" data-clear="${facet}" title="${t("filters.remove")}">${label}${icon("close")}</button>`).join("");
  activeFilters.hidden = chips.length === 0;
}

function clearAllFilters(): void {
  searchInput.value = "";
  gameFilter.value = "";
  storeGame("");
  setRadio("type", "");
  setRadio("generation", "");
  ["baby-filter", "legendary-filter", "mythical-filter", "regional-filter", "battle-filter", "other-filter"].forEach(id => setChecked(id, false));
  setChecked("species-filter", true);
  try { sessionStorage.removeItem("pokemonFilters"); } catch (e) { /* nothing stored */ }
  filterPokemons();
}

function initFilters(): void {
  activeFilters.addEventListener("click", (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>("[data-clear]");
    if (!chip) return;
    const facet = chip.dataset.clear;
    if (facet === "game") { gameFilter.value = ""; storeGame(""); }
    if (facet === "type") setRadio("type", "");
    if (facet === "generation") setRadio("generation", "");
    if (facet === "category") categoryBoxes.forEach(box => { box.checked = false; });
    if (facet === "forms") {
      setChecked("species-filter", true);
      ["regional-filter", "battle-filter", "other-filter"].forEach(id => setChecked(id, false));
    }
    filterPokemons();
    saveFilters();
  });
  filtersPanel.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;
    // Baby/Legendary/Mythical are mutually exclusive (radio-like).
    if (categoryBoxes.includes(target) && target.checked) categoryBoxes.forEach(box => { if (box !== target) box.checked = false; });
    if (e.target === gameFilter) storeGame(gameFilter.value);
    filterPokemons();
    saveFilters();
  });
  clearFiltersBtn.addEventListener("click", clearAllFilters);
  $("empty-clear").addEventListener("click", clearAllFilters);
  searchInput.addEventListener("input", () => { filterPokemons(); saveFilters(); });
  searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") searchInput.blur(); });

  const openFilters = () => {
    filtersPanel.classList.add("open");
    filtersBackdrop.classList.add("open");
    document.body.classList.add("no-scroll");
  };
  const closeFilters = () => {
    filtersPanel.classList.remove("open");
    filtersBackdrop.classList.remove("open");
    document.body.classList.remove("no-scroll");
  };
  $("filters-open").addEventListener("click", openFilters);
  $("filters-close").addEventListener("click", closeFilters);
  filtersApply.addEventListener("click", closeFilters);
  filtersBackdrop.addEventListener("click", closeFilters);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeFilters();
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (e.key === "/" && !/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

interface ComparePick { dex: number; variety: string; name: string; card: HTMLAnchorElement }

function initCompare(): void {
  let picks: ComparePick[] = [];
  let compareMode = false;
  const modeBtn = $("compare-mode-btn");
  const bar = $("compare-bar");
  const slot1 = $("compare-pokemon-1");
  const slot2 = $("compare-pokemon-2");
  const goBtn = $<HTMLButtonElement>("compare-btn");
  const hint = $("compare-hint");
  const modal = $("compare-modal");
  const results = $("compare-results");

  const updateBar = () => {
    slot1.textContent = picks[0] ? picks[0].name : t("compare.pick1");
    slot1.classList.toggle("filled", picks.length > 0);
    if (picks.length === 1) {
      // Mirror the first pick as a faded hint: comparing now pits the
      // Pokémon against itself (to compare its forms).
      slot2.textContent = picks[0].name;
      slot2.classList.add("compare-slot-mirror");
    } else {
      slot2.textContent = picks[1] ? picks[1].name : t("compare.pick2");
      slot2.classList.remove("compare-slot-mirror");
    }
    slot2.classList.toggle("filled", picks.length > 1);
    goBtn.disabled = picks.length === 0;
  };
  const setMode = (on: boolean) => {
    compareMode = on;
    modeBtn.classList.toggle("active", on);
    modeBtn.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("compare-mode", on);
    bar.style.display = on ? "flex" : "none";
    hint.hidden = !on;
    if (!on) {
      picks = [];
      cards.forEach(c => c.classList.remove("selected-compare"));
    }
    updateBar();
  };
  modeBtn.addEventListener("click", () => setMode(!compareMode));
  $("clear-compare-btn").addEventListener("click", () => setMode(false));

  for (const card of cards) {
    card.addEventListener("click", (e) => {
      if (!compareMode) {
        try { sessionStorage.setItem("indexScroll", String(window.scrollY)); } catch (err) { /* not restored */ }
        return;
      }
      e.preventDefault();
      const existing = picks.findIndex(p => p.card === card);
      if (existing !== -1) {
        // Clicking an already-selected Pokémon deselects it.
        picks.splice(existing, 1);
        card.classList.remove("selected-compare");
      } else if (picks.length < 2) {
        picks.push({ dex: Number(card.dataset.dex), variety: card.dataset.variety || "", name: card.dataset.name || "", card });
        card.classList.add("selected-compare");
      }
      updateBar();
    });
  }

  const openModal = () => { modal.style.display = "flex"; document.body.classList.add("no-scroll"); };
  const closeModal = () => {
    if (modal.style.display === "none") return;
    modal.style.display = "none";
    document.body.classList.remove("no-scroll");
    modal.querySelectorAll("audio").forEach(a => a.pause());
  };
  document.querySelector(".close-modal")!.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  results.addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>("[data-audio]");
    if (!button) return;
    const audio = document.getElementById(button.dataset.audio!) as HTMLAudioElement;
    audio.currentTime = 0;
    audio.play().catch(() => { /* blocked or unsupported format */ });
  });

  const side = (page: PageData, v: Variety, n: number) => `
    <div class="compare-pokemon" id="compare-side-${n}" style="--tc: var(--type-${v.types[0]})">
      <div class="compare-art"><img id="compare-img-${n}" src="${v.art}" alt="" crossorigin="anonymous"></div>
      <h3 id="compare-name-${n}">${escapeHtml(v.label)}</h3>
      <div class="compare-types" id="compare-types-${n}">${typeTags(v.types)}</div>
      ${page.varieties.length > 1 ? `<div class="select-wrap"><select id="compare-form-${n}" aria-label="${t("detail.form")}">${page.varieties.map(o => `<option value="${o.name}"${o.name === v.name ? " selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select></div>` : ""}
      ${v.cry ? `<div class="compare-cry"><audio id="compare-cry-${n}" src="${v.cry}" preload="none"></audio><button type="button" class="cry-button" data-audio="compare-cry-${n}">${icon("volume")}<span>${t("detail.cry")}</span></button></div>` : ""}
    </div>`;
  const row = (label: string, v1: number, v2: number, max: number, extra: string) => {
    const w1 = v1 >= v2 ? " win" : "";
    const w2 = v2 >= v1 ? " win" : "";
    const pct = (v: number) => Math.min(100, Math.round((v / max) * 100));
    return `<div class="cmp-row${extra}"><span class="cmp-val${w1}">${v1}</span><div class="cmp-bar cmp-left${w1}"><i style="width: ${pct(v1)}%"></i></div><span class="cmp-label">${label}</span><div class="cmp-bar cmp-right${w2}"><i style="width: ${pct(v2)}%"></i></div><span class="cmp-val${w2}">${v2}</span></div>`;
  };
  const statsHtml = (a: Variety, b: Variety) => {
    const total = (v: Variety) => v.stats.reduce((x, y) => x + y, 0);
    return STAT_KEYS.map((k, i) => row(statLabel(k), a.stats[i], b.stats[i], 255, "")).join("")
      + row(t("stats.total"), total(a), total(b), Math.max(800, total(a), total(b)), " cmp-total");
  };

  goBtn.addEventListener("click", async () => {
    if (picks.length === 0) return;
    // With a single Pokémon selected, compare it against itself so its forms
    // can be pitted against each other via the per-side selectors.
    const [p1, p2] = [picks[0], picks[1] || picks[0]];
    results.innerHTML = `<p class="compare-loading">${t("compare.loading")}</p>`;
    openModal();
    let pages: [PageData, PageData];
    try {
      pages = await Promise.all([loadPage(p1.dex), loadPage(p2.dex)]);
    } catch (e) {
      results.innerHTML = `<p class="compare-loading">${t("compare.error")}</p>`;
      return;
    }
    const pick = (page: PageData, name: string) => page.varieties.find(v => v.name === name) || page.varieties[0];
    const current: [Variety, Variety] = [pick(pages[0], p1.variety), pick(pages[1], p2.variety)];
    results.innerHTML = `<div class="compare-header">${side(pages[0], current[0], 1)}<div class="vs">VS</div>${side(pages[1], current[1], 2)}</div><div class="compare-stats" id="compare-stats"></div>`;
    const updateStats = () => {
      const stats = $("compare-stats");
      stats.style.setProperty("--c1", `var(--type-${current[0].types[0]})`);
      stats.style.setProperty("--c2", `var(--type-${current[1].types[0]})`);
      stats.innerHTML = statsHtml(current[0], current[1]);
    };
    updateStats();
    [0, 1].forEach((i) => {
      const select = document.getElementById(`compare-form-${i + 1}`) as HTMLSelectElement | null;
      if (!select) return;
      select.addEventListener("change", () => {
        const v = pick(pages[i], select.value);
        current[i] = v;
        $<HTMLImageElement>(`compare-img-${i + 1}`).src = v.art;
        $(`compare-name-${i + 1}`).textContent = v.label;
        $(`compare-types-${i + 1}`).innerHTML = typeTags(v.types);
        $(`compare-side-${i + 1}`).style.setProperty("--tc", `var(--type-${v.types[0]})`);
        const cry = document.getElementById(`compare-cry-${i + 1}`) as HTMLAudioElement | null;
        if (cry && v.cry) cry.src = v.cry;
        updateStats();
      });
    });
  });
}

function init(): void {
  initCommon();
  initFilters();
  initCompare();
  loadFilters();
  filterPokemons();
  let saved: string | null = null;
  try {
    saved = sessionStorage.getItem("indexScroll");
    sessionStorage.removeItem("indexScroll");
  } catch (e) { /* nothing to restore */ }
  if (saved !== null) window.scrollTo(0, Number(saved));
}

init();
