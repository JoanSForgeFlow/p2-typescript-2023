import { Pokemon, loadPokemons } from "./pokemon.js";

function capitalizeFirstLetter(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function renderPokemons(pokemons: Pokemon[]): void {
  const pokedexContainer = document.getElementById("pokedex");

  if (!pokedexContainer) {
    console.error("Pokedex container not found in the DOM.");
    return;
  }

  pokemons.forEach((pokemon: Pokemon) => {
    const pokemonCard = document.createElement("div");
    pokemonCard.classList.add("pokemon-card");

    const pokemonImage = document.createElement("img");
    pokemonImage.src = pokemon.imageUrl;
    pokemonImage.alt = pokemon.displayName;
    pokemonImage.addEventListener("click", () => {
      navigateToPokemonDetails(pokemon);
    });

    const pokemonNumber = document.createElement("div");
    pokemonNumber.classList.add("pokemon-number");
    pokemonNumber.textContent = `#${pokemon.id.toString().padStart(3, "0")}`;

    const pokemonName = document.createElement("div");
    pokemonName.classList.add("pokemon-name");
    pokemonName.textContent = capitalizeFirstLetter(pokemon.name);

    pokemonCard.appendChild(pokemonImage);
    pokemonCard.appendChild(pokemonNumber);
    pokemonCard.appendChild(pokemonName);
    pokedexContainer.appendChild(pokemonCard);
  });
}

async function displayPokemons(): Promise<void> {
  const pokemons = await loadPokemons(151);
  renderPokemons(pokemons);
}

function navigateToPokemonDetails(pokemon: Pokemon): void {
  window.location.href = `pokemon-details.html?id=${pokemon.id}`;
}

displayPokemons();
