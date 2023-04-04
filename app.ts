import { loadPokemons } from "./pokemon.js";

async function displayPokemons() {
  const pokemons = await loadPokemons(151);
  console.log(pokemons);
}

displayPokemons();
