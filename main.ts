import { writeFile } from "fs/promises";
import { loadPokemons } from "./pokemon.ts";
import { loadPokemonDetails, PokemonDetails } from "./pokemon-detail.ts"

function renderPokemonIndex(pokemons: Array<Pokemon>): string {

  const pokemonLinks = pokemons.map(
      (pokemon) => `
      <li>
        <a class="pokemon-card" href="${String(pokemon.id).padStart(4, '0')}_${pokemon.name}.html" data-types='${JSON.stringify(pokemon.types)}'>
          <div class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
          <img src="${pokemon.imageUrl}" alt="${pokemon.name}" />
          <h2>${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h2>
          <div class="pokemon-types">${(pokemon.types || []).map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ')}</div>
        </a>
      </li>`
    ).join('\n');
  
    return `
  <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>"Pokédex"</title>
      <link rel="stylesheet" href="css/styles.css">
    </head>
    <body>
      <h1>Pokédex</h1>
      <div class="search-filter-container">
        <input type="text" id="search-input" class="search-input" placeholder="Search Pokémon..." />
        <select id="type-select" class="type-select">
          <option value="">All types</option>
          <option value="normal" class="tag normal">Normal</option>
          <option value="fighting" class="tag fighting">Fighting</option>
          <option value="flying" class="tag flying">Flying</option>
          <option value="poison" class="tag poison">Poison</option>
          <option value="ground" class="tag ground">Ground</option>
          <option value="rock" class="tag rock">Rock</option>
          <option value="bug" class="tag bug">Bug</option>
          <option value="ghost" class="tag ghost">Ghost</option>
          <option value="steel" class="tag steel">Steel</option>
          <option value="fire" class="tag fire">Fire</option>
          <option value="water" class="tag water">Water</option>
          <option value="grass" class="tag grass">Grass</option>
          <option value="electric" class="tag electric">Electric</option>
          <option value="psychic" class="tag psychic">Psychic</option>
          <option value="ice" class="tag ice">Ice</option>
          <option value="dragon" class="tag dragon">Dragon</option>
          <option value="dark" class="tag dark">Dark</option>
          <option value="fairy" class="tag fairy">Fairy</option>
        </select>
      </div>
      <ul>
        ${pokemonLinks}
      </ul>
      <script>
        function filterPokemons() {
          const searchText = document.getElementById("search-input").value.toLowerCase();
          const selectedType = document.getElementById("type-select").value;
          const pokemonCards = document.querySelectorAll(".pokemon-card");
          for (const pokemonCard of pokemonCards) {
            const pokemonName = pokemonCard.querySelector("h2").textContent.toLowerCase();
            const pokemonTypes = JSON.parse(pokemonCard.dataset.types);
            const nameMatch = searchText === "" || pokemonName.includes(searchText);
            const typeMatch = selectedType === "" || pokemonTypes.includes(selectedType);
            if (nameMatch && typeMatch) {
              pokemonCard.parentElement.style.display = "block";
            } else {
              pokemonCard.parentElement.style.display = "none";
            }
          }
        }
        document.getElementById("search-input").addEventListener("input", filterPokemons);
        document.getElementById("type-select").addEventListener("input", filterPokemons);
      </script>
      </body>
  </html>`;
  }

  function renderPokemonDetail(pokemon: PokemonDetails): string {
    const types = (pokemon.types || []).map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const superWeakTo = pokemon.superWeakTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const weakTo = pokemon.weakTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const normal = pokemon.normal.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const resistantTo = pokemon.resistantTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const superResistantTo = pokemon.superResistantTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const immuneTo = pokemon.immuneTo.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const heightInMeters = (pokemon.height / 10).toFixed(1) + " m";
    const weightInKilograms = (pokemon.weight / 10).toFixed(1) + " kg";
    const abilitiesTableRows = pokemon.abilities
      .map(ability => `
        <tr>
          <td class="attribute abilities-text">${ability.name.charAt(0).toUpperCase() + ability.name.slice(1)}:</td>
          <td class="value abilities-text">${ability.description}</td>
        </tr>`)
      .join('\n');
  
    return `
  <html>
    ${head(pokemon.name)}
    <body>
      <h1>${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h1>
      <h2 class="section-title">Pokédex Description</h2>
      <p class="description">${pokemon.pokedexDescription}</p>
      <div class="pokemon-container">
        <img src="${pokemon.officialArtworkUrl}" alt="${pokemon.name}" />
        <table>
          <tr><td class="attribute">Type:</td><td class="value">${types}</td></tr>
          <tr><td class="attribute">Height:</td><td class="value">${heightInMeters}</td></tr>
          <tr><td class="attribute">Weight:</td><td class="value">${weightInKilograms}</td></tr>
          <tr><td class="attribute">Super Weak To:</td><td class="value">${superWeakTo}</td></tr>
          <tr><td class="attribute">Weak To:</td><td class="value">${weakTo}</td></tr>
          <tr><td class="attribute">Normal Damage:</td><td class="value">${normal}</td></tr>
          <tr><td class="attribute">Resistant To:</td><td class="value">${resistantTo}</td></tr>
          <tr><td class="attribute">Super Resistant To:</td><td class="value">${superResistantTo}</td></tr>
          <tr><td class="attribute">Immune To:</td><td class="value">${immuneTo}</td></tr>
        </table>
      </div>
      <h2 class="section-title">Pokémon Abilities</h2>
      <table class="abilities-table">
        ${abilitiesTableRows}
      </table>
      <a href="index.html" class="back-button">Back to Menu</a>
    </body>
  </html>`;
  }

function head(title: string): string {
  return `
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="css/pokemon_styles.css">
</head>`;
}

(async () => {
  const pokemons = await loadPokemons(151);
  const indexHtml = renderPokemonIndex(pokemons);
  await writeFile("index.html", indexHtml);

  for (const pokemon of pokemons) {
    const pokemonDetail = await loadPokemonDetails(pokemon.id)
    const detailHtml = renderPokemonDetail(pokemonDetail);
    await writeFile(`${String(pokemonDetail.id).padStart(4, '0')}_${pokemonDetail.name}.html`, detailHtml);
  }
})();
