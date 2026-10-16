import { cachedFetchJson } from "../fetch-cache";
import type { TypeChart } from "../shared/model";
import { genNumber } from "./games";

export interface TypeChartData {
  typeIntroduced: number[];
  charts: TypeChart[];
}

// The type chart changed over time (Gen 1 quirks, Steel losing its Ghost/Dark
// resistances in Gen 6…). PokeAPI keeps each type's older relations in
// past_damage_relations, tagged with the last generation they applied to, so
// one chart is built per generation and consecutive identical ones are merged.
export async function loadTypeChart(types: string[], latestGen: number): Promise<TypeChartData> {
  const data = await Promise.all(types.map(t => cachedFetchJson(`https://pokeapi.co/api/v2/type/${t}/`)));
  const relationsAt = (typeData: any, gen: number): any => {
    const past = (typeData.past_damage_relations || [])
      .map((p: any) => ({ upTo: genNumber(p.generation.name), relations: p.damage_relations }))
      .sort((a: any, b: any) => a.upTo - b.upTo)
      .find((p: any) => gen <= p.upTo);
    return past ? past.relations : typeData.damage_relations;
  };
  const has = (list: any[], name: string) => list.some((x: any) => x.name === name);
  const chartAt = (gen: number): number[][] => types.map(attacking => data.map((defending) => {
    const relations = relationsAt(defending, gen);
    if (has(relations.no_damage_from, attacking)) return 0;
    if (has(relations.double_damage_from, attacking)) return 2;
    if (has(relations.half_damage_from, attacking)) return 0.5;
    return 1;
  }));

  const charts: TypeChart[] = [];
  for (let gen = 1; gen <= latestGen; gen++) {
    const multipliers = chartAt(gen);
    const last = charts[charts.length - 1];
    if (last && JSON.stringify(last.multipliers) === JSON.stringify(multipliers)) last.upToGen = gen;
    else charts.push({ upToGen: gen, multipliers });
  }
  charts[charts.length - 1].upToGen = 99;
  return { typeIntroduced: data.map(d => genNumber(d.generation.name)), charts };
}
