import { PokemonDetails } from "./pokemon-detail.js";

export class Pokemon {
    constructor(
      public id: number,
      public name: string,
      public imageUrl: string,
      public types: string[],
      public is_baby: boolean,
      public is_legendary: boolean,
      public is_mythical: boolean,
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
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${i}`);

        if (response.ok && speciesResponse.ok) {
            const data = await response.json();
            const speciesData = await speciesResponse.json();

            const imageUrl = data.sprites.front_default;
            const types = data.types.map((type: any) => type.type.name);
            const is_baby = speciesData.is_baby;
            const is_legendary = speciesData.is_legendary;
            const is_mythical = speciesData.is_mythical;

            pokemons.push(new Pokemon(i, data.species.name, imageUrl, types, is_baby, is_legendary, is_mythical));
        } else {
            console.error(`Error fetching data for Pokémon ID ${i}: ${response.statusText}`);
        }
    }
    return pokemons;
};
