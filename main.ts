import { writeFile } from "fs/promises";
import { loadPokemons, Pokemon } from "./pokemon";
import { loadPokemonDetails, PokemonDetails } from "./pokemon-detail"

function toPokemonType(type: string): PokemonType {
  return type as PokemonType;
}

function renderPokemonIndex(pokemons: Array<Pokemon>): string {

  const pokemonLinks = pokemons.map(
      (pokemon) => `
      <li>
      <a class="pokemon-card" href="${String(pokemon.id).padStart(4, '0')}_${pokemon.codename}.html" data-types='${JSON.stringify(pokemon.types)}' data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' style="background-image: linear-gradient(135deg, ${getTypeColor(toPokemonType(pokemon.types[0]))} 0%, ${getTypeColor(toPokemonType(pokemon.types[0]))} 50%, ${pokemon.types[1] ? getTypeColor(toPokemonType(pokemon.types[1])) : getTypeColor(toPokemonType(pokemon.types[0]))} 50%, ${pokemon.types[1] ? getTypeColor(toPokemonType(pokemon.types[1])) : getTypeColor(toPokemonType(pokemon.types[0]))} 100%);">
          <div class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
          <img src="${pokemon.imageUrl}" alt="${pokemon.name}" />
          <h2>${pokemon.name}</h2>
        </a>
      </li>`
    ).join('\n');
  
    return `
  <html>
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PokeQuickDex</title>
      <link rel="stylesheet" href="css/styles.css">
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5418523060607609"
      crossorigin="anonymous"></script>
      <link rel="canonical" href="https://pokequickdex.vercel.app" />
      <script defer src="/_vercel/insights/script.js"></script>
    </head>
    <body>
      <h1>Poke Quick Dex</h1>
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
        <div class="special-filter-container">
          <input type="checkbox" id="baby-filter" value="baby" />
          <label for="baby-filter">Babies</label>
          <input type="checkbox" id="legendary-filter" value="legendary" />
          <label for="legendary-filter">Legendaries</label>
          <input type="checkbox" id="mythical-filter" value="mythical" />
          <label for="mythical-filter">Mythics</label>
        </div>
      </div>
      <ul>
        ${pokemonLinks}
      </ul>
      <script>
        function filterPokemons() {
          const searchText = document.getElementById("search-input").value.toLowerCase();
          const selectedType = document.getElementById("type-select").value;
          const babyFilter = document.getElementById("baby-filter").checked;
          const legendaryFilter = document.getElementById("legendary-filter").checked;
          const mythicalFilter = document.getElementById("mythical-filter").checked;
          const pokemonCards = document.querySelectorAll(".pokemon-card");
          for (const pokemonCard of pokemonCards) {
            const pokemonName = pokemonCard.querySelector("h2").textContent.toLowerCase();
            const pokemonTypes = JSON.parse(pokemonCard.dataset.types);
            const isBaby = JSON.parse(pokemonCard.dataset.baby);
            const isLegendary = JSON.parse(pokemonCard.dataset.legendary);
            const isMythical = JSON.parse(pokemonCard.dataset.mythical);
            const nameMatch = searchText === "" || pokemonName.includes(searchText.toLowerCase());
            const typeMatch = selectedType === "" || pokemonTypes.includes(selectedType);
            const babyMatch = !babyFilter || isBaby;
            const legendaryMatch = !legendaryFilter || isLegendary;
            const mythicalMatch = !mythicalFilter || isMythical;
            if (nameMatch && typeMatch && babyMatch && legendaryMatch && mythicalMatch) {
              pokemonCard.parentElement.style.display = "block";
            } else {
              pokemonCard.parentElement.style.display = "none";
            }
          }
        }
        document.getElementById("search-input").addEventListener("input", filterPokemons);
        document.getElementById("type-select").addEventListener("input", filterPokemons);
        document.getElementById("baby-filter").addEventListener("change", filterPokemons);
        document.getElementById("legendary-filter").addEventListener("change", filterPokemons);
        document.getElementById("mythical-filter").addEventListener("change", filterPokemons);
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
    .map(ability => {
      const hiddenTag = ability.is_hidden ? `<span class="hidden-ability">hidden</span>` : '';
      return `
        <tr>
          <td class="attribute abilities-text">${ability.name.charAt(0).toUpperCase() + ability.name.slice(1)}: ${hiddenTag}</td>
          <td class="value abilities-text">${ability.description}</td>
        </tr>`;
    })
    .join('\n');
    const pastAbilitiesTableRows = pokemon.pastAbilities
    .map(ability => {
      const hiddenTag = ability.is_hidden ? `<span class="hidden-ability">hidden</span>` : '';
      const generationTag = ability.generation ? `<span class="generation-ability">until ${ability.generation}</span>` : '';
      return `
        <tr>
          <td class="attribute abilities-text">${ability.name.charAt(0).toUpperCase() + ability.name.slice(1)}: ${hiddenTag} ${generationTag}</td>
          <td class="value abilities-text">${ability.description}</td>
        </tr>`;
    })
    .join('\n');
    const getStatBar = (value: number, maxValue: number) => {
      const percentage = Math.round((value / maxValue) * 100);
      const greenThreshold = 35;
      const yellowThreshold = 20;

      let backgroundColor;
      if (percentage >= greenThreshold) {
        backgroundColor = 'limegreen';
      } else if (percentage >= yellowThreshold) {
        backgroundColor = 'gold';
      } else {
        backgroundColor = 'tomato';
      }

      return `
        <div class="stat-bar-container">
          <div class="stat-bar">
            <div class="stat-value" style="width: ${percentage}%; background-color: ${backgroundColor};"></div>
          </div>
        </div>
      `;
    };

    const statsTableRows = pokemon.stats
      .map(stat => `
        <tr>
          <td class="attribute abilities-text">${(stat.name === 'hp') ? 'HP': stat.name.charAt(0).toUpperCase() + stat.name.slice(1)}:</td>
          <td class="value abilities-text">${stat.value}</td>
          <td class="value abilities-bar">${getStatBar(stat.value, 255)}</td>
        </tr>`)
      .join('\n');

   const descriptionsSelect = pokemon.pokedexDescriptions
      .map(description => `
        <option value="${description.version}" class="tag">${description.version.charAt(0).toUpperCase() + description.version.slice(1)}</option>`)
      .join('\n');

    const descriptionsRows = pokemon.pokedexDescriptions
      .map((description, index) => `
        <p class="description" data-version='${description.version}' style="${index !== 0 ? 'display: none;' : ''}">${description.flavor_text}</p>`)
      .join('\n');
  
    return `
  <html>
    ${head(pokemon.name)}
    <body>
    <h1><a href="index.html" class="back-to-menu"><i class="fas fa-arrow-left"></i></a> ${pokemon.name} <span class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</span></h1>
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
      <div class="table-container">
        <table class="abilities-table">
          <tr>
            <th colspan="2" class="section-title-cell">Pokémon Abilities</th>
          </tr>
          ${abilitiesTableRows}
          <tr style="${pokemon.pastAbilities ? '' : 'display: none;'}>
            <th colspan="2" class="section-title-cell">Pokémon Old Abilities</th>
          </tr>
          ${pokemon.pastAbilities ? pastAbilitiesTableRows : ''}
        </table>
        <table>
          <tr>
            <th colspan="3" class="section-title-cell">Pokémon Stats</th>
          </tr>
          ${statsTableRows}
        </table>
      </div>
      <h2 class="section-title">Pokédex Description</h2>
      <div class="pokedex-container">
        <div class="version-container">
          <select id="version-select" class="version-select">
            ${descriptionsSelect}
          </select>
        </div>
        <div class="description-container">
          ${descriptionsRows}
        </div>
      </div>
      <a href="index.html" class="back-button">Back to Menu</a>
      <script>
        function filterVersions() {
          const selectedVersion = document.getElementById("version-select").value;
          const dexDescriptions = document.querySelectorAll(".description");
          for (const dexDescription of dexDescriptions) {
            const version = dexDescription.dataset.version;
            if (selectedVersion === version) {
              dexDescription.style.display = "block";
            } else {
              dexDescription.style.display = "none";
            }
          }
        }
        document.getElementById("version-select").addEventListener("change", filterVersions);
      </script>
    </body>
  </html>`;
  }

  type PokemonType =
  | 'normal'
  | 'fighting'
  | 'flying'
  | 'poison'
  | 'ground'
  | 'rock'
  | 'bug'
  | 'ghost'
  | 'steel'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'psychic'
  | 'ice'
  | 'dragon'
  | 'dark'
  | 'fairy';

function getTypeColor(type: PokemonType): string {
  const colors: Record<PokemonType, string> = {
    normal: "rgba(168, 168, 120, 0.5)",
    fighting: "rgba(192, 48, 40, 0.5)",
    flying: "rgba(168, 144, 240, 0.5)",
    poison: "rgba(160, 64, 160, 0.5)",
    ground: "rgba(224, 192, 104, 0.5)",
    rock: "rgba(184, 160, 56, 0.5)",
    bug: "rgba(168, 184, 32, 0.5)",
    ghost: "rgba(112, 88, 152, 0.5)",
    steel: "rgba(184, 184, 208, 0.5)",
    fire: "rgba(240, 128, 48, 0.5)",
    water: "rgba(104, 144, 240, 0.5)",
    grass: "rgba(120, 200, 80, 0.5)",
    electric: "rgba(248, 208, 48, 0.5)",
    psychic: "rgba(248, 88, 136, 0.5)",
    ice: "rgba(152, 216, 216, 0.5)",
    dragon: "rgba(112, 56, 248, 0.5)",
    dark: "rgba(112, 88, 72, 0.5)",
    fairy: "rgba(238, 153, 172, 0.5)",
  };
  return colors[type] || "#ccc";
}

function head(title: string): string {
  return `
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="css/pokemon_styles.css">
  <script defer src="/_vercel/insights/script.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.1/css/all.min.css" />
</head>`;
}

(async () => {
  const pokemons = await loadPokemons(20);
  const indexHtml = renderPokemonIndex(pokemons);
  await writeFile("index.html", indexHtml);

  for (const pokemon of pokemons) {
    const pokemonDetail = await loadPokemonDetails(pokemon.id);
    if (!pokemonDetail) {
      console.warn(`Failed to load details for Pokémon with ID ${pokemon.id}.`);
      continue;
    }
    const detailHtml = renderPokemonDetail(pokemonDetail);
    await writeFile(`${String(pokemonDetail.id).padStart(4, '0')}_${pokemonDetail.codename}.html`, detailHtml);
  }
})();
