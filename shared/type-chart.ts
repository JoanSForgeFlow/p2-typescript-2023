import type { Meta, TypeChart, Variety } from './model';
import { t } from './i18n';

export function chartFor(meta: Meta, gen: number): TypeChart {
  return meta.charts.find(c => gen <= c.upToGen) || meta.charts[meta.charts.length - 1];
}

export function typesFor(variety: Pick<Variety, 'types' | 'pastTypes'>, gen: number): string[] {
  const past = variety.pastTypes
    .slice()
    .sort((a, b) => a[0] - b[0])
    .find(([upToGen]) => gen <= upToGen);
  return past ? past[1] : variety.types;
}

export function typesInGen(meta: Meta, gen: number): string[] {
  return meta.types.filter((_, i) => meta.typeIntroduced[i] <= gen);
}

export function damageMultiplier(meta: Meta, gen: number, attacking: string, defending: string[]): number {
  const chart = chartFor(meta, gen);
  const a = meta.types.indexOf(attacking);
  return defending.reduce((m, d) => m * (chart.multipliers[a]?.[meta.types.indexOf(d)] ?? 1), 1);
}

export interface Matchups {
  x4: string[];
  x2: string[];
  x05: string[];
  x025: string[];
  x0: string[];
}

export function defensiveMatchups(meta: Meta, gen: number, defending: string[]): Matchups {
  const result: Matchups = { x4: [], x2: [], x05: [], x025: [], x0: [] };
  for (const attacking of typesInGen(meta, gen)) {
    const m = damageMultiplier(meta, gen, attacking, defending);
    if (m === 0) result.x0.push(attacking);
    else if (m >= 4) result.x4.push(attacking);
    else if (m === 2) result.x2.push(attacking);
    else if (m === 0.5) result.x05.push(attacking);
    else if (m > 0 && m <= 0.25) result.x025.push(attacking);
  }
  return result;
}

export interface Coverage {
  superEffective: string[];
  walledBy: string[];
}

export function offensiveCoverage(meta: Meta, gen: number, attacking: string[]): Coverage {
  const superEffective: string[] = [];
  const walledBy: string[] = [];
  for (const defending of typesInGen(meta, gen)) {
    const multipliers = attacking.map(a => damageMultiplier(meta, gen, a, [defending]));
    if (multipliers.some(m => m >= 2)) superEffective.push(defending);
    if (multipliers.every(m => m < 1)) walledBy.push(defending);
  }
  return { superEffective, walledBy };
}

export function eraLabel(meta: Meta, gen: number): string | null {
  const chart = chartFor(meta, gen);
  const latest = meta.charts[meta.charts.length - 1];
  if (chart === latest) return null;
  const index = meta.charts.indexOf(chart);
  const from = index === 0 ? 1 : meta.charts[index - 1].upToGen + 1;
  return from === chart.upToGen ? t('era.gen', { n: from }) : t('era.gens', { from, to: chart.upToGen });
}
