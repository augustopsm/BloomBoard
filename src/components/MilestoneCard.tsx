"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { colorForRock, formatDueDate, isOverdue } from "@/lib/board";
import type { Milestone } from "@/lib/bloom/types";

export default function MilestoneCard({
  milestone,
  rockName,
  dragging = false,
}: {
  milestone: Milestone;
  rockName: string;
  /** True only for the floating DragOverlay clone. */
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: milestone.id });

  const due = formatDueDate(milestone.dueDate);
  const overdue = isOverdue(milestone);
  const accent = colorForRock(milestone.rockId);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`group cursor-grab touch-none rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition active:cursor-grabbing ${
        dragging ? "rotate-2 shadow-lg ring-2 ring-bloom/40" : "hover:shadow-md"
      } ${isDragging && !dragging ? "opacity-40" : ""}`}
    >
      <div className="mb-2 flex items-start gap-2">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
        <p
          className={`text-sm leading-snug ${
            milestone.complete ? "text-slate-400 line-through" : "text-slate-800"
          }`}
        >
          {milestone.name}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-[18px] text-xs">
        <span className="truncate text-slate-400" title={rockName}>
          {rockName}
        </span>

        {due && (
          <span
            className={`ml-auto rounded px-1.5 py-0.5 font-medium ${
              overdue
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {overdue ? "Overdue · " : ""}
            {due}
          </span>
        )}
      </div>

      {milestone.owner && (
        <div className="mt-2 flex items-center gap-1.5 pl-[18px]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
            {initials(milestone.owner.name)}
          </span>
          <span className="truncate text-xs text-slate-400">
            {milestone.owner.name}
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
