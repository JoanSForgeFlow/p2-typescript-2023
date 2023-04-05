interface DamageRelation {
  double_damage_from: { name: string }[];
  half_damage_from: { name: string }[];
  no_damage_from: { name: string }[];
}


export class PokemonDetails {
    constructor(
      public id: number,
      public name: string,
      public imageUrl: string,
      public officialArtworkUrl: string,
      public height: number,
      public weight: number,
      public types: string[],
      public abilities: string[],
      public doubleWeakTo: string[],
      public weakTo: string[],
      public immuneTo: string[],
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
      const damageRelations = await getPokemonDamageRelations(id);
      return new PokemonDetails(
        id,
        data.name,
        imageUrl,
        officialArtworkUrl,
        height,
        weight,
        types,
        abilities,
        damageRelations.doubleWeakTo,
        damageRelations.weakTo,
        damageRelations.immuneTo,
      );
    } catch (error) {
      console.error("Error fetching data from the PokeAPI:", error);
      return undefined;
    }
  };

  async function getPokemonDamageRelations(pokemonId: number): Promise<{
    doubleWeakTo: string[];
    weakTo: string[];
    immuneTo: string[];
  }> {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    const data = await response.json();
    const types = data.types.map((type: { type: { url: string } }) => type.type);

    const damageRelations: DamageRelation[] = await Promise.all(types.map(async (type: { url: string }) => {
      const response = await fetch(type.url);
      const data = await response.json();
      return data.damage_relations;
    }));

    const doubleWeakTo: Set<string> = new Set();
    const weakTo: Set<string> = new Set();
    const immuneTo: Set<string> = new Set();

    damageRelations.forEach((relations: DamageRelation, index: number) => {
      relations.double_damage_from.forEach((relation) => {
        if (damageRelations.length === 2 && index === 0) {
          if (damageRelations[1].double_damage_from.some((r) => r.name === relation.name)) {
            doubleWeakTo.add(relation.name);
          } else if (
            !damageRelations[1].half_damage_from.some((r) => r.name === relation.name) &&
            !damageRelations[0].half_damage_from.some((r) => r.name === relation.name) &&
            !damageRelations[1].double_damage_from.some((r) => r.name === relation.name)
          ) {
            weakTo.add(relation.name);
          }
        } else if (damageRelations.length === 1 || index === 1) {
          weakTo.add(relation.name);
        }
      });

      relations.no_damage_from.forEach((relation) => {
        if (damageRelations.length === 2 && index === 0) {
          if (!damageRelations[1].no_damage_from.some((r) => r.name === relation.name)) {
            immuneTo.add(relation.name);
          }
        } else if (damageRelations.length === 1 || index === 1) {
          immuneTo.add(relation.name);
        }
      });
    });

    return {
      doubleWeakTo: Array.from(doubleWeakTo),
      weakTo: Array.from(weakTo),
      immuneTo: Array.from(immuneTo),
    };
  }
