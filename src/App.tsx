import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./components/Header";
import { Tabs } from "./components/Tabs";
import { FilterBar } from "./components/FilterBar";
import { CommandTable } from "./components/CommandTable";
import { CommandModal, type CommandFormValues } from "./components/CommandModal";
import { DocModal } from "./components/DocModal";
import { ToolModal } from "./components/ToolModal";
import { FormatInfoModal } from "./components/FormatInfoModal";
import { SettingsModal } from "./components/SettingsModal";
import { ImportPreviewModal } from "./components/ImportPreviewModal";
import { useStore } from "./store/useStore";
import type { Command } from "./types";

interface PendingImport {
  tools: Array<{ id: string; name: string; slug: string; icon?: string; color?: string }>;
  commands: Array<Partial<Command> & { toolId: string; name: string }>;
}

function App() {
  const load = useStore((s) => s.load);
  const loading = useStore((s) => s.loading);
  const tools = useStore((s) => s.tools);
  const activeToolId = useStore((s) => s.activeToolId);
  const commands = useStore((s) => s.commands);
  const addCommand = useStore((s) => s.addCommand);
  const updateCommand = useStore((s) => s.updateCommand);
  const addTool = useStore((s) => s.addTool);

  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [docModalCommand, setDocModalCommand] = useState<Command | null>(null);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [showToolModal, setShowToolModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  const activeTool = useMemo(
    () => tools.find((t) => t.id === activeToolId) ?? null,
    [tools, activeToolId],
  );

  const existingSections = useMemo(() => {
    if (!activeTool) return [];
    const set = new Set<string>();
    for (const c of commands) if (c.toolId === activeTool.id) set.add(c.section);
    return [...set].sort();
  }, [commands, activeTool]);

  const handleOpenCreate = () => {
    setEditingCommand(null);
    setShowCommandModal(true);
  };

  const handleOpenEdit = (cmd: Command) => {
    setEditingCommand(cmd);
    setShowCommandModal(true);
  };

  const handleOpenDocs = (cmd: Command) => setDocModalCommand(cmd);

  const handleSaveCommand = async (values: CommandFormValues) => {
    if (!activeTool) return;
    if (editingCommand) {
      await updateCommand(editingCommand.id, values);
    } else {
      await addCommand({ ...values, toolId: activeTool.id });
    }
    setShowCommandModal(false);
    setEditingCommand(null);
  };

  const handleExport = () => {
    const data = JSON.stringify({ tools, commands }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commands-viewer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed?.tools) || !Array.isArray(parsed?.commands)) {
        setPendingImport(null);
        window.alert(
          "Formato inválido: el JSON debe tener arrays `tools` y `commands`.",
        );
        return;
      }
      setPendingImport({ tools: parsed.tools, commands: parsed.commands });
    } catch (err) {
      window.alert("Error al leer el archivo: " + (err as Error).message);
    } finally {
      e.target.value = "";
    }
  };

  const commitImport = async () => {
    if (!pendingImport) return;
    try {
      // Import strategy: map source tool IDs → existing/new tool IDs by slug.
      // We deduplicate slugs in the source JSON first to avoid silent data loss.
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
      // Re-read state for newly created IDs
      const freshTools = useStore.getState().tools;
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
    } finally {
      setPendingImport(null);
    }
  };

  return (
    <div className="relative z-1 flex min-h-screen flex-col">
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
      <Tabs onAddTool={() => setShowToolModal(true)} />
      {activeTool && <FilterBar />}
      <main className="flex-1">
        {loading && tools.length === 0 ? (
          <div className="mx-auto max-w-[1400px] px-6 py-16 text-center font-mono text-sm text-[color:var(--color-text-muted)]">
            Cargando...
          </div>
        ) : activeTool ? (
          <CommandTable tool={activeTool} onEdit={handleOpenEdit} onAdd={handleOpenCreate} onOpenDocs={handleOpenDocs} />
        ) : (
          <NoTools onAddTool={() => setShowToolModal(true)} />
        )}
      </main>
      <footer className="mt-8 border-t border-[color:var(--color-border)] py-4">
        <p className="text-center font-mono text-[0.65rem] text-[color:var(--color-text-muted)]">
          commands-viewer · Vite + React + Tailwind v4 · persistencia local en{" "}
          <span className="text-[color:var(--color-accent-cyan)]">data/commands.json</span>
        </p>
      </footer>

      {showCommandModal && activeTool && (
        <CommandModal
          tool={activeTool}
          command={editingCommand}
          existingSections={existingSections}
          onClose={() => {
            setShowCommandModal(false);
            setEditingCommand(null);
          }}
          onSave={handleSaveCommand}
        />
      )}

      {showToolModal && (
        <ToolModal
          onClose={() => setShowToolModal(false)}
          onSave={async (values) => {
            await addTool(values);
            setShowToolModal(false);
          }}
        />
      )}

      {showFormatModal && (
        <FormatInfoModal onClose={() => setShowFormatModal(false)} />
      )}

      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {docModalCommand && (
        <DocModal
          command={docModalCommand}
          onClose={() => setDocModalCommand(null)}
        />
      )}

      {pendingImport && (
        <ImportPreviewModal
          data={pendingImport}
          existingTools={tools}
          onCancel={() => setPendingImport(null)}
          onConfirm={commitImport}
        />
      )}
    </div>
  );
}

function NoTools({ onAddTool }: { onAddTool: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h2 className="font-mono text-2xl text-[color:var(--color-text-bright)]">
        Empieza creando una herramienta
      </h2>
      <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
        Añade tu primera tool (Claude Code, git, docker...) para empezar a gestionar
        sus comandos.
      </p>
      <button
        type="button"
        onClick={onAddTool}
        className="mt-6 rounded-lg border border-[color:var(--color-accent-cyan)]/40 bg-[color:var(--color-accent-cyan)]/10 px-6 py-3 font-mono text-sm text-[color:var(--color-accent-cyan)] hover:bg-[color:var(--color-accent-cyan)]/20"
      >
        + Crear primera herramienta
      </button>
    </div>
  );
}

export default App;
