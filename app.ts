async function getPokemonData() {
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=151");
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error fetching data from the PokeAPI:", error);
    }
  }

getPokemonData();
