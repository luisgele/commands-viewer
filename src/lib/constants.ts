import type {
  Importance,
  SkillSource,
  ToolResourceScope,
  ToolResourceType,
} from "../types";

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

export const RESOURCE_TYPE_ORDER: ToolResourceType[] = [
  "skill",
  "agent",
  "plugin",
  "hook",
];

export const RESOURCE_TYPE_LABELS: Record<ToolResourceType, string> = {
  skill: "Skill",
  agent: "Agent",
  plugin: "Plugin",
  hook: "Hook",
};

export const RESOURCE_SCOPE_LABELS: Record<ToolResourceScope, string> = {
  global: "Global",
  project: "Proyecto",
};

export const SKILL_SOURCE_LABELS: Record<SkillSource, string> = {
  "bundled-slash-skill": "Bundled / slash skill",
  "markdown-file": "Fichero Markdown",
};
