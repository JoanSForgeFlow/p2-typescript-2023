import { cachedFetchJson } from "../fetch-cache";
import { mapWithConcurrency } from "../concurrency";
import { DAMAGE_CLASSES, type MoveRow, type MoveTable, type PastMoveValue } from "../shared/model";
import type { GameCatalog } from "./games";
import { localName } from "./localize";

const idFromUrl = (url: string): number => parseInt(url.split('/').filter(Boolean).pop() as string);

export interface MoveIndex {
  table: MoveTable;
  indexOf: Map<string, number>;
  spanishNames: string[];
}

// One row per move, referenced by index from every learnset. Values are the
// current ones; past_values lists what changed in which version group (e.g.
// Thunderbolt was 95 power before X & Y) so the page can show the numbers
// of the selected game.
export async function loadMoveTable(moveNames: string[], types: string[], catalog: GameCatalog): Promise<MoveIndex> {
  const names = Array.from(new Set(moveNames)).sort();
  const data = await mapWithConcurrency(names, 10, (name) => cachedFetchJson(`https://pokeapi.co/api/v2/move/${name}/`));
  const indexOf = new Map(names.map((n, i) => [n, i]));
  const vgOrder = (vg: string) => catalog.versionGroups.get(vg)?.order ?? 0;

  const moves: MoveRow[] = data.map((m: any) => {
    const past: PastMoveValue[] = (m.past_values || [])
      .map((p: any): PastMoveValue => [
        vgOrder(p.version_group.name),
        p.power,
        p.accuracy,
        p.pp,
        p.type ? types.indexOf(p.type.name) : null,
      ])
      .sort((a: PastMoveValue, b: PastMoveValue) => a[0] - b[0]);
    const name = localName(m.names, 'en') || m.name;
    return [name, types.indexOf(m.type.name), DAMAGE_CLASSES.indexOf(m.damage_class?.name || 'status'), m.power, m.accuracy, m.pp, past];
  });

  // TM/HM/TR numbers differ per game, so each (move, game) machine is looked up.
  const machineRefs: { game: string; move: number; url: string }[] = [];
  data.forEach((m: any, i: number) => {
    for (const ref of m.machines || []) {
      const game = catalog.gameOfVersionGroup.get(ref.version_group.name);
      if (game) machineRefs.push({ game, move: i, url: ref.machine.url });
    }
  });
  const machines: Record<string, Record<number, string>> = {};
  await mapWithConcurrency(machineRefs, 10, async (ref) => {
    const machine = await cachedFetchJson(`https://pokeapi.co/api/v2/machine/${idFromUrl(ref.url)}/`);
    (machines[ref.game] ||= {})[ref.move] = machine.item.name.toUpperCase();
  });
  const spanishNames = data.map((m: any, i: number) => localName(m.names, 'es') || moves[i][0]);
  return { table: { moves, machines }, indexOf, spanishNames };
}
