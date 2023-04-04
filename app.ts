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
      showPokemonDetails(pokemon);
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

function renderPokemonDetails(pokemon: Pokemon) {
  const pokemonDetails = document.createElement("div");
  pokemonDetails.classList.add("pokemon-details");

  const pokemonImage = document.createElement("img");
  pokemonImage.src = pokemon.imageUrl;
  pokemonImage.alt = pokemon.displayName;

  const pokemonNumber = document.createElement("div");
  pokemonNumber.classList.add("pokemon-number");
  pokemonNumber.textContent = `#${pokemon.id.toString().padStart(3, "0")}`;

  const pokemonName = document.createElement("div");
  pokemonName.classList.add("pokemon-name");
  pokemonName.textContent = capitalizeFirstLetter(pokemon.name);

  const officialArtwork = document.createElement("img");
  officialArtwork.src = pokemon.officialArtworkUrl ?? '';
  officialArtwork.alt = `${pokemon.displayName} official artwork`;

  pokemonDetails.appendChild(pokemonImage);
  pokemonDetails.appendChild(pokemonNumber);
  pokemonDetails.appendChild(pokemonName);
  pokemonDetails.appendChild(officialArtwork);

  document.body.appendChild(pokemonDetails);
}

async function showPokemonDetails(pokemon: Pokemon): Promise<void> {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
    const data = await response.json();
    const officialArtworkUrl = data.sprites.other["official-artwork"].front_default;
    pokemon.officialArtworkUrl = officialArtworkUrl;
    renderPokemonDetails(pokemon);
  } catch (error) {
    console.error("Error fetching data from the PokeAPI:", error);
  }
}

displayPokemons();
