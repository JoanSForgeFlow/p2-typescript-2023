import { writeFile } from "fs/promises";
import { loadPokemons } from "./pokemon.ts";
import { loadPokemonDetails, PokemonDetails } from "./pokemon-detail.ts"

function renderPokemonIndex(pokemons: Array<Pokemon>): string {
  function generateTypeOptions(): string {
    const types = [
      'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel',
      'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy',
    ];
    return types.map(type => `<option value="${type.toLowerCase()}">${type}</option>`).join('\n');
  }

  const pokemonLinks = pokemons.map(
      (pokemon) => `
      <li>
        <a class="pokemon-card" href="${String(pokemon.id).padStart(3, '0')}_${pokemon.name}.html" data-types='${JSON.stringify(pokemon.types)}'>
          <div class="pokemon-id">#${String(pokemon.id).padStart(3, '0')}</div>
          <img src="${pokemon.imageUrl}" alt="${pokemon.name}" />
          <h2>${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h2>
          <div class="pokemon-types">${pokemon.types.map(type => `<span class="tag">${type}</span>`).join(' ')}</div>
        </a>
      </li>`
    ).join('\n');
  
    return `
  <html>
    ${head("Pokédex")}
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #ffefef;
      }
      h1 {
        background-color: #ff0000;
        color: #ffffff;
        text-align: center;
        padding: 16px;
        margin: 0;
      }
      ul {
        list-style: none;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: center;
      }
      li {
        margin: 0;
      }
      .pokemon-card {
        display: inline-block;
        text-decoration: none;
        color: #333;
        background-color: #f8f8f8;
        border-radius: 8px;
        padding: 16px;
        width: 200px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        text-align: center;
        transition: transform 0.2s;
      }
      .pokemon-card:hover {
        transform: translateY(-4px);
      }
      .pokemon-id {
        font-size: 24px;
        font-weight: bold;
        color: #777;
      }
      .search-filter-container {
        display: flex;
        justify-content: center;
        gap: 16px;
        padding: 16px;
      }
      .search-input,
      .type-select {
        padding: 8px;
        font-size: 14px;
        border-radius: 4px;
        border: 1px solid #ccc;
        outline: none;
      }
      .tag {
        background-color: #ccc;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        color: #333;
        margin-top: 8px;
        display: inline-block;
      }
    </style>
    <body>
      <h1>Pokédex</h1>
      <div class="search-filter-container">
        <input type="text" id="search-input" class="search-input" placeholder="Search Pokémon..." />
        <select id="type-select" class="type-select">
          <option value="">Filter by type</option>
          ${generateTypeOptions()}
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
    const types = pokemon.types.map(type => `<span class="tag ${type.toLowerCase()}">${type}</span>`).join(' ');
    const abilities = pokemon.abilities.join(', ');
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
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #ffefef;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      h1 {
        background-color: #ff0000;
        color: #ffffff;
        text-align: center;
        padding: 16px;
        margin: 0;
        width: 100%;
      }
      .pokemon-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 80%;
        max-width: 1000px;
        margin-top: 16px;
      }
      img {
        width: 70%;
        max-width: 500px;
      }
      table {
        background-color: #f8f8f8;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-collapse: collapse;
        margin-left: 16px;
        width: 100%;
      }
      td {
        padding: 8px;
        border: 1px solid #ccc;
      }
      .attribute {
        font-weight: bold;
        background-color: #ff0000;
        color: #ffffff;
      }
      .value {
        background-color: #ffd6d6;
        color: #000;
      }
      .back-button {
        background-color: #ff0000;
        color: #ffffff;
        padding: 8px 16px;
        font-size: 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 16px;
        text-decoration: none;
      }
      .back-button:hover {
        background-color: #cc0000;
      }
      .tag {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        margin-right: 8px;
        margin-bottom: 8px;
        font-weight: bold;
        text-transform: uppercase;
        font-size: 12px;
        letter-spacing: 1px;
        white-space: nowrap;
      }
      .normal {
        background-color: #A8A878;
        color: #fff;
      }
      .fighting {
        background-color: #C03028;
        color: #fff;
      }
      .flying {
        background-color: #A890F0;
        color: #fff;
      }
      .poison {
        background-color: #A040A0;
        color: #fff;
      }
      .ground {
        background-color: #E0C068;
        color: #fff;
      }
      .rock {
        background-color: #B8A038;
        color: #fff;
      }
      .bug {
        background-color: #A8B820;
        color: #fff;
      }
      .ghost {
        background-color: #705898;
        color: #fff;
      }
      .steel {
        background-color: #B8B8D0;
        color: #fff;
      }
      .fire {
        background-color: #F08030;
        color: #fff;
      }
      .water {
        background-color: #6890F0;
        color: #fff;
      }
      .grass {
        background-color: #78C850;
        color: #fff;
      }
      .electric {
        background-color: #F8D030;
        color: #fff;
      }
      .psychic {
        background-color: #F85888;
        color: #fff;
      }
      .ice {
        background-color: #98D8D8;
        color: #fff;
      }
      .dragon {
        background-color: #7038F8;
        color: #fff;
      }
      .dark {
        background-color: #705848;
        color: #fff;
      }
      .fairy {
        background-color: #EE99AC;
        color: #fff;
      }
      .description {
        background-color: #f8f8f8;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        margin-top: 16px;
        font-size: 14px;
        line-height: 1.4;
        text-align: justify;
        width: 80%;
        max-width: 970px;
        margin-bottom: 16px;
      }
      .abilities-table {
        max-width: 980px;
      }
      .abilities-text {
        font-size: 14px;
      }
      .section-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 8px;
        margin-top: 24px;
      }
    </style>
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
</head>`;
}

(async () => {
  const pokemons = await loadPokemons(20);
  const indexHtml = renderPokemonIndex(pokemons);
  await writeFile("index.html", indexHtml);

  for (const pokemon of pokemons) {
    const pokemonDetail = await loadPokemonDetails(pokemon.id)
    const detailHtml = renderPokemonDetail(pokemonDetail);
    await writeFile(`${String(pokemonDetail.id).padStart(3, '0')}_${pokemonDetail.name}.html`, detailHtml);
  }
})();
