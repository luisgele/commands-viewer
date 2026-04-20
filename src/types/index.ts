export type Importance = "critical" | "high" | "medium" | "low";
export type Theme = "dark" | "light";
export type ToolResourceType = "skill" | "agent" | "plugin" | "hook";
export type ToolResourceScope = "global" | "project";
export type SkillSource = "bundled-slash-skill" | "markdown-file";

export interface Tool {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  order: number;
  docUrl?: string; // URL to official docs for this tool
  dataFile?: string; // Internal path to the tool's commands JSON file (server-only, not used by frontend)
}

export interface Modifier {
  flag: string;
  description: string;
  example?: string;
}

export interface Command {
  id: string;
  toolId: string;
  section: string;
  name: string;
  description: string;
  hint: string;
  importance: Importance;
  frequency: number;
  tags: string[];
  notes: string;
  favorite: boolean;
  order: number;
  modifiers: Modifier[];
  docUrl?: string; // URL to the official docs for this specific command
}

export interface ToolResource {
  id: string;
  toolId: string;
  type: ToolResourceType;
  name: string;
  identifier: string;
  publisher: string;
  active: boolean;
  utility: string;
  scope: ToolResourceScope;
  projectName: string;
  installedAt: string;
  securityAudited: boolean;
  path: string;
  source?: SkillSource;
}

export interface Database {
  tools: Tool[];
  commands: Command[];
  resources: ToolResource[];
}

export type SortKey = "manual" | "name" | "importance" | "frequency";
export type SortDir = "asc" | "desc";
