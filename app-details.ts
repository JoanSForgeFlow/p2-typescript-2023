import { PokemonDetails, loadPokemonDetails } from "./pokemon-detail.js";

function capitalizeFirstLetter(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getPokemonIdFromUrl(): number | null {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  return id ? parseInt(id) : null;
}

async function displayPokemonDetails(): Promise<void> {
  const id = getPokemonIdFromUrl();
  if (id === null) {
    console.error("No Pokemon ID found in the URL.");
    return;
  }

  const pokemonDetails = await loadPokemonDetails(id);
  if (!pokemonDetails) {
    console.error("Failed to load Pokemon details.");
    return;
  }

  renderPokemonDetails(pokemonDetails);
}

function renderPokemonDetails(pokemonDetails: PokemonDetails) {
    const pokemonDetailContainer = document.getElementById("pokemon-detail");
  
    if (!pokemonDetailContainer) {
      console.error("Pokemon detail container not found in the DOM.");
      return;
    }
  
    const pokemonDetailsDiv = document.createElement("div");
    pokemonDetailsDiv.classList.add("pokemon-details");
  
    const pokemonImage = document.createElement("img");
    pokemonImage.src = pokemonDetails.imageUrl;
    pokemonImage.alt = `${pokemonDetails.id}. ${pokemonDetails.name}`;
  
    const pokemonNumber = document.createElement("div");
    pokemonNumber.classList.add("pokemon-number");
    pokemonNumber.textContent = `#${pokemonDetails.id.toString().padStart(3, "0")}`;
  
    const pokemonName = document.createElement("div");
    pokemonName.classList.add("pokemon-name");
    pokemonName.textContent = capitalizeFirstLetter(pokemonDetails.name);
  
    const officialArtwork = document.createElement("img");
    officialArtwork.src = pokemonDetails.officialArtworkUrl;
    officialArtwork.alt = `${pokemonDetails.id}. ${pokemonDetails.name} official artwork`;
  
    const height = document.createElement("div");
    height.textContent = `Height: ${pokemonDetails.height / 10} m`;
  
    const weight = document.createElement("div");
    weight.textContent = `Weight: ${pokemonDetails.weight / 10} kg`;
  
    const types = document.createElement("div");
    types.textContent = `Types: ${pokemonDetails.types.map(capitalizeFirstLetter).join(", ")}`;
  
    const abilities = document.createElement("div");
    abilities.textContent = `Abilities: ${pokemonDetails.abilities.map(capitalizeFirstLetter).join(", ")}`;
  
    pokemonDetailsDiv.appendChild(pokemonImage);
    pokemonDetailsDiv.appendChild(pokemonNumber);
    pokemonDetailsDiv.appendChild(pokemonName);
    pokemonDetailsDiv.appendChild(officialArtwork);
    pokemonDetailsDiv.appendChild(height);
    pokemonDetailsDiv.appendChild(weight);
    pokemonDetailsDiv.appendChild(types);
    pokemonDetailsDiv.appendChild(abilities);
  
    pokemonDetailContainer.appendChild(pokemonDetailsDiv);
  }
  

displayPokemonDetails();

const backButton = document.getElementById("back-button");
if (backButton) {
  backButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}
