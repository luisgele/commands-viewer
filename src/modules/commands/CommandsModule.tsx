import { useEffect, useMemo, useState } from "react";
import { FilterBar } from "../../components/FilterBar";
import { Tabs } from "../../components/Tabs";
import { CommandTable } from "../../components/CommandTable";
import { CommandModal, type CommandFormValues } from "../../components/CommandModal";
import { DocModal } from "../../components/DocModal";
import { ToolModal } from "../../components/ToolModal";
import { useCommandsStore } from "./store/useCommandsStore";
import type { Command } from "../../types";

export function CommandsModule() {
  const load = useCommandsStore((s) => s.load);
  const loading = useCommandsStore((s) => s.loading);
  const tools = useCommandsStore((s) => s.tools);
  const activeToolId = useCommandsStore((s) => s.activeToolId);
  const commands = useCommandsStore((s) => s.commands);
  const addCommand = useCommandsStore((s) => s.addCommand);
  const updateCommand = useCommandsStore((s) => s.updateCommand);
  const addTool = useCommandsStore((s) => s.addTool);

  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [docModalCommand, setDocModalCommand] = useState<Command | null>(null);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [showToolModal, setShowToolModal] = useState(false);

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

  return (
    <div className="flex flex-col">
      <Tabs onAddTool={() => setShowToolModal(true)} />
      {activeTool && <FilterBar />}
      <main className="flex-1">
        {loading && tools.length === 0 ? (
          <div className="mx-auto max-w-[1400px] px-6 py-16 text-center font-mono text-sm text-[color:var(--color-text-muted)]">
            Cargando...
          </div>
        ) : activeTool ? (
          <CommandTable
            tool={activeTool}
            onEdit={handleOpenEdit}
            onAdd={handleOpenCreate}
            onOpenDocs={handleOpenDocs}
          />
        ) : (
          <NoTools onAddTool={() => setShowToolModal(true)} />
        )}
      </main>

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

      {docModalCommand && (
        <DocModal
          command={docModalCommand}
          onClose={() => setDocModalCommand(null)}
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
