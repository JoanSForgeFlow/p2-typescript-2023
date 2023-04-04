export class Pokemon {
    constructor(
      public id: number,
      public name: string,
      public imageUrl: string
    ) {}
  
    get displayName() {
      return `${this.id}. ${this.name}`;
    }
  }
  
  export const loadPokemons = async (n: number) => {
    const pokemons: Array<Pokemon> = [];
  
    for (let i = 1; i <= n; i++) {
      try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
        const data = await response.json();
        const imageUrl = data.sprites.front_default;
        pokemons.push(new Pokemon(i, data.name, imageUrl));
      } catch (error) {
        console.error("Error fetching data from the PokeAPI:", error);
      }
    }
  
    return pokemons;
  };
  