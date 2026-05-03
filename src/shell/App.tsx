import { useEffect, useRef, useState } from "react";
import { Header } from "../components/Header";
import { SettingsModal } from "../components/SettingsModal";
import { FormatInfoModal } from "../components/FormatInfoModal";
import { ImportPreviewModal } from "../components/ImportPreviewModal";
import { useShellStore } from "../store/useShellStore";
import { useCommandsStore } from "../modules/commands/store/useCommandsStore";
import { Sidebar } from "./Sidebar";
import { CommandsModule } from "../modules/commands/CommandsModule";
import { modules } from "../modules/registry";
import { useDomainsStore } from "../modules/domains/store/useDomainsStore";
import type { Command, Domain, DomainEmail, ToolResource } from "../types";

interface PendingImport {
  tools: Array<{ id: string; name: string; slug: string; icon?: string; color?: string }>;
  commands: Array<Partial<Command> & { toolId: string; name: string }>;
  resources: Array<Partial<ToolResource> & { toolId: string; name: string; identifier: string; path: string }>;
  domains: Array<Partial<Domain> & { name: string }>;
  emails: Array<Partial<DomainEmail> & { address: string }>;
}

export function AppShell() {
  const theme = useCommandsStore((s) => s.settings.theme);
  const activeModule = useShellStore((s) => s.activeModule);

  const tools = useCommandsStore((s) => s.tools);
  const commands = useCommandsStore((s) => s.commands);
  const resources = useCommandsStore((s) => s.resources);
  const addTool = useCommandsStore((s) => s.addTool);
  const addCommand = useCommandsStore((s) => s.addCommand);
  const addResource = useCommandsStore((s) => s.addResource);

  const domains = useDomainsStore((s) => s.domains);
  const emails = useDomainsStore((s) => s.emails);
  const addDomain = useDomainsStore((s) => s.addDomain);
  const addEmail = useDomainsStore((s) => s.addEmail);

  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleExport = () => {
    const data = JSON.stringify({ tools, commands, resources, domains, emails }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `managment-viewer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown> | null;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !Array.isArray(parsed?.tools) ||
        !Array.isArray(parsed?.commands) ||
        ("resources" in parsed && !Array.isArray(parsed?.resources)) ||
        ("domains" in parsed && !Array.isArray(parsed?.domains)) ||
        ("emails" in parsed && !Array.isArray(parsed?.emails))
      ) {
        setPendingImport(null);
        window.alert(
          "Formato inválido: el JSON debe tener arrays `tools`, `commands` y opcionalmente `resources`, `domains`, `emails`.",
        );
        return;
      }
      setPendingImport({
        tools: parsed.tools as PendingImport["tools"],
        commands: parsed.commands as PendingImport["commands"],
        resources: (parsed.resources ?? []) as PendingImport["resources"],
        domains: (parsed.domains ?? []) as PendingImport["domains"],
        emails: (parsed.emails ?? []) as PendingImport["emails"],
      });
    } catch (err) {
      window.alert("Error al leer el archivo: " + (err as Error).message);
    } finally {
      e.target.value = "";
    }
  };

  const commitImport = async () => {
    if (!pendingImport) return;
    try {
      const seenSlugs = new Set<string>();
      const toolIdMap = new Map<string, string>();
      for (const tool of pendingImport.tools) {
        if (seenSlugs.has(tool.slug)) continue;
        seenSlugs.add(tool.slug);
        const exists = tools.find((t) => t.slug === tool.slug);
        if (exists) {
          toolIdMap.set(tool.id, exists.id);
          continue;
        }
        await addTool({
          name: tool.name,
          icon: tool.icon,
          color: tool.color,
          slug: tool.slug,
        });
      }
      const freshTools = useCommandsStore.getState().tools;
      for (const tool of pendingImport.tools) {
        if (!toolIdMap.has(tool.id)) {
          const created = freshTools.find((t) => t.slug === tool.slug);
          if (created) toolIdMap.set(tool.id, created.id);
        }
      }
      for (const cmd of pendingImport.commands) {
        const newToolId = toolIdMap.get(cmd.toolId);
        if (!newToolId) continue;
        await addCommand({ ...cmd, id: undefined, toolId: newToolId });
      }
      for (const resource of pendingImport.resources) {
        const newToolId = toolIdMap.get(resource.toolId);
        if (!newToolId) continue;
        await addResource({ ...resource, id: undefined, toolId: newToolId });
      }

      // Import domains — dedup by name
      const domainIdMap = new Map<string, string>();
      for (const domain of pendingImport.domains) {
        const exists = domains.find((d) => d.name === domain.name);
        if (exists) {
          domainIdMap.set(domain.id ?? domain.name, exists.id);
          continue;
        }
        const created = await addDomain({ ...domain, id: undefined });
        domainIdMap.set(domain.id ?? domain.name, created.id);
      }

      // Import emails — dedup by address, remap domainId
      for (const email of pendingImport.emails) {
        const exists = emails.find((e) => e.address === email.address);
        if (exists) continue;
        if (!email.domainId) continue;
        const newDomainId = domainIdMap.get(email.domainId);
        if (!newDomainId) continue;
        await addEmail({ ...email, id: undefined, domainId: newDomainId });
      }
    } finally {
      setPendingImport(null);
    }
  };

  const activeModuleDef = modules.find((m) => m.id === activeModule);
  const ActiveModuleComponent = activeModuleDef?.component ?? CommandsModule;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onImport={handleImportClick}
          onExport={handleExport}
          onShowFormat={() => setShowFormatModal(true)}
          onShowSettings={() => setShowSettingsModal(true)}
        />
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
        <div className="flex-1 overflow-y-auto">
          <ActiveModuleComponent />
          <footer className="mt-8 border-t border-[color:var(--color-border)] py-4">
            <p className="text-center font-mono text-[0.65rem] text-[color:var(--color-text-muted)]">
              Managment Viewer · Vite + React + Tailwind v4 · persistencia local en{" "}
              <span className="text-[color:var(--color-accent-cyan)]">data/index.json</span>
              {" + "}
              <span className="text-[color:var(--color-accent-cyan)]">data/commands/*.json</span>
              {" + "}
              <span className="text-[color:var(--color-accent-cyan)]">data/domains.json</span>
            </p>
          </footer>
        </div>
      </div>

      {showFormatModal && (
        <FormatInfoModal onClose={() => setShowFormatModal(false)} />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {pendingImport && (
        <ImportPreviewModal
          data={{
            tools: pendingImport.tools,
            commands: pendingImport.commands,
            resources: pendingImport.resources,
            domains: pendingImport.domains,
            emails: pendingImport.emails,
          }}
          existingTools={tools}
          onCancel={() => setPendingImport(null)}
          onConfirm={commitImport}
        />
      )}
    </div>
  );
}
