// End-to-end checks against the generated site (run `bun run build` first).
// Needs a local Chrome; set CHROME_PATH if it isn't /usr/bin/google-chrome.
import puppeteer, { type Page } from "puppeteer-core";
import type { AddressInfo } from "net";
import { serve } from "../scripts/serve";
import socialCard from "../functions/og";

const server = await serve(".", 0);
const ROOT = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});

let failures = 0;
const pageErrors: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail && !ok ? ` (${detail})` : ""}`);
  if (!ok) failures++;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function open(path: string, width = 390): Promise<Page> {
  const page = await browser.newPage();
  page.on("pageerror", (e) => pageErrors.push(`${path}: ${(e as Error).message}`));
  await page.setRequestInterception(true);
  page.on("request", (r) => (/googlesyndication|_vercel/.test(r.url()) ? r.abort() : r.continue()));
  await page.setViewport({ width, height: 844, isMobile: width < 800, hasTouch: width < 800 });
  await page.goto(ROOT + path, { waitUntil: "networkidle2" });
  return page;
}

const noSidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const fitsScreen = (page: Page, selector: string) =>
  page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
  });

// Layout: nothing may scroll sideways on phones, tablets or desktop.
for (const width of [360, 390, 768, 1024, 1440]) {
  const index = await open("index.html", width);
  check(`index fits at ${width}px`, await noSidewaysScroll(index));
  if (width < 1080) {
    await index.click("#filters-open");
    await wait(400);
    check(`filters sheet fits at ${width}px`, await noSidewaysScroll(index));
    await index.click("#filters-apply");
    await wait(300);
  }
  await index.click("#compare-mode-btn");
  const cards = await index.$$('.pokemon-grid li:not([style*="none"]) .pokemon-card');
  for (const card of [cards[5], cards[8]]) {
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await card.click();
  }
  check(`compare bar fits at ${width}px`, await fitsScreen(index, "#compare-bar"));
  await index.close();
  for (const dex of ["0006", "0133", "0479", "0890"]) {
    const detail = await open(`${dex}_details.html`, width);
    check(`#${dex} fits at ${width}px`, await noSidewaysScroll(detail));
    const overflow = await detail.$eval(".evolution-chain", (el) => el.scrollWidth - el.clientWidth);
    check(`#${dex} evolution fits at ${width}px`, overflow <= 1, `${overflow}px`);
    await detail.close();
  }
}

// Search and filters.
const index = await open("index.html");
const visibleNames = () => index.$$eval(".pokemon-grid li", (lis) =>
  lis.filter((li) => li.style.display !== "none").map((li) => li.querySelector("h2")!.textContent));
const search = async (text: string) => {
  await index.$eval("#search-input", (el, t) => {
    (el as HTMLInputElement).value = t;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
  await wait(100);
};
await search("25");
check("search by number", (await visibleNames()).join() === "Pikachu");
await search("flabebe");
check("search ignores accents", (await visibleNames()).includes("Flabébé"));
await search("mr mime");
check("search ignores punctuation", (await visibleNames()).includes("Mr. Mime"));
await search("");
await index.select("#game-filter", "firered-leafgreen");
await wait(200);
const count = parseInt(await index.$eval("#results-count", (e) => e.textContent || ""));
check("game filter (FireRed & LeafGreen)", count >= 380 && count <= 390, String(count));
await index.$eval('[data-clear="game"]', (e) => (e as HTMLElement).click());
await wait(200);

// Compare uses the generated data, not PokeAPI.
await index.click("#compare-mode-btn");
const cards = await index.$$('.pokemon-grid li:not([style*="none"]) .pokemon-card');
for (const card of [cards[5], cards[8]]) {
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await card.click();
}
await index.click("#compare-btn");
await wait(800);
check("compare", (await index.$$eval(".compare-pokemon h3", (h) => h.map((e) => e.textContent).join())) === "Charizard,Blastoise");
await index.close();

// Detail pages follow the selected game.
const weak = (page: Page) => page.$$eval(".mu-weak .mu-chip", (cs) =>
  cs.map((c) => c.firstChild!.textContent + c.querySelector(".mu-x")!.textContent).sort().join());
let detail = await open("0006_details.html");
check("default game", (await detail.$eval("#game-select", (s) => (s as HTMLSelectElement).value)) === "scarlet-violet");
await detail.select("#game-select", "red-blue");
await wait(300);
check("Gen 1 type chart note", ((await detail.$eval("#era-note", (e) => e.textContent)) || "").includes("Gen 1"));
check("Red & Blue TM numbers", (await detail.$$eval('.moves-panel[data-tab="machine"] tbody .mv-lv', (cs) => cs.map((c) => c.textContent)))
  .every((t) => /^(TM|HM)\d+$/.test(t || "")));
await detail.close();
detail = await open("0035_details.html");
check("Clefairy is Normal in Red & Blue", (await weak(detail)) === "fighting2×");
await detail.evaluate(() => localStorage.removeItem("pokedexGame"));
await detail.close();
detail = await open("0052_details.html#galar");
await wait(300);
check("form from hash", (await detail.$eval("#pokemon-title-name", (e) => e.textContent)) === "Galarian Meowth");
check("form matchups", (await weak(detail)) === "fighting2×,fire2×,ground2×");
await detail.close();
detail = await open("0006_details.html#mega-x");
await wait(300);
check("battle-only form", (await detail.$eval("#detail-training", (e) => (e as HTMLElement).hidden))
  && (await detail.$eval('.evo-battle-step[data-form="mega-x"]', (e) => e.classList.contains("current"))));
check("ability note (Levitate)", (await (await open("0479_details.html")).$eval("#ability-notes", (e) => e.textContent || "")).includes("Levitate"));

// Spanish pages live under es/ and are chosen with the language button.
for (const width of [360, 390, 1024]) {
  for (const path of ["es/index.html", "es/0006_details.html", "es/0133_details.html", "es/0890_details.html"]) {
    const page = await open(path, width);
    check(`${path} fits at ${width}px`, await noSidewaysScroll(page));
    await page.close();
  }
}
const lang = await open("index.html");
await Promise.all([lang.waitForNavigation({ waitUntil: "networkidle2" }), lang.click("#lang-switch")]);
check("language button opens the Spanish index", new URL(lang.url()).pathname === "/es/index.html"
  && (await lang.$eval("html", (h) => h.lang)) === "es");
await lang.goto(ROOT + "0052_details.html#galar", { waitUntil: "networkidle2" });
check("Spanish choice is remembered", new URL(lang.url()).pathname === "/es/0052_details.html", lang.url());
await wait(300);
check("Spanish form name", (await lang.$eval("#pokemon-title-name", (e) => e.textContent)) === "Meowth de Galar");
check("Spanish matchups", (await weak(lang)) === "Fuego2×,Lucha2×,Tierra2×", await weak(lang));
await Promise.all([lang.waitForNavigation({ waitUntil: "networkidle2" }), lang.click("#lang-switch")]);
check("English button keeps the form", new URL(lang.url()).pathname === "/0052_details.html" && new URL(lang.url()).hash === "#galar", lang.url());
await lang.evaluate(() => localStorage.removeItem("pokedexLang"));
await lang.close();
const spanish = await open("es/index.html");
const spanishSearch = async (text: string) => {
  await spanish.$eval("#search-input", (el, t) => {
    (el as HTMLInputElement).value = t;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, text);
  await wait(100);
  return spanish.$$eval(".pokemon-grid li", (lis) =>
    lis.filter((li) => li.style.display !== "none").map((li) => li.querySelector("h2")!.textContent).join());
};
check("Spanish search by Spanish name", (await spanishSearch("colmilargo")) === "Colmilargo");
check("Spanish search by English name", (await spanishSearch("great tusk")) === "Colmilargo");
await spanish.close();

// Titles say what people search for.
const titled = await open("es/0006_details.html");
check("Spanish detail title", (await titled.title()) === "Charizard: debilidades, movimientos y dónde encontrarlo · PokeQuickDex", await titled.title());
await titled.close();

// Type chart page: calculator for one or two types and the chart of each generation.
for (const width of [360, 390, 1024]) {
  for (const path of ["types.html", "es/types.html"]) {
    const page = await open(path, width);
    check(`${path} fits at ${width}px`, await noSidewaysScroll(page));
    const clipped = await page.$$eval(".type-pick", (bs) => bs.filter((b) => b.scrollWidth > b.clientWidth + 0.5).length);
    check(`${path} type names fit at ${width}px`, clipped === 0, `${clipped} clipped`);
    await page.close();
  }
}
const chart = await open("types.html");
const pick = (type: string) => chart.click(`.type-pick[data-type="${type}"]`);
await pick("water");
await pick("ground");
check("calculator: Water/Ground is 4x weak to Grass and immune to Electric",
  (await weak(chart)) === "grass4×" && (await chart.$eval(".mu-immune", (e) => e.textContent || "")).includes("electric"));
check("calculator selection is linkable", new URL(chart.url()).hash === "#water-ground");
await pick("fire");
check("a third type replaces the oldest", new URL(chart.url()).hash === "#ground-fire");
await chart.select("#game-select", "red-blue");
await wait(200);
check("Gen 1 chart has no Dark, Steel or Fairy", (await chart.$$eval("#type-chart thead th", (th) => th.length)) === 16
  && await chart.$eval('.type-pick[data-type="fairy"]', (b) => (b as HTMLButtonElement).disabled));
await chart.evaluate(() => localStorage.removeItem("pokedexGame"));
await chart.close();

// Share and install.
const sharing = await open("0025_details.html", 1280);
await sharing.evaluate(() => { (navigator as { share?: unknown }).share = undefined; });
await sharing.click("#share-btn");
await wait(300);
check("share copies the link when there is no share sheet", ((await sharing.$eval("#toast", (e) => e.textContent).catch(() => "")) || "").length > 0);
await sharing.close();
const installing = await open("index.html");
await installing.evaluate(() => {
  localStorage.setItem("pqdViews", "5");
  localStorage.removeItem("installDismissed");
});
await installing.reload({ waitUntil: "networkidle2" });
await installing.evaluate(() => {
  const prompt = Object.assign(new Event("beforeinstallprompt"), {
    prompt: () => { (window as { prompted?: boolean }).prompted = true; return Promise.resolve(); },
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  window.dispatchEvent(prompt);
});
check("install card shows when the browser can install", !(await installing.$eval("#install-card", (e) => (e as HTMLElement).hidden)));
await installing.click("#install-btn");
check("install button opens the browser prompt", await installing.evaluate(() => (window as { prompted?: boolean }).prompted === true));
await installing.evaluate(() => localStorage.removeItem("pqdViews"));
await installing.close();

// Social card image (the Vercel function, run here against the local site).
const card = await socialCard(new Request(`${ROOT}api/og?dex=6&lang=es`));
const bytes = new Uint8Array(await card.arrayBuffer());
check("social card renders a PNG", card.status === 200 && bytes[0] === 0x89 && bytes[1] === 0x50, String(card.status));
check("social card rejects unknown Pokémon", (await socialCard(new Request(`${ROOT}api/og?dex=0`))).status === 404);

// Installable app.
const pwa = await open("index.html");
await pwa.evaluate(() => navigator.serviceWorker.ready);
await pwa.reload({ waitUntil: "networkidle2" });
check("service worker active", await pwa.evaluate(() => !!navigator.serviceWorker.controller));
// Offline for the page and the service worker (which has its own network).
const worker = await (await browser.waitForTarget((t) => t.type() === "service_worker")).createCDPSession();
const setOffline = async (offline: boolean) => {
  await pwa.setOfflineMode(offline);
  await worker.send("Network.emulateNetworkConditions", { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
};
await worker.send("Network.enable");
await setOffline(true);
await pwa.goto(ROOT, { waitUntil: "domcontentloaded" });
check("offline home page", (await pwa.$eval("h1", (e) => e.textContent).catch(() => "")) === "Pokédex");
await pwa.goto(ROOT + "es/0500_details.html", { waitUntil: "domcontentloaded" });
check("Spanish offline page", (await pwa.$eval("h2", (e) => e.textContent).catch(() => "")) === "Sin conexión");
await setOffline(false);
const manifest = await (await fetch(ROOT + "manifest.webmanifest")).json();
check("manifest icons exist", (await Promise.all(manifest.icons.map((i: any) => fetch(ROOT + i.src)))).every((r) => r.ok));

check("no JavaScript errors", pageErrors.length === 0, pageErrors.join(" | "));
await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
