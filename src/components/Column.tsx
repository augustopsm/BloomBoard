"use client";

import { useDroppable } from "@dnd-kit/core";
import Card from "./Card";
import type { BoardCard, ColumnDef } from "@/lib/board";

export default function Column({
  column,
  cards,
  groupName,
}: {
  column: ColumnDef;
  cards: BoardCard[];
  groupName: (rockId: string | null) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${column.accent}`}
          >
            {column.title}
          </span>
          <span className="text-xs text-slate-400">{cards.length}</span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-2 transition ${
          isOver
            ? "border-bloom bg-bloom-light/60"
            : "border-slate-200 bg-slate-100/50"
        }`}
      >
        {cards.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-slate-300">
            {column.description}
          </p>
        )}
        {cards.map((c) => (
          <Card key={c.uid} card={c} groupName={groupName(c.rockId)} />
        ))}
      </div>
    </div>
  );
}
