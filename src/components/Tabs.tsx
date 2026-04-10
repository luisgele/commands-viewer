import { Plus, Pencil, GripVertical, ExternalLink } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tool } from "../types";
import { useStore } from "../store/useStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { ToolModal } from "./ToolModal";

interface TabsProps {
  onAddTool: () => void;
}

export function Tabs({ onAddTool }: TabsProps) {
  const tools = useStore((s) => s.tools);
  const activeToolId = useStore((s) => s.activeToolId);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const commands = useStore((s) => s.commands);
  const updateTool = useStore((s) => s.updateTool);
  const deleteTool = useStore((s) => s.deleteTool);
  const reorderTools = useStore((s) => s.reorderTools);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [confirmDeleteTool, setConfirmDeleteTool] = useState<Tool | null>(null);

  const commandCount = (toolId: string) =>
    commands.filter((c) => c.toolId === toolId).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tools.findIndex((t) => t.id === active.id);
    const newIdx = tools.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(tools, oldIdx, newIdx);
    await reorderTools(reordered.map((t) => t.id));
  };

  return (
    <div className="border-b border-[color:var(--color-border)] bg-[color:var(--color-bg-card)]/50">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 overflow-x-auto px-6 py-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tools.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {tools.map((tool) => (
              <SortableToolTab
                key={tool.id}
                tool={tool}
                active={tool.id === activeToolId}
                count={commandCount(tool.id)}
                onActivate={() => setActiveTool(tool.id)}
                onEdit={() => {
                  setActiveTool(tool.id);
                  setEditingTool(tool);
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={onAddTool}
          className="ml-2 flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-[color:var(--color-border-glow)] px-3 py-2 font-mono text-xs text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-accent-cyan)] hover:text-[color:var(--color-accent-cyan)]"
        >
          <Plus size={13} />
          Nueva herramienta
        </button>
      </div>

      {editingTool && (
        <ToolModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSave={async (values) => {
            await updateTool(editingTool.id, values);
            setEditingTool(null);
          }}
          onDelete={() => {
            setConfirmDeleteTool(editingTool);
            setEditingTool(null);
          }}
        />
      )}

      {confirmDeleteTool && (
        <ConfirmDialog
          title={`Eliminar "${confirmDeleteTool.name}"`}
          message={
            commandCount(confirmDeleteTool.id) > 0
              ? `Se borrarán también ${commandCount(confirmDeleteTool.id)} comando(s) asociados.\n\nEsta acción no se puede deshacer.`
              : "Esta acción no se puede deshacer."
          }
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDeleteTool(null)}
          onConfirm={async () => {
            await deleteTool(confirmDeleteTool.id);
            setConfirmDeleteTool(null);
          }}
        />
      )}
    </div>
  );
}

interface SortableToolTabProps {
  tool: Tool;
  active: boolean;
  count: number;
  onActivate: () => void;
  onEdit: () => void;
}

function SortableToolTab({
  tool,
  active,
  count,
  onActivate,
  onEdit,
}: SortableToolTabProps) {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tool.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(active
          ? { borderTopColor: tool.color, borderTopWidth: "2px" }
          : {}),
      }}
      className={clsx(
        "group relative flex shrink-0 items-center gap-1 rounded-lg border px-2 py-2 font-mono text-sm transition",
        active
          ? "border-[color:var(--color-border-glow)] bg-[color:var(--color-bg-card)] text-[color:var(--color-text-bright)]"
          : "border-transparent text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-card)] hover:text-[color:var(--color-text)]",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastrar para reordenar ${tool.name}`}
        className="flex h-6 w-4 cursor-grab items-center justify-center text-[color:var(--color-text-muted)]/40 transition hover:text-[color:var(--color-text-bright)] group-hover:text-[color:var(--color-text-muted)] active:cursor-grabbing"
      >
        <GripVertical size={13} />
      </button>
      <button
        type="button"
        className="flex items-center gap-2 pr-1"
        onClick={onActivate}
        onDoubleClick={onEdit}
        title="Doble clic para editar"
      >
        <span style={{ color: tool.color }} className="text-base">
          {tool.icon}
        </span>
        <span className="font-semibold">{tool.name}</span>
        <span className="rounded bg-[color:var(--color-bg-card-alt)] px-1.5 py-0.5 text-[0.65rem] text-[color:var(--color-text-muted)]">
          {count}
        </span>
      </button>
      {(active || hovered) && (
        <div className="flex items-center gap-0.5 border-l border-[color:var(--color-border)] pl-1.5">
          {tool.docUrl && (
            <a
              href={tool.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-7 w-7 items-center justify-center rounded text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-cyan)]"
              aria-label={`Documentación de ${tool.name}`}
              title={`Documentación de ${tool.name}`}
            >
              <ExternalLink size={13} />
            </a>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-cyan)]"
            aria-label={`Editar ${tool.name}`}
            title={`Editar ${tool.name}`}
          >
            <Pencil size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
