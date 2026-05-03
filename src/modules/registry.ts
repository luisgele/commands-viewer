import { Bot, Globe, Terminal } from "lucide-react";
import { ClaudeToolsModule } from "./claude/ClaudeToolsModule";
import { CommandsModule } from "./commands/CommandsModule";
import { DomainsModule } from "./domains/DomainsModule";

export const modules = [
  {
    id: "commands",
    label: "Comandos",
    icon: Terminal,
    component: CommandsModule,
  },
  {
    id: "claude-tools",
    label: "Claude Tools",
    icon: Bot,
    component: ClaudeToolsModule,
  },
  {
    id: "domains",
    label: "Dominios",
    icon: Globe,
    component: DomainsModule,
  },
] as const;

export type ModuleId = (typeof modules)[number]["id"];
