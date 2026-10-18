import type { Meta, MoveTable, PageData } from "../shared/model";
import { rootPath, setLang, setTypeLabels, t } from "../shared/i18n";

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

// Each language has its own pages (es/ for Spanish) and data next to them,
// so "data/..." URLs stay relative to the page.
setLang(document.documentElement.lang === "es" ? "es" : "en");

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

export const loadMeta = () => getJson<Meta>("data/meta.json").then((meta) => {
  setTypeLabels(meta.typeLabels);
  return meta;
});
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

let toastTimer = 0;

export function toast(message: string): void {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove("show"), 2600);
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Offers to install the app where the browser allows it: Chrome and Edge fire
// beforeinstallprompt, while iPhone and iPad need Share > Add to Home Screen.
// The index card waits until the third page view and can be dismissed.
function initInstall(): void {
  const link = document.getElementById("install-link");
  const card = document.getElementById("install-card");
  const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone || (!link && !card)) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let views = 1;
  let dismissed = false;
  try {
    views = Number(localStorage.getItem("pqdViews") || 0) + 1;
    localStorage.setItem("pqdViews", String(views));
    dismissed = localStorage.getItem("installDismissed") === "1";
  } catch (e) { /* storage unavailable: show the link only */ }
  let deferred: InstallPromptEvent | null = null;
  const show = () => {
    if (link) link.hidden = false;
    if (card && !dismissed && views >= 3) card.hidden = false;
  };
  const hide = () => {
    if (link) link.hidden = true;
    if (card) card.hidden = true;
  };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    show();
  });
  window.addEventListener("appinstalled", hide);
  if (ios) {
    const hint = document.getElementById("install-hint");
    if (hint) hint.textContent = t("install.ios");
    show();
  }
  const install = async () => {
    if (deferred) {
      const prompt = deferred;
      deferred = null;
      hide();
      await prompt.prompt();
    } else if (ios) {
      toast(t("install.ios"));
    }
  };
  link?.addEventListener("click", install);
  document.getElementById("install-btn")?.addEventListener("click", install);
  document.getElementById("install-close")?.addEventListener("click", () => {
    dismissed = true;
    if (card) card.hidden = true;
    try { localStorage.setItem("installDismissed", "1"); } catch (e) { /* not remembered */ }
  });
}

// The language link keeps the form being viewed (#galar…).
function initLanguageSwitch(): void {
  const link = document.getElementById("lang-switch");
  if (!link) return;
  const base = (link.getAttribute("href") || "").split("#")[0];
  const update = () => link.setAttribute("href", base + location.hash);
  update();
  window.addEventListener("hashchange", update);
}

export function initCommon(): void {
  initThemeToggle();
  initDonateWidget();
  initLanguageSwitch();
  initInstall();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`${rootPath()}sw.js`).catch(() => { /* works without offline support */ });
    });
  }
}
