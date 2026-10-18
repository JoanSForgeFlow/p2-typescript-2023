import type { Game, Meta, MoveTable, PageData, Variety } from "../shared/model";
import { escapeHtml, typeTags } from "../shared/format";
import { t } from "../shared/i18n";
import { typesFor } from "../shared/type-chart";
import {
  catchRateHtml, effectiveGame, evYield, heightText, renderAbilities, renderAbilityNotes, renderDefense, renderEntries,
  renderEraNote, renderLocations, renderMoves, renderOffense, renderStatsRows, statTotal, weightText,
} from "../shared/sections";
import { $, initCommon, loadMeta, loadMoves, loadPage, storeGame, storedGame } from "./common";

const all = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

function initFilteredNav(dex: number): void {
  // Filtered navigation: walk every visible card's link (species and forms),
  // locating the current view by this page's file plus form hash. Not in the
  // set: default Pokédex-order arrows. Lone result: none.
  let filteredNav: string[] = [];
  try { filteredNav = JSON.parse(sessionStorage.getItem("filteredPokemonNav") || "[]"); } catch (e) { /* no filters */ }
  const prevBtn = $<HTMLAnchorElement>("prev-btn");
  const nextBtn = $<HTMLAnchorElement>("next-btn");
  const counter = $("filter-counter");
  const baseFile = `${String(dex).padStart(4, "0")}_details.html`;
  const update = () => {
    const idx = filteredNav.indexOf(baseFile + location.hash);
    if (idx === -1) {
      prevBtn.href = prevBtn.dataset.defaultPrev!;
      nextBtn.href = nextBtn.dataset.defaultNext!;
      prevBtn.style.visibility = "";
      nextBtn.style.visibility = "";
      counter.textContent = "";
      return;
    }
    counter.textContent = filteredNav.length > 1 ? `${idx + 1}/${filteredNav.length}` : "";
    prevBtn.style.visibility = idx > 0 ? "" : "hidden";
    if (idx > 0) prevBtn.href = filteredNav[idx - 1];
    nextBtn.style.visibility = idx < filteredNav.length - 1 ? "" : "hidden";
    if (idx < filteredNav.length - 1) nextBtn.href = filteredNav[idx + 1];
  };
  update();
  window.addEventListener("hashchange", update);
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
    if (e.key === "ArrowLeft" && prevBtn.style.visibility !== "hidden") location.href = prevBtn.href;
    if (e.key === "ArrowRight" && nextBtn.style.visibility !== "hidden") location.href = nextBtn.href;
  });
}

function initSectionNav(): void {
  const jump = $<HTMLSelectElement>("jump-select");
  jump.addEventListener("change", () => {
    const target = document.getElementById(jump.value);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    jump.value = "";
  });
  const links = all<HTMLAnchorElement>(".section-links a");
  const sections = links.map(a => document.getElementById(a.dataset.section!)).filter(Boolean) as HTMLElement[];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach(a => a.classList.toggle("active", a.dataset.section === entry.target.id));
    }
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach(s => observer.observe(s));
}

interface State {
  page: PageData;
  meta: Meta;
  moves: MoveTable;
  variety: Variety;
  game: Game;
  shiny: boolean;
  animated: boolean;
  movesTab: string;
}

function setArtwork(state: State): void {
  const v = state.variety;
  const art = $<HTMLImageElement>("pokemon-artwork");
  const src = state.animated
    ? (state.shiny && v.animShiny ? v.animShiny : v.anim)
    : (state.shiny && v.shiny ? v.shiny : v.art);
  art.src = src || v.art;
  $("shiny-toggle").classList.toggle("active", state.shiny);
  $("shiny-toggle").setAttribute("aria-pressed", String(state.shiny));
  $("animated-toggle").classList.toggle("active", state.animated);
  $("animated-toggle").setAttribute("aria-pressed", String(state.animated));
}

function renderGameSections(state: State, unavailable: Game | null): void {
  const { meta, page, variety, game } = state;
  const gameSelect = $<HTMLSelectElement>("game-select");
  gameSelect.innerHTML = meta.games.filter(g => variety.games.includes(g.key))
    .map(g => `<option value="${g.key}"${g.key === game.key ? " selected" : ""}>${escapeHtml(g.label)}</option>`).join("");
  const note = $("game-note");
  note.hidden = !unavailable;
  if (unavailable) note.textContent = t("detail.notInGame", { name: variety.label, game: unavailable.label, other: game.label });
  all(".game-label").forEach(el => { el.textContent = game.label; });

  $("era-note").innerHTML = renderEraNote(meta, game, variety);
  const types = typesFor(variety, game.gen);
  $("type-defenses").innerHTML = renderDefense(meta, game.gen, types);
  $("offense").innerHTML = renderOffense(meta, game.gen, types);
  $("ability-notes").innerHTML = renderAbilityNotes(variety.abilities);
  $("pokemon-types").innerHTML = typeTags(variety.types);

  $("moves-body").innerHTML = renderMoves(meta, state.moves, page, variety, game);
  selectMovesTab(state.movesTab);
  $("locations-body").innerHTML = renderLocations(meta, page, variety, game);
  const entries = variety.entries ?? page.entries;
  $("pokedex").hidden = entries.length === 0;
  $("entries-body").innerHTML = renderEntries(meta, entries, game);
  $("catch-rate").innerHTML = catchRateHtml(page.profile, game);
}

function selectMovesTab(tab: string): void {
  const tabs = all<HTMLButtonElement>(".moves-tab");
  if (!tabs.length) return;
  const active = tabs.find(t => t.dataset.tab === tab) || tabs[0];
  tabs.forEach(t => {
    t.classList.toggle("active", t === active);
    t.setAttribute("aria-selected", String(t === active));
  });
  all(".moves-panel").forEach(p => { p.hidden = p.dataset.tab !== active.dataset.tab; });
}

function chainKeyOf(state: State, formName: string): string {
  // Which evolution-chain row a form belongs to (mirrors server-side keyOfForm):
  // a leading region token keys a regional chain (meowth-galar), else the full
  // suffix (Battle Bond, Totem…), else default. Caps and later tokens don't count.
  const codename = state.page.codename;
  const suffix = formName.indexOf(codename + "-") === 0 ? formName.slice(codename.length + 1) : "";
  if (!suffix || suffix === "male" || suffix === "female") return "default";
  const segs = suffix.split("-");
  if (segs.indexOf("cap") < 0 && state.meta.regions.indexOf(segs[0]) >= 0) return segs[0];
  return suffix;
}

function selectVariety(state: State, variety: Variety, swapChain: boolean): void {
  state.variety = variety;
  state.shiny = false;
  state.animated = false;
  const { game, unavailable } = effectiveGame(state.meta, variety, storedGame() || state.page.defaultGame);
  state.game = game;

  const hero = $("hero");
  hero.style.setProperty("--tc", `var(--type-${variety.types[0]}, #9fa19f)`);
  hero.style.setProperty("--tc2", `var(--type-${variety.types[1] || variety.types[0]}, #9fa19f)`);
  hero.style.setProperty("--tink", `var(--ink-${variety.types[0]}, #16181d)`);
  hero.style.setProperty("--tink2", `var(--ink-${variety.types[1] || variety.types[0]}, #16181d)`);
  $("pokemon-title-name").textContent = variety.title;
  setArtwork(state);
  $("shiny-toggle").hidden = !variety.shiny;
  $("animated-toggle").hidden = !variety.anim;
  $("cry-button").hidden = !variety.cry;
  $<HTMLAudioElement>("pokemon-cry").src = variety.cry;

  const formSelect = document.getElementById("form-select") as HTMLSelectElement | null;
  if (formSelect && Array.from(formSelect.options).some(o => o.value === variety.name)) formSelect.value = variety.name;
  all<HTMLElement>(".form-step").forEach(s => s.classList.toggle("active", s.dataset.variety === variety.name));

  $("stats-body").innerHTML = renderStatsRows(variety);
  $("pokemon-bst").textContent = String(statTotal(variety));
  $("abilities-body").innerHTML = renderAbilities(variety);
  $("pokemon-height").innerHTML = heightText(variety);
  $("pokemon-weight").innerHTML = weightText(variety);
  $("ev-yield").textContent = evYield(variety);
  $("base-exp").textContent = variety.baseExp === null ? "—" : String(variety.baseExp);
  // Species-level details don't apply to battle-only forms (Mega/Gmax): they
  // can't be caught or bred, so those rows (and the Forms list) are hidden.
  $("detail-training").hidden = variety.battleOnly;
  all(".species-only").forEach(el => { el.hidden = variety.battleOnly; });
  const cluster = document.querySelector<HTMLElement>(".forms-cluster");
  if (cluster) cluster.hidden = variety.battleOnly;
  renderGameSections(state, unavailable);

  // Swap to the evolution chain matching this form (primary selection only; a
  // battle-only click keeps the current chain). Regional → its region chain,
  // special (Battle Bond, Power Construct) → its own, the rest → default.
  const rows = all(".evo-row");
  if (swapChain) {
    const key = chainKeyOf(state, variety.name);
    const target = rows.find(r => r.dataset.region === key) || rows.find(r => r.dataset.region === "default") || rows[0];
    rows.forEach(r => { r.style.display = "none"; });
    if (target) target.style.display = "";
  }
  // Move the "current" highlight to the form now shown: its battle step if this
  // is a battle-only form, otherwise the base node.
  const visibleRow = rows.find(r => r.style.display !== "none");
  if (visibleRow) {
    all(".current", visibleRow).forEach(el => el.classList.remove("current"));
    const battle = variety.battleOnly ? visibleRow.querySelector(`.evo-battle-step[data-form="${variety.hash}"]`) : null;
    // Highlight the current species' node by hash, scoped to data-base="1" so a
    // same-hash node of another species (Alolan Meowth vs Alolan Persian, both
    // #alola) isn't grabbed instead.
    const formNode = variety.hash ? visibleRow.querySelector(`.evo-step[data-base="1"][data-hash="${variety.hash}"]`) : null;
    const base = formNode || visibleRow.querySelector('.evo-step[data-base="1"]');
    if (battle) battle.classList.add("current");
    else if (base) base.classList.add("current");
    // The base node's "+" is hidden while its forms are reachable in the Forms
    // list; show it once that list is hidden (battle-only view).
    const badge = base && base.querySelector<HTMLElement>(".evo-forms-badge");
    if (badge) badge.style.display = variety.battleOnly ? "" : "none";
  }
}

function applyHash(state: State): void {
  // Form selection is driven by the URL hash so it survives refresh and is
  // linkable, and lets you switch to a battle-only form and back.
  const hash = decodeURIComponent(location.hash.slice(1));
  const variety = state.page.varieties.find(v => v.hash === hash) || state.page.varieties[0];
  if (variety.battleOnly) {
    // Reveal the chain the battle form lives in, then switch to it.
    const step = document.querySelector(`.evo-battle-step[data-form="${variety.hash}"]`);
    const row = step && step.closest<HTMLElement>(".evo-row");
    if (row) {
      all(".evo-row").forEach(r => { r.style.display = "none"; });
      row.style.display = "";
    }
    selectVariety(state, variety, false);
  } else {
    selectVariety(state, variety, true);
  }
}

async function init(): Promise<void> {
  initCommon();
  const dex = Number(document.body.dataset.dex);
  initFilteredNav(dex);
  initSectionNav();

  const cry = $<HTMLAudioElement>("pokemon-cry");
  $("cry-button").addEventListener("click", () => {
    cry.currentTime = 0;
    cry.play().catch(() => { /* blocked or unsupported format */ });
  });

  let page: PageData, meta: Meta, moves: MoveTable;
  try {
    [page, meta, moves] = await Promise.all([loadPage(dex), loadMeta(), loadMoves()]);
  } catch (e) {
    return;
  }
  const preferred = storedGame();
  const first = page.varieties[0];
  const initial = effectiveGame(meta, first, preferred || page.defaultGame);
  const state: State = { page, meta, moves, variety: first, game: initial.game, shiny: false, animated: false, movesTab: "level-up" };

  $("shiny-toggle").addEventListener("click", () => { state.shiny = !state.shiny; setArtwork(state); });
  $("animated-toggle").addEventListener("click", () => { state.animated = !state.animated; setArtwork(state); });
  const setGame = (key: string) => {
    storeGame(key);
    const result = effectiveGame(meta, state.variety, key);
    state.game = result.game;
    renderGameSections(state, result.unavailable);
  };
  $("game-select").addEventListener("change", (e) => setGame((e.target as HTMLSelectElement).value));
  $("locations-body").addEventListener("click", (e) => {
    const button = (e.target as HTMLElement).closest<HTMLElement>(".switch-game");
    if (button) setGame(button.dataset.game!);
  });
  $("moves-body").addEventListener("click", (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>(".moves-tab");
    if (!tab) return;
    state.movesTab = tab.dataset.tab!;
    selectMovesTab(state.movesTab);
  });

  const formSelect = document.getElementById("form-select") as HTMLSelectElement | null;
  const byName = (name: string) => page.varieties.find(v => v.name === name);
  if (formSelect) formSelect.addEventListener("change", () => {
    const v = byName(formSelect.value);
    if (v) selectVariety(state, v, true);
  });
  all<HTMLElement>(".form-step").forEach(step => step.addEventListener("click", () => {
    const v = byName(step.dataset.variety!);
    if (v) selectVariety(state, v, true);
  }));
  // Battle-only forms live inside the chain; route through the URL hash so
  // switching away and back always fires and the form is linkable.
  all<HTMLElement>(".evo-battle-step").forEach(step => step.addEventListener("click", () => {
    location.hash = step.dataset.form!;
  }));
  window.addEventListener("hashchange", () => applyHash(state));

  if (location.hash.slice(1)) applyHash(state);
  else if (initial.game.key !== page.defaultGame || initial.unavailable) renderGameSections(state, initial.unavailable);
}

init();
