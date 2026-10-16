import { mkdir, writeFile } from "fs/promises";
import { loadPokemons } from "./pokemon";
import { loadPokemonDetails } from "./pokemon-detail"
import { mapWithConcurrency } from "./concurrency";
import { cachedFetchJson } from "./fetch-cache";
import { ensureRegionsLoaded, REGION_TOKENS } from "./regions";
import { ensureTypesLoaded, ALL_TYPES } from "./types";
import { loadGames, loadPokedexMembers } from "./lib/games";
import { loadMoveTable } from "./lib/moves";
import { loadTypeChart } from "./lib/type-chart";
import { buildPageData, type BuildContext } from "./lib/page-data";
import { bestGame } from "./shared/sections";
import { detailFile, dexNo } from "./shared/format";
import type { Meta, PageData } from "./shared/model";
import { renderPokemonIndex } from "./render/index-page";
import { renderPokemonDetail } from "./render/detail-page";
import { SITE_URL } from "./render/components";

const TOTAL = 1025;

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
  const ctx: BuildContext = { catalog, dexMembers, moves, methods: [] };

  const pokemons = await loadPokemons(TOTAL);
  const pages = new Map<number, PageData>();
  await mapWithConcurrency(pokemons, 10, async (pokemon) => {
    const details = await loadPokemonDetails(pokemon.id);
    if (!details) {
      console.warn(`Failed to load details for Pokémon with ID ${pokemon.id}.`);
      return;
    }
    pages.set(pokemon.id, await buildPageData(details, ctx));
  });

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
  const meta: Meta = {
    games: catalog.games.map(({ versionGroups, pokedexes, ...g }) => ({
      ...g,
      hasMoves: withMoves.has(g.key),
      hasLocations: withLocations.has(g.key),
      hasEntries: withEntries.has(g.key),
    })),
    versionLabels: Object.fromEntries(catalog.versionLabels),
    types: ALL_TYPES,
    typeIntroduced: chart.typeIntroduced,
    charts: chart.charts,
    methods: ctx.methods,
    regions: REGION_TOKENS,
  };
  for (const page of pages.values()) page.defaultGame = bestGame(meta, page.varieties[0]).key;

  await mkdir("data/pokemon", { recursive: true });
  await writeFile("data/meta.json", JSON.stringify(meta));
  await writeFile("data/moves.json", JSON.stringify(moves.table));
  for (const page of pages.values()) await writeFile(`data/pokemon/${dexNo(page.dex)}.json`, JSON.stringify(page));

  await writeFile("index.html", renderPokemonIndex(pokemons, pages, meta, ALL_TYPES));
  await mapWithConcurrency(Array.from(pages.values()), 10, async (page) => {
    const details = await loadPokemonDetails(page.dex);
    if (details) await writeFile(detailFile(page.dex), renderPokemonDetail(details, page, meta, moves.table, TOTAL));
  });

  const today = new Date().toISOString().slice(0, 10);
  const paths = ['', ...Array.from(pages.keys()).sort((a, b) => a - b).map(detailFile)];
  await writeFile("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(p => `  <url><loc>${SITE_URL}/${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
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
