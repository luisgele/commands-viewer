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

// --- Domain types ---

export type DomainStatus = "active" | "expired" | "pending" | "transferred" | "cancelled";
export type EmailType = "personal" | "work" | "support" | "noreply" | "billing" | "other";

export interface Domain {
  id: string;
  name: string;
  registrar: string;
  registrarUrl?: string;
  registrarUsername?: string;
  registrationDate: string; // ISO date
  expirationDate: string;   // ISO date
  renewalPrice: number;
  autoRenew: boolean;
  hostingProvider?: string;
  hostingPlan?: string;
  status: DomainStatus;
  favorite?: boolean;
  pinned?: boolean;
  order?: number;
  notes?: string;
  tags?: string[];
}

export interface DomainEmail {
  id: string;
  domainId: string;
  address: string;
  type: EmailType;
  provider: string;
  createdAt?: string;
  forwardingTo?: string;
  storageLimit?: string;
  passwordHint?: string;
  active: boolean;
  order?: number;
  notes?: string;
}

export interface Database {
  tools: Tool[];
  commands: Command[];
  resources: ToolResource[];
  domains: Domain[];
  emails: DomainEmail[];
}
