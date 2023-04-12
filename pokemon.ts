import { PokemonDetails } from "./pokemon-detail.js";

export class Pokemon {
    constructor(
      public id: number,
      public name: string,
      public imageUrl: string,
      public types: string[],
      public officialArtworkUrl?: string
    ) {}
  
    get displayName() {
      return `${this.id}. ${this.name}`;
    }
  }
  
  export const loadPokemons = async (n: number) => {
    const pokemons: Array<Pokemon> = [];
  
    for (let i = 1; i <= n; i++) {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.sprites.front_default;
        const types = data.types.map((type: any) => type.type.name);
        pokemons.push(new Pokemon(i, data.species.name, imageUrl, types));
      } else {
        console.error(`Error fetching data for Pokémon ID ${i}: ${response.statusText}`);
      }
    }
    return pokemons;
  };
