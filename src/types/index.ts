export type Importance = "critical" | "high" | "medium" | "low";

export interface Tool {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  order: number;
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
}

export interface Database {
  tools: Tool[];
  commands: Command[];
}

export type SortKey = "manual" | "name" | "importance" | "frequency";
export type SortDir = "asc" | "desc";
