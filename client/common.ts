import type { Meta, MoveTable, PageData } from "../shared/model";

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

const GAME_KEY = "pokedexGame";

export function storedGame(): string {
  try { return localStorage.getItem(GAME_KEY) || ""; } catch (e) { return ""; }
}

export function storeGame(key: string): void {
  try {
    if (key) localStorage.setItem(GAME_KEY, key);
    else localStorage.removeItem(GAME_KEY);
  } catch (e) { /* storage unavailable: the choice just isn't remembered */ }
}

const cache = new Map<string, Promise<any>>();

function getJson<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.json();
    }).catch((e) => {
      cache.delete(url);
      throw e;
    }));
  }
  return cache.get(url)!;
}

export const loadMeta = () => getJson<Meta>("data/meta.json");
export const loadMoves = () => getJson<MoveTable>("data/moves.json");
export const loadPage = (dex: number) => getJson<PageData>(`data/pokemon/${String(dex).padStart(4, "0")}.json`);

export function initThemeToggle(): void {
  $("dark-mode-toggle").addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark-mode");
    try { localStorage.setItem("darkMode", String(isDark)); } catch (e) { /* not remembered */ }
  });
}

export function initDonateWidget(): void {
  const widget = $("donate-widget");
  const fab = $<HTMLButtonElement>("donate-fab");
  const card = $("donate-card");
  if (!widget || !fab || !card) return;
  const setOpen = (open: boolean) => {
    card.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    if (open) fab.classList.remove("pulse");
  };
  let dismissed = false;
  try { dismissed = !!sessionStorage.getItem("donateDismissed"); } catch (e) { /* show the pulse */ }
  if (!dismissed) setTimeout(() => fab.classList.add("pulse"), 3000);
  fab.addEventListener("click", () => setOpen(card.hidden !== false));
  $("donate-close").addEventListener("click", () => {
    setOpen(false);
    try { sessionStorage.setItem("donateDismissed", "true"); } catch (e) { /* not remembered */ }
  });
  document.addEventListener("click", (e) => {
    if (!widget.contains(e.target as Node)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}

export function initCommon(): void {
  initThemeToggle();
  initDonateWidget();
}
