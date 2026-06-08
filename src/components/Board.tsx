"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import Column from "./Column";
import Card from "./Card";
import {
  COLUMNS,
  columnFor,
  type BoardCard,
  type ColumnId,
} from "@/lib/board";
import type { Rock } from "@/lib/bloom/types";

export default function Board({
  cards,
  groups,
  overlay,
  onMove,
  onOpenCard,
  asanaEnabled,
}: {
  cards: BoardCard[];
  groups: Rock[];
  overlay: Record<string, ColumnId>;
  onMove: (card: BoardCard, target: ColumnId) => void;
  onOpenCard: (card: BoardCard, groupName: string) => void;
  asanaEnabled: boolean;
}) {
  const [activeUid, setActiveUid] = useState<string | null>(null);

  // Require a small drag distance so clicks aren't swallowed.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const groupName = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g.name]));
    return (id: string | null) =>
      id ? map.get(id) ?? "Unknown Rock" : "Unassigned";
  }, [groups]);

  const byColumn = useMemo(() => {
    const cols: Record<ColumnId, BoardCard[]> = {
      todo: [],
      "in-progress": [],
      blocked: [],
      complete: [],
    };
    for (const c of cards) {
      cols[columnFor(c, overlay)].push(c);
    }
    return cols;
  }, [cards, overlay]);

  const activeCard = activeUid
    ? cards.find((c) => c.uid === activeUid) ?? null
    : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveUid(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveUid(null);
    const { active, over } = e;
    if (!over) return;
    const target = String(over.id) as ColumnId;
    const card = cards.find((c) => c.uid === String(active.id));
    if (card) onMove(card, target);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveUid(null)}
    >
      <div className="scrollbar-thin flex h-full gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            cards={byColumn[col.id]}
            groupName={groupName}
            onOpenCard={onOpenCard}
            asanaEnabled={asanaEnabled}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <Card
            card={activeCard}
            groupName={groupName(activeCard.rockId)}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
