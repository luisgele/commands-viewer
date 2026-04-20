import { create } from "zustand";
import type {
  Command,
  Importance,
  SortDir,
  SortKey,
  Theme,
  Tool,
  ToolResource,
} from "../types";
import { api } from "../lib/api";

interface Filters {
  search: string;
  importance: Set<Importance>;
  minFrequency: number;
  favoritesOnly: boolean;
  tag: string | null;
}

export type Density = "ultra" | "compact" | "comfortable";

interface Settings {
  density: Density;
  theme: Theme;
}

const SETTINGS_KEY = "commands-viewer.settings";

function loadSettings(): Settings {
  if (typeof window === "undefined") return { density: "compact", theme: "dark" };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { density: "compact", theme: "dark" };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const density: Density =
      parsed.density === "ultra" ||
      parsed.density === "comfortable" ||
      parsed.density === "compact"
        ? parsed.density
        : "compact";
    const theme: Theme =
      parsed.theme === "light" || parsed.theme === "dark"
        ? parsed.theme
        : "dark";
    return { density, theme };
  } catch {
    return { density: "compact", theme: "dark" };
  }
}

function saveSettings(settings: Settings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage may be unavailable (private mode) — ignore
  }
}

interface StoreState {
  // data
  tools: Tool[];
  commands: Command[];
  resources: ToolResource[];
  loading: boolean;
  error: string | null;

  // ui
  activeToolId: string | null;
  filters: Filters;
  sortKey: SortKey;
  sortDir: SortDir;
  settings: Settings;
  pendingCommandIds: Set<string>;

  // actions — data
  load: () => Promise<void>;
  addTool: (tool: Partial<Tool>) => Promise<void>;
  updateTool: (id: string, patch: Partial<Tool>) => Promise<void>;
  deleteTool: (id: string) => Promise<void>;
  reorderTools: (orderedIds: string[]) => Promise<void>;
  addCommand: (command: Partial<Command>) => Promise<void>;
  updateCommand: (id: string, patch: Partial<Command>) => Promise<void>;
  deleteCommand: (id: string) => Promise<void>;
  reorderCommands: (toolId: string, orderedIds: string[]) => Promise<void>;
  addResource: (resource: Partial<ToolResource>) => Promise<void>;
  updateResource: (id: string, patch: Partial<ToolResource>) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  isCommandPending: (id: string) => boolean;

  // actions — ui
  setActiveTool: (id: string | null) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleImportanceFilter: (imp: Importance) => void;
  resetFilters: () => void;
  activeFilterCount: () => number;
  setSort: (key: SortKey, dir?: SortDir) => void;
  setDensity: (density: Density) => void;
  setTheme: (theme: Theme) => void;
}

const initialFilters: Filters = {
  search: "",
  importance: new Set<Importance>(),
  minFrequency: 0,
  favoritesOnly: false,
  tag: null,
};

type SetFn = (
  partial:
    | Partial<StoreState>
    | ((state: StoreState) => Partial<StoreState>),
) => void;
type GetFn = () => StoreState;

// Toggle a command id in the pendingCommandIds set. We keep a new Set on
// every mutation so selectors that read it re-render correctly.
function markPending(set: SetFn, get: GetFn, id: string, pending: boolean) {
  const next = new Set(get().pendingCommandIds);
  if (pending) next.add(id);
  else next.delete(id);
  set({ pendingCommandIds: next });
}

export const useStore = create<StoreState>()((set, get) => ({
  tools: [],
  commands: [],
  resources: [],
  loading: false,
  error: null,

  activeToolId: null,
  filters: initialFilters,
  sortKey: "manual",
  sortDir: "asc",
  settings: loadSettings(),
  pendingCommandIds: new Set<string>(),

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.getAll();
      const sortedTools = [...data.tools].sort((a, b) => a.order - b.order);
      set({
        tools: sortedTools,
        commands: data.commands,
        resources: data.resources,
        loading: false,
        activeToolId: get().activeToolId ?? sortedTools[0]?.id ?? null,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  addTool: async (tool) => {
    const created = await api.createTool(tool);
    set({ tools: [...get().tools, created], activeToolId: created.id });
  },

  updateTool: async (id, patch) => {
    const updated = await api.updateTool(id, patch);
    set({
      tools: get().tools.map((t) => (t.id === id ? updated : t)),
    });
  },

  deleteTool: async (id) => {
    await api.deleteTool(id);
    const tools = get().tools.filter((t) => t.id !== id);
    const commands = get().commands.filter((c) => c.toolId !== id);
    const activeToolId = get().activeToolId === id ? (tools[0]?.id ?? null) : get().activeToolId;
    set({ tools, commands, activeToolId });
  },

  reorderTools: async (orderedIds) => {
    // optimistic update
    const prev = get().tools;
    const byId = new Map(prev.map((t) => [t.id, t] as const));
    const next: Tool[] = [];
    orderedIds.forEach((id, idx) => {
      const tool = byId.get(id);
      if (tool) next.push({ ...tool, order: idx });
    });
    // preserve any tools that weren't in orderedIds (shouldn't happen, but safe)
    for (const tool of prev) {
      if (!orderedIds.includes(tool.id)) next.push(tool);
    }
    set({ tools: next });
    try {
      await api.reorderTools(orderedIds.map((id, order) => ({ id, order })));
    } catch (err) {
      set({ tools: prev, error: (err as Error).message });
    }
  },

  addCommand: async (command) => {
    const created = await api.createCommand(command);
    set({ commands: [...get().commands, created] });
  },

  addResource: async (resource) => {
    const created = await api.createResource(resource);
    set({ resources: [...get().resources, created] });
  },

  updateCommand: async (id, patch) => {
    markPending(set, get, id, true);
    try {
      const updated = await api.updateCommand(id, patch);
      set({
        commands: get().commands.map((c) => (c.id === id ? updated : c)),
      });
    } finally {
      markPending(set, get, id, false);
    }
  },

  updateResource: async (id, patch) => {
    const updated = await api.updateResource(id, patch);
    set({
      resources: get().resources.map((resource) =>
        resource.id === id ? updated : resource,
      ),
    });
  },

  deleteCommand: async (id) => {
    markPending(set, get, id, true);
    try {
      await api.deleteCommand(id);
      set({ commands: get().commands.filter((c) => c.id !== id) });
    } finally {
      markPending(set, get, id, false);
    }
  },

  deleteResource: async (id) => {
    await api.deleteResource(id);
    set({ resources: get().resources.filter((resource) => resource.id !== id) });
  },

  reorderCommands: async (toolId, orderedIds) => {
    // optimistic update
    const prev = get().commands;
    const nextOrderMap = new Map(orderedIds.map((id, idx) => [id, idx] as const));
    const next = prev.map((c) =>
      c.toolId === toolId && nextOrderMap.has(c.id)
        ? { ...c, order: nextOrderMap.get(c.id)! }
        : c,
    );
    set({ commands: next });
    try {
      await api.reorderCommands(orderedIds.map((id, order) => ({ id, order })));
    } catch (err) {
      // rollback
      set({ commands: prev, error: (err as Error).message });
    }
  },

  toggleFavorite: async (id) => {
    const cmd = get().commands.find((c) => c.id === id);
    if (!cmd) return;
    await get().updateCommand(id, { favorite: !cmd.favorite });
  },

  isCommandPending: (id) => get().pendingCommandIds.has(id),

  setActiveTool: (id) => set({ activeToolId: id }),

  setFilter: (key, value) =>
    set({ filters: { ...get().filters, [key]: value } }),

  toggleImportanceFilter: (imp) => {
    const current = new Set(get().filters.importance);
    if (current.has(imp)) current.delete(imp);
    else current.add(imp);
    set({ filters: { ...get().filters, importance: current } });
  },

  resetFilters: () =>
    set({
      filters: { ...initialFilters, importance: new Set<Importance>() },
    }),

  activeFilterCount: () => {
    const f = get().filters;
    let n = 0;
    if (f.search.trim()) n++;
    if (f.importance.size > 0) n++;
    if (f.minFrequency > 0) n++;
    if (f.favoritesOnly) n++;
    if (f.tag) n++;
    return n;
  },

  setDensity: (density) => {
    const next = { ...get().settings, density };
    set({ settings: next });
    saveSettings(next);
  },

  setTheme: (theme) => {
    const next = { ...get().settings, theme };
    set({ settings: next });
    saveSettings(next);
  },

  setSort: (key, dir) => {
    const currentKey = get().sortKey;
    const currentDir = get().sortDir;
    if (dir) {
      set({ sortKey: key, sortDir: dir });
      return;
    }
    // toggle direction if re-clicking the same column
    if (currentKey === key) {
      set({ sortDir: currentDir === "asc" ? "desc" : "asc" });
    } else {
      set({ sortKey: key, sortDir: "asc" });
    }
  },
}));
