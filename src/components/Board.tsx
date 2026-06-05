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
import MilestoneCard from "./MilestoneCard";
import { COLUMNS, columnFor, type ColumnId } from "@/lib/board";
import type { Milestone, Rock } from "@/lib/bloom/types";

export default function Board({
  milestones,
  rocks,
  overlay,
  onMove,
}: {
  milestones: Milestone[];
  rocks: Rock[];
  overlay: Record<string, ColumnId>;
  onMove: (milestone: Milestone, target: ColumnId) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Require a small drag distance so clicks aren't swallowed.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const rockName = useMemo(() => {
    const map = new Map(rocks.map((r) => [r.id, r.name]));
    return (id: string | null) => (id ? map.get(id) ?? "Unknown Rock" : "Unassigned");
  }, [rocks]);

  const byColumn = useMemo(() => {
    const groups: Record<ColumnId, Milestone[]> = {
      todo: [],
      "in-progress": [],
      blocked: [],
      complete: [],
    };
    for (const m of milestones) {
      groups[columnFor(m, overlay)].push(m);
    }
    return groups;
  }, [milestones, overlay]);

  const activeMilestone = activeId
    ? milestones.find((m) => m.id === activeId) ?? null
    : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const target = String(over.id) as ColumnId;
    const milestone = milestones.find((m) => m.id === String(active.id));
    if (milestone) onMove(milestone, target);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="scrollbar-thin flex h-full gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            column={col}
            milestones={byColumn[col.id]}
            rockName={rockName}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeMilestone ? (
          <MilestoneCard
            milestone={activeMilestone}
            rockName={rockName(activeMilestone.rockId)}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
