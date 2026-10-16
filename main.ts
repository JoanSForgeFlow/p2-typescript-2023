import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { loadPokemons } from "./pokemon";
import { loadPokemonDetails } from "./pokemon-detail"
import { mapWithConcurrency } from "./concurrency";
import { cachedFetchJson } from "./fetch-cache";
import { ensureRegionsLoaded, REGION_TOKENS } from "./regions";
import { ensureTypesLoaded, ALL_TYPES } from "./types";
import { gameLabel, loadGames, loadPokedexMembers, versionLabel } from "./lib/games";
import { loadMoveTable } from "./lib/moves";
import { loadTypeChart } from "./lib/type-chart";
import { buildPageData, type BuildContext } from "./lib/page-data";
import { localName } from "./lib/localize";
import { bestGame } from "./shared/sections";
import { detailFile, dexNo } from "./shared/format";
import { LANGS, langDir, setLang, setTypeLabels, type Lang } from "./shared/i18n";
import type { Meta, MoveRow, MoveTable, PageData } from "./shared/model";
import { renderPokemonIndex } from "./render/index-page";
import { renderPokemonDetail } from "./render/detail-page";
import { SITE_URL, setAssetVersions } from "./render/components";
import { renderOfflinePage } from "./render/offline-page";

const TOTAL = 1025;

const ASSETS = ["css/base.css", "css/styles.css", "css/pokemon_styles.css", "css/types.css", "js/index.js", "js/detail.js"];

async function assetVersions(): Promise<Record<string, string>> {
  const versions: Record<string, string> = {};
  for (const path of ASSETS) {
    try {
      versions[path] = createHash("md5").update(await readFile(path)).digest("hex").slice(0, 10);
    } catch (e) {
      console.warn(`Missing ${path}; run "bun run build:client" first.`);
    }
  }
  return versions;
}

async function generateSite() {
  // Region tokens, the type list, games and moves are fetched from the API up
  // front so the rendered pages (and the client-side data) don't hardcode them.
  await Promise.all([ensureRegionsLoaded(), ensureTypesLoaded()]);
  const catalog = await loadGames();
  const [dexMembers, moveList] = await Promise.all([
    loadPokedexMembers(catalog),
    cachedFetchJson("https://pokeapi.co/api/v2/move/?limit=2000"),
  ]);
  const latestGen = Math.max(...catalog.games.map(g => g.gen));
  const [moves, chart] = await Promise.all([
    loadMoveTable(moveList.results.map((m: any) => m.name), ALL_TYPES, catalog),
    loadTypeChart(ALL_TYPES, latestGen),
  ]);
  const methods: string[] = [];

  // Every page and data file exists once per language: English at the root,
  // Spanish under es/.
  const pokemons = await loadPokemons(TOTAL);
  const pagesByLang = new Map<Lang, Map<number, PageData>>();
  for (const lang of LANGS) {
    const ctx: BuildContext = { catalog, dexMembers, moves, methods, lang };
    const langPages = new Map<number, PageData>();
    await mapWithConcurrency(pokemons, 10, async (pokemon) => {
      const details = await loadPokemonDetails(pokemon.id, lang);
      if (!details) {
        console.warn(`Failed to load details for Pokémon with ID ${pokemon.id}.`);
        return;
      }
      langPages.set(pokemon.id, await buildPageData(details, ctx));
    });
    pagesByLang.set(lang, langPages);
  }
  const pages = pagesByLang.get('en')!;

  // Which games PokeAPI actually has learnsets, encounters and Pokédex text
  // for, so pages default to a game with data and say when one is missing.
  const gameOfVersion = new Map(catalog.games.flatMap(g => g.versions.map(v => [v.key, g.key] as const)));
  const withMoves = new Set<string>();
  const withLocations = new Set<string>();
  const withEntries = new Set<string>();
  for (const page of pages.values()) {
    for (const set of page.learnsets) for (const game of Object.keys(set)) withMoves.add(game);
    for (const v of page.varieties) for (const version of Object.keys(v.encounters)) withLocations.add(gameOfVersion.get(version) || '');
    for (const e of page.entries) for (const version of e.versions) withEntries.add(gameOfVersion.get(version) || '');
  }
  const typeData = await Promise.all(ALL_TYPES.map(type => cachedFetchJson(`https://pokeapi.co/api/v2/type/${type}/`)));
  const metaFor = (lang: Lang): Meta => ({
    games: catalog.games.map((game) => {
      const { versionGroups, pokedexes, ...g } = game;
      return {
        ...g,
        label: gameLabel(catalog, game, lang),
        versions: g.versions.map(v => ({ key: v.key, label: versionLabel(catalog, v.key, lang) })),
        hasMoves: withMoves.has(g.key),
        hasLocations: withLocations.has(g.key),
        hasEntries: withEntries.has(g.key),
      };
    }),
    versionLabels: Object.fromEntries(Array.from(catalog.versionLabels.keys(), v => [v, versionLabel(catalog, v, lang)])),
    types: ALL_TYPES,
    typeIntroduced: chart.typeIntroduced,
    charts: chart.charts,
    methods,
    regions: REGION_TOKENS,
    ...(lang === 'en' ? {} : { typeLabels: Object.fromEntries(ALL_TYPES.map((type, i) => [type, localName(typeData[i].names, lang) || type])) }),
  });
  const moveTableFor = (lang: Lang): MoveTable => lang === 'en'
    ? moves.table
    : { ...moves.table, moves: moves.table.moves.map((row, i) => [moves.spanishNames[i], ...row.slice(1)] as MoveRow) };

  setAssetVersions(await assetVersions());
  for (const lang of LANGS) {
    setLang(lang);
    const dir = langDir(lang);
    const meta = metaFor(lang);
    setTypeLabels(meta.typeLabels);
    const table = moveTableFor(lang);
    const langPages = pagesByLang.get(lang)!;
    for (const page of langPages.values()) page.defaultGame = bestGame(meta, page.varieties[0]).key;
    await mkdir(`${dir}data/pokemon`, { recursive: true });
    await writeFile(`${dir}data/meta.json`, JSON.stringify(meta));
    await writeFile(`${dir}data/moves.json`, JSON.stringify(table));
    for (const page of langPages.values()) await writeFile(`${dir}data/pokemon/${dexNo(page.dex)}.json`, JSON.stringify(page));

    await writeFile(`${dir}index.html`, renderPokemonIndex(pokemons, langPages, meta, ALL_TYPES));
    await writeFile(`${dir}offline.html`, renderOfflinePage());
    await mapWithConcurrency(Array.from(langPages.values()), 10, async (page) => {
      const details = await loadPokemonDetails(page.dex, lang);
      if (details) await writeFile(`${dir}${detailFile(page.dex)}`, renderPokemonDetail(details, page, meta, table, TOTAL));
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const paths = ['', ...Array.from(pages.keys()).sort((a, b) => a - b).map(detailFile)];
  const urls = LANGS.flatMap(lang => paths.map(p => `${SITE_URL}/${langDir(lang)}${p}`));
  await writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
  await writeFile("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}

export { generateSite };

// Only run the full build when invoked directly (`bun main.ts`), so the
// modules can be imported for testing without triggering a build.
const entryPath = (globalThis as any).process?.argv?.[1];
if (entryPath && import.meta.url === `file://${entryPath}`) {
  generateSite();
}
