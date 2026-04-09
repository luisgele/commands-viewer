import type { Importance } from "../types";

export const IMPORTANCE_ORDER: Importance[] = ["critical", "high", "medium", "low"];

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  critical: "CRÍTICO",
  high: "ALTO",
  medium: "MEDIO",
  low: "BAJO",
};

export const IMPORTANCE_COLORS: Record<Importance, string> = {
  critical: "var(--color-imp-critical)",
  high: "var(--color-imp-high)",
  medium: "var(--color-imp-medium)",
  low: "var(--color-imp-low)",
};

export const TOOL_COLOR_PALETTE = [
  "#ff6b35",
  "#00d4ff",
  "#3ddc84",
  "#a78bfa",
  "#fbbf24",
  "#f472b6",
];
