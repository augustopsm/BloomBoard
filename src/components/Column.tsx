"use client";

import { useDroppable } from "@dnd-kit/core";
import Card from "./Card";
import type { BoardCard, ColumnDef } from "@/lib/board";

export default function Column({
  column,
  cards,
  groupName,
  onOpenCard,
  asanaEnabled,
}: {
  column: ColumnDef;
  cards: BoardCard[];
  groupName: (rockId: string | null) => string;
  onOpenCard: (card: BoardCard, groupName: string) => void;
  asanaEnabled: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-[272px] shrink-0 flex-col sm:w-[300px] lg:w-[340px] xl:w-[380px] 2xl:w-[420px]">
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${column.accent}`}>
          {column.title}
        </span>
        <span className="text-[11px] tabular-nums text-zinc-600">{cards.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`scrollbar-thin flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-xl border p-2 transition-colors ${
          isOver
            ? "border-bloom/40 bg-bloom/[0.05]"
            : "border-white/[0.06] bg-white/[0.02]"
        }`}
      >
        {cards.length === 0 && (
          <p className="px-1 py-8 text-center text-[11px] text-zinc-700">
            {column.description}
          </p>
        )}
        {cards.map((c) => (
          <Card
            key={c.uid}
            card={c}
            groupName={groupName(c.rockId)}
            onOpen={() => onOpenCard(c, groupName(c.rockId))}
            asanaEnabled={asanaEnabled}
          />
        ))}
      </div>
    </div>
  );
}
