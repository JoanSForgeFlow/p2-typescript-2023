export class PokemonDetails {
    constructor(
      public id: number,
      public name: string,
      public imageUrl: string,
      public officialArtworkUrl: string,
      public height: number,
      public weight: number,
      public types: string[],
      public abilities: string[]
    ) {}
  }

  export const loadPokemonDetails = async (id: number): Promise<PokemonDetails | undefined> => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await response.json();
      const imageUrl = data.sprites.front_default;
      const officialArtworkUrl = data.sprites.other["official-artwork"].front_default;
      const height = data.height;
      const weight = data.weight;
      const types = data.types.map((type: any) => type.type.name);
      const abilities = data.abilities.map((ability: any) => ability.ability.name);
      return new PokemonDetails(id, data.name, imageUrl, officialArtworkUrl, height, weight, types, abilities);
    } catch (error) {
      console.error("Error fetching data from the PokeAPI:", error);
      return undefined;
    }
  };  
