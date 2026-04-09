import type { Command, Importance, SortDir, SortKey } from "../types";

const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

interface FilterCfg {
  search: string;
  importance: Set<Importance>;
  minFrequency: number;
  favoritesOnly: boolean;
  tag: string | null;
}

export function filterCommands(commands: Command[], cfg: FilterCfg): Command[] {
  const q = cfg.search.trim().toLowerCase();
  return commands.filter((c) => {
    if (cfg.favoritesOnly && !c.favorite) return false;
    if (cfg.importance.size > 0 && !cfg.importance.has(c.importance)) return false;
    if (cfg.minFrequency > 0 && c.frequency < cfg.minFrequency) return false;
    if (cfg.tag && !c.tags.includes(cfg.tag)) return false;
    if (q) {
      const modifiersText = (c.modifiers ?? [])
        .map((m) => `${m.flag} ${m.description} ${m.example ?? ""}`)
        .join(" ");
      const hay = `${c.name} ${c.description} ${c.hint} ${c.notes} ${c.tags.join(
        " ",
      )} ${c.section} ${modifiersText}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortCommands(
  commands: Command[],
  key: SortKey,
  dir: SortDir,
): Command[] {
  const list = [...commands];
  const mul = dir === "asc" ? 1 : -1;
  switch (key) {
    case "name":
      list.sort((a, b) => a.name.localeCompare(b.name) * mul);
      break;
    case "importance":
      list.sort(
        (a, b) =>
          (IMPORTANCE_WEIGHT[b.importance] - IMPORTANCE_WEIGHT[a.importance]) * mul,
      );
      break;
    case "frequency":
      list.sort((a, b) => (b.frequency - a.frequency) * mul);
      break;
    case "manual":
    default:
      list.sort((a, b) => a.order - b.order);
      break;
  }
  return list;
}

export function uniqueTags(commands: Command[]): string[] {
  const set = new Set<string>();
  for (const c of commands) for (const t of c.tags) set.add(t);
  return [...set].sort();
}

export function groupBySection(commands: Command[]): Array<{
  section: string;
  commands: Command[];
}> {
  const map = new Map<string, Command[]>();
  for (const c of commands) {
    const arr = map.get(c.section) ?? [];
    arr.push(c);
    map.set(c.section, arr);
  }
  return [...map.entries()].map(([section, cmds]) => ({ section, commands: cmds }));
}

/**
 * Returns true when the search query matches a modifier inside the command
 * but NOT the command's own fields — used to auto-expand the row so the user
 * can actually see the matching modifier.
 */
export function searchOnlyMatchesModifiers(cmd: Command, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return false;
  const selfText =
    `${cmd.name} ${cmd.description} ${cmd.hint} ${cmd.notes} ${cmd.tags.join(" ")} ${cmd.section}`.toLowerCase();
  if (selfText.includes(q)) return false;
  const mods = cmd.modifiers ?? [];
  for (const m of mods) {
    const text = `${m.flag} ${m.description} ${m.example ?? ""}`.toLowerCase();
    if (text.includes(q)) return true;
  }
  return false;
}
