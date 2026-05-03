import { useEffect, useMemo } from "react";
import { ToolResourcePanel } from "../../components/ToolResourcePanel";
import { useCommandsStore } from "../commands/store/useCommandsStore";

export function ClaudeToolsModule() {
  const load = useCommandsStore((s) => s.load);
  const loading = useCommandsStore((s) => s.loading);
  const tools = useCommandsStore((s) => s.tools);

  useEffect(() => {
    load();
  }, [load]);

  const claudeTool = useMemo(
    () => tools.find((tool) => tool.slug === "claude-code") ?? null,
    [tools],
  );

  if (loading && tools.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 py-16 text-center font-mono text-sm text-[color:var(--color-text-muted)]">
        Cargando herramientas Claude...
      </div>
    );
  }

  if (!claudeTool) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h2 className="font-mono text-2xl text-[color:var(--color-text-bright)]">
          Sin herramienta Claude Code
        </h2>
        <p className="mt-3 text-sm text-[color:var(--color-text-muted)]">
          Crea una tool con slug `claude-code` para gestionar sus skills, agents,
          plugins y hooks desde este módulo.
        </p>
      </div>
    );
  }

  return <ToolResourcePanel tool={claudeTool} />;
}
