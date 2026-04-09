import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Star,
  StickyNote,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import type { Command } from "../types";
import { useStore, type Density } from "../store/useStore";
import { FrequencyDots, ImportanceBadge } from "./Badges";

interface CommandRowProps {
  command: Command;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  sortable: boolean;
  expanded: boolean;
  hasModifiers: boolean;
  onToggleExpand: () => void;
  density: Density;
}

export function CommandRow({
  command,
  onEdit,
  onDelete,
  onToggleFavorite,
  sortable,
  expanded,
  hasModifiers,
  onToggleExpand,
  density,
}: CommandRowProps) {
  const isCompact = density === "compact";
  const cellPadY = isCompact ? "py-1.5" : "py-3";
  const btnSize = isCompact ? "h-7 w-7" : "h-9 w-9";
  const iconSize = isCompact ? 13 : 14;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: command.id, disabled: !sortable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasNotes = command.notes.trim().length > 0;
  const isPending = useStore((s) => s.pendingCommandIds.has(command.id));

  return (
    <tr
      ref={setNodeRef}
      style={style}
      aria-busy={isPending || undefined}
      className={clsx(
        "group bg-[color:var(--color-bg-card)] transition",
        isDragging
          ? "z-10 opacity-70 shadow-xl shadow-black/30"
          : "hover:bg-[color:var(--color-bg-card-alt)]",
        expanded && hasModifiers && "!bg-[color:var(--color-bg-card-alt)]",
        isPending && "opacity-60",
      )}
    >
      <td className="w-6 rounded-l-lg pl-1">
        {hasModifiers ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className={clsx(
              "flex items-center justify-center rounded transition",
              btnSize,
              expanded
                ? "text-[color:var(--color-accent-cyan)]"
                : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-bright)]",
            )}
            aria-label={expanded ? "Ocultar modificadores" : "Ver modificadores"}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown size={iconSize} /> : <ChevronRight size={iconSize} />}
          </button>
        ) : null}
      </td>
      <td className="w-8">
        {sortable ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar para reordenar"
            className={clsx(
              "flex cursor-grab items-center justify-center rounded text-[color:var(--color-text-muted)]/40 transition hover:text-[color:var(--color-text-bright)] group-hover:text-[color:var(--color-text-muted)] active:cursor-grabbing",
              btnSize,
            )}
          >
            <GripVertical size={iconSize + 1} />
          </button>
        ) : null}
      </td>
      <td className="w-9">
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={isPending}
          className={clsx(
            "flex items-center justify-center rounded transition disabled:cursor-wait",
            btnSize,
            command.favorite
              ? "text-[color:var(--color-accent-yellow)]"
              : "text-[color:var(--color-text-muted)]/50 hover:text-[color:var(--color-accent-yellow)]",
          )}
          aria-label={command.favorite ? "Quitar favorito" : "Marcar favorito"}
          aria-pressed={command.favorite}
        >
          <Star size={iconSize} fill={command.favorite ? "currentColor" : "none"} />
        </button>
      </td>
      <td className={clsx("whitespace-nowrap px-3 align-middle", cellPadY)}>
        <span className="font-mono text-[0.84rem] font-semibold text-[color:var(--color-text-bright)]">
          {command.name}
        </span>
      </td>
      <td className={clsx("px-3 align-middle text-[0.84rem]", cellPadY)}>
        <div className="text-[color:var(--color-text)]">{command.description}</div>
        {command.hint && (
          <div className="mt-1 font-mono text-[0.7rem] italic text-[color:var(--color-text-muted)]">
            {command.hint}
          </div>
        )}
        {hasNotes && (
          <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-[color:var(--color-accent-cyan)]/20 bg-[color:var(--color-accent-cyan)]/[0.04] px-2 py-1 text-[0.72rem] text-[color:var(--color-text)]">
            <StickyNote
              size={11}
              className="mt-0.5 shrink-0 text-[color:var(--color-accent-cyan)]"
              aria-hidden="true"
            />
            <span className="whitespace-pre-wrap">{command.notes}</span>
          </div>
        )}
        {command.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {command.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-[color:var(--color-border)] px-1.5 py-0.5 font-mono text-[0.6rem] text-[color:var(--color-text-muted)]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className={clsx("w-24 px-2 text-center align-middle", cellPadY)}>
        <ImportanceBadge importance={command.importance} />
      </td>
      <td className={clsx("w-24 px-2 text-center align-middle", cellPadY)}>
        <FrequencyDots frequency={command.frequency} />
      </td>
      <td className={clsx("w-24 rounded-r-lg px-2 text-right align-middle", cellPadY)}>
        <div className="flex items-center justify-end gap-0.5 opacity-70 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            disabled={isPending}
            className={clsx(
              "flex items-center justify-center rounded-md text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-cyan)] disabled:cursor-wait",
              btnSize,
            )}
            aria-label="Editar comando"
            title="Editar comando"
          >
            <Pencil size={iconSize} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className={clsx(
              "flex items-center justify-center rounded-md text-[color:var(--color-text-muted)] transition hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-accent-orange)] disabled:cursor-wait",
              btnSize,
            )}
            aria-label="Eliminar comando"
            title="Eliminar comando"
          >
            <Trash2 size={iconSize} />
          </button>
        </div>
      </td>
    </tr>
  );
}
