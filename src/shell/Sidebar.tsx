import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useShellStore } from "../store/useShellStore";
import { modules } from "../modules/registry";
import clsx from "clsx";

export function Sidebar() {
  const activeModule = useShellStore((s) => s.activeModule);
  const collapsed = useShellStore((s) => s.sidebarCollapsed);
  const setActiveModule = useShellStore((s) => s.setActiveModule);
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);

  return (
    <aside
      className={clsx(
        "flex flex-col border-r border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]/60 transition-all duration-200",
        collapsed ? "w-16" : "w-52",
      )}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <span className="font-mono text-xs font-bold text-[color:var(--color-text-muted)]">
            Módulos
          </span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text-bright)]"
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const active = mod.id === activeModule;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveModule(mod.id)}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 font-mono text-sm transition",
                active
                  ? "border-l-2 border-[color:var(--color-accent-cyan)] bg-[color:var(--color-accent-cyan)]/10 text-[color:var(--color-accent-cyan)]"
                  : "border-l-2 border-transparent text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text)]",
                collapsed && "justify-center px-2",
              )}
              title={collapsed ? mod.label : undefined}
            >
              <Icon size={18} />
              {!collapsed && <span>{mod.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
