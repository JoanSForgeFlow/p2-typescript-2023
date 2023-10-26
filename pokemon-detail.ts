interface DamageRelation {
  double_damage_from: { name: string }[];
  half_damage_from: { name: string }[];
  no_damage_from: { name: string }[];
}

interface Ability {
  name: string;
  description: string;
  is_hidden: boolean;
}

interface Stat {
  name: string;
  value: number;
}

interface DexDescription {
  version: string;
  flavor_text: string;
}

export class PokemonDetails {
    constructor(
      public id: number,
      public name: string,
      public codename: string,
      public imageUrl: string,
      public officialArtworkUrl: string,
      public height: number,
      public weight: number,
      public types: string[],
      public abilities: Ability[],
      public superWeakTo: string[],
      public weakTo: string[],
      public normal: string[],
      public resistantTo: string[],
      public superResistantTo: string[],
      public immuneTo: string[],
      public pokedexDescriptions: DexDescription[],
      public stats: Stat[]
    ) {}
  }

  export const loadPokemonDetails = async (id: number): Promise<PokemonDetails | undefined> => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      const data = await response.json();
      const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
      const speciesData = await speciesResponse.json();
      const imageUrl = data.sprites.front_default;
      const officialArtworkUrl = data.sprites.other["official-artwork"].front_default;
      const height = data.height;
      const weight = data.weight;
      const types = data.types.map((type: any) => type.type.name);
      const abilitiesData = data.abilities;
      const abilitiesDescriptions = await getAbilitiesDescriptions(abilitiesData);
      const abilities = abilitiesData.map((abilityData: any, index: number) => {
        return {
          name: abilityData.ability.name,
          description: abilitiesDescriptions[index],
          is_hidden: abilityData.is_hidden,
        };
      });
      const stats = data.stats.map((stat: any) => {
        return {
          name: stat.stat.name,
          value: stat.base_stat
        };
      });
      const damageRelations = await getPokemonDamageRelations(id);
      const pokedexDescriptions = await getPokemonDescriptions(id);
      const codename = data.species.name;
      const nameEntry = speciesData.names.find((entry: { language: { name: string } }) => entry.language.name === 'en');
      const name = nameEntry ? nameEntry.name : codename.charAt(0).toUpperCase() + codename.slice(1);
      return new PokemonDetails(
        id,
        name,
        codename,
        imageUrl,
        officialArtworkUrl,
        height,
        weight,
        types,
        abilities,
        damageRelations.superWeakTo,
        damageRelations.weakTo,
        damageRelations.normal,
        damageRelations.resistantTo,
        damageRelations.superResistantTo,
        damageRelations.immuneTo,
        pokedexDescriptions,
        stats
      );
    } catch (error) {
      console.error("Error fetching data from the PokeAPI:", error);
      return undefined;
    }
  };

  function cleanText(text: string): string {
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async function getAbilitiesDescriptions(abilities: { ability: { url: string } }[]): Promise<string[]> {
    const descriptions = await Promise.all(
      abilities.map(async ({ ability: { url } }) => {
        const response = await fetch(url);
        const data = await response.json();
        const englishDescription = data.effect_entries.find((entry: { language: { name: string } }) => entry.language.name === 'en');
        return englishDescription ? englishDescription.effect : 'No description available';
      })
    );
    return descriptions;
  }

  async function getPokemonDescriptions(pokemonId: number): Promise<DexDescription[]> {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
    const data = await response.json();
    const englishFlavorTextEntries = data.flavor_text_entries.filter((entry: { language: { name: string } }) => entry.language.name === 'en');
    if (englishFlavorTextEntries.length > 0) {
      const pokedexDescriptions: DexDescription[] = englishFlavorTextEntries.map((entry: { flavor_text: string; version: { name: string } }) => {
        return { 'version': entry.version.name, 'flavor_text': cleanText(entry.flavor_text) };
      });
      return pokedexDescriptions;
    } else {
      console.error(`No English flavor text entry found for Pokémon ID ${pokemonId}`);
      return [{ 'version': 'no version', 'flavor_text': 'No description available' }];
    }
  }

  async function getPokemonDamageRelations(pokemonId: number): Promise<{
    superWeakTo: string[];
    weakTo: string[];
    normal: string[];
    resistantTo: string[];
    superResistantTo: string[];
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

    const pokemonTypes = [
      'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water',
      'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy',
    ];

    const typeRelationMultipliers: { [key: string]: number } = {};

    damageRelations.forEach((relations: DamageRelation) => {
      relations.double_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = (typeRelationMultipliers[relation.name] || 1) * 2;
      });
      relations.half_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = (typeRelationMultipliers[relation.name] || 1) * 0.5;
      });
      relations.no_damage_from.forEach((relation) => {
        typeRelationMultipliers[relation.name] = 0;
      });
    });

    const superWeakTo: string[] = [];
    const weakTo: string[] = [];
    const normal: string[] = [];
    const resistantTo: string[] = [];
    const superResistantTo: string[] = [];
    const immuneTo: string[] = [];

    for (const type of pokemonTypes) {
      const multiplier = typeRelationMultipliers[type];

      if (multiplier === 0) {
        immuneTo.push(type);
      } else if (multiplier === 4) {
        superWeakTo.push(type);
      } else if (multiplier === 2) {
        weakTo.push(type);
      } else if (multiplier === 0.5) {
        resistantTo.push(type);
      } else if (multiplier === 0.25) {
        superResistantTo.push(type);
      } else {
        normal.push(type);
      }
    }

    return {
      superWeakTo,
      weakTo,
      normal,
      resistantTo,
      superResistantTo,
      immuneTo,
    };
  }
