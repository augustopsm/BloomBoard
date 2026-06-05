"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  colorForRock,
  formatDueDate,
  isOverdue,
  type BoardCard,
} from "@/lib/board";

export default function Card({
  card,
  groupName,
  dragging = false,
}: {
  card: BoardCard;
  groupName: string;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.uid });

  const due = formatDueDate(card.dueDate);
  const overdue = isOverdue(card);
  const accent = colorForRock(card.rockId);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`group cursor-grab touch-none rounded-lg border bg-surface p-3 transition-all active:cursor-grabbing ${
        dragging
          ? "rotate-1 border-bloom/30 shadow-2xl shadow-black/60 ring-1 ring-bloom/20"
          : "border-white/[0.07] hover:border-white/[0.12] hover:bg-surface-hover"
      } ${isDragging && !dragging ? "opacity-30" : ""}`}
    >
      <div className="mb-2 flex items-start gap-2">
        <span
          className="mt-[3px] h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
        <p
          className={`text-[13px] leading-snug ${
            card.complete ? "text-zinc-600 line-through" : "text-zinc-200"
          }`}
        >
          {card.name}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-4 text-[11px]">
        {card.kind === "todo" ? (
          <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-medium text-cyan-400">
            To-Do
          </span>
        ) : card.kind === "issue" ? (
          <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-medium text-violet-400">
            Issue
          </span>
        ) : (
          <span className="truncate text-zinc-600" title={groupName}>
            {groupName}
          </span>
        )}

        {due && (
          <span
            className={`ml-auto rounded px-1.5 py-0.5 font-medium ${
              overdue
                ? "bg-rose-500/10 text-rose-400"
                : "bg-white/[0.04] text-zinc-600"
            }`}
          >
            {overdue ? "Overdue · " : ""}
            {due}
          </span>
        )}
      </div>

      {card.owner && (
        <div className="mt-2 flex items-center gap-1.5 pl-4">
          <span className="flex h-4.5 w-4.5 h-[18px] w-[18px] items-center justify-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-300">
            {initials(card.owner.name)}
          </span>
          <span className="truncate text-[11px] text-zinc-600">
            {card.owner.name}
          </span>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
