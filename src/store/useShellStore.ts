import { create } from "zustand";
import type { ModuleId } from "../modules/registry";

const SHELL_KEY = "managment-viewer.shell";
const MODULE_IDS: ModuleId[] = ["commands", "claude-tools", "domains"];

interface ShellState {
  activeModule: ModuleId;
  sidebarCollapsed: boolean;

  setActiveModule: (id: ModuleId) => void;
  toggleSidebar: () => void;
}

function loadShellState(): Pick<ShellState, "activeModule" | "sidebarCollapsed"> {
  if (typeof window === "undefined") {
    return { activeModule: "commands", sidebarCollapsed: false };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SHELL_KEY) ?? "{}") as Partial<{
      activeModule: ModuleId;
      sidebarCollapsed: boolean;
    }>;
    return {
      activeModule:
        parsed.activeModule && MODULE_IDS.includes(parsed.activeModule)
          ? parsed.activeModule
          : "commands",
      sidebarCollapsed:
        typeof parsed.sidebarCollapsed === "boolean" ? parsed.sidebarCollapsed : false,
    };
  } catch {
    return { activeModule: "commands", sidebarCollapsed: false };
  }
}

function saveShellState(state: Pick<ShellState, "activeModule" | "sidebarCollapsed">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SHELL_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable; the in-memory state still works.
  }
}

export const useShellStore = create<ShellState>()((set, get) => ({
  ...loadShellState(),

  setActiveModule: (id) => {
    const next = { activeModule: id, sidebarCollapsed: get().sidebarCollapsed };
    set({ activeModule: id });
    saveShellState(next);
  },

  toggleSidebar: () => {
    const next = {
      activeModule: get().activeModule,
      sidebarCollapsed: !get().sidebarCollapsed,
    };
    set({ sidebarCollapsed: next.sidebarCollapsed });
    saveShellState(next);
  },
}));
