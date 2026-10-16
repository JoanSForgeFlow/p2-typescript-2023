import { writeFile } from "fs/promises";
import { loadPokemons } from "./pokemon";
import { loadPokemonDetails } from "./pokemon-detail"
import { mapWithConcurrency } from "./concurrency";
import { ensureRegionsLoaded } from "./regions";
import { ensureTypesLoaded } from "./types";
import { renderPokemonIndex } from "./render/index-page";
import { renderPokemonDetail } from "./render/detail-page";

async function generateSite() {
  // Region tokens and the type list are fetched from the API up front so the
  // rendered pages (and the injected client-side lists) don't hardcode them.
  await Promise.all([ensureRegionsLoaded(), ensureTypesLoaded()]);
  const pokemons = await loadPokemons(1025);
  const indexHtml = renderPokemonIndex(pokemons);
  await writeFile("index.html", indexHtml);

  await mapWithConcurrency(pokemons, 10, async (pokemon) => {
    const pokemonDetail = await loadPokemonDetails(pokemon.id);
    if (!pokemonDetail) {
      console.warn(`Failed to load details for Pokémon with ID ${pokemon.id}.`);
      return;
    }
    const detailHtml = renderPokemonDetail(pokemonDetail, 1025);
    await writeFile(`${String(pokemonDetail.id).padStart(4, '0')}_details.html`, detailHtml);
  });
}

export { renderPokemonIndex, renderPokemonDetail, generateSite };

// Only run the full build when invoked directly (`npx tsx main.ts`), so the
// render functions can be imported for testing without triggering a build.
// `process` is read off globalThis so this needs no @types/node to type-check.
const entryPath = (globalThis as any).process?.argv?.[1];
if (entryPath && import.meta.url === `file://${entryPath}`) {
  generateSite();
}
