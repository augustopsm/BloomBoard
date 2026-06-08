"use client";

import { useEffect, useMemo, useState } from "react";
import Board from "./Board";
import KPIDrawer from "./KPIDrawer";
import DetailDrawer, {
  detailFromCard,
  detailFromRock,
  type DetailItem,
} from "./DetailDrawer";
import Header from "./Header";
import RockFilter from "./RockFilter";
import { useBoard } from "@/hooks/useBloomData";
import {
  columnFor,
  issueToCard,
  ISSUE_GROUP_ID,
  ISSUE_GROUP_NAME,
  loadAsanaTasks,
  loadOverlay,
  milestoneToCard,
  saveOverlay,
  todoToCard,
  TODO_GROUP_ID,
  TODO_GROUP_NAME,
  type BoardCard,
  type ColumnId,
} from "@/lib/board";
import type { Rock } from "@/lib/bloom/types";

export default function BoardApp({
  userName,
  userId,
}: {
  userName: string;
  userId: string | null;
}) {
  const [extraUserIds, setExtraUserIds] = useState<string[]>([]);
  const { data, error, isLoading, mutate } = useBoard(extraUserIds);

  const [overlay, setOverlay] = useState<Record<string, ColumnId>>({});
  const [activeRockIds, setActiveRockIds] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<{ item: DetailItem; label?: string } | null>(
    null,
  );

  useEffect(() => setOverlay(loadOverlay()), []);

  // Only rocks that actually have at least one milestone are shown. Empty
  // rocks (no milestones for the viewed user/meeting) just clutter the sidebar
  // and KPIs without producing any cards on the board.
  const rocks: Rock[] = useMemo(() => {
    const rockIdsWithMilestones = new Set(
      (data?.milestones ?? []).map((m) => m.rockId).filter(Boolean),
    );
    return (data?.rocks ?? []).filter((r) => rockIdsWithMilestones.has(r.id));
  }, [data]);

  // Board cards: milestones + to-dos + issues, unified.
  const cards: BoardCard[] = useMemo(() => {
    const rockMeetings = new Map(
      (data?.rocks ?? []).map((r) => [r.id, (r.meetings ?? []).join(", ")]),
    );
    const rockOwners = new Map(
      (data?.rocks ?? []).filter((r) => r.owner).map((r) => [r.id, r.owner!]),
    );
    const ms = (data?.milestones ?? []).map((m) => {
      const card = milestoneToCard(m);
      const meeting = card.rockId ? rockMeetings.get(card.rockId) : null;
      const owner = card.owner ?? (card.rockId ? (rockOwners.get(card.rockId) ?? null) : null);
      return { ...card, meeting: meeting || null, owner };
    });
    const td = (data?.todos ?? []).map(todoToCard);
    const is = (data?.issues ?? []).map(issueToCard);
    return [...ms, ...td, ...is];
  }, [data]);

  const hasTodos = (data?.todos?.length ?? 0) > 0;
  const hasIssues = (data?.issues?.length ?? 0) > 0;

  const groups: Rock[] = useMemo(() => {
    const extras: Rock[] = [];
    if (hasTodos) {
      extras.push({
        id: TODO_GROUP_ID,
        name: TODO_GROUP_NAME,
        status: "incomplete",
        dueDate: null,
        owner: null,
        completion: 0,
      });
    }
    if (hasIssues) {
      extras.push({
        id: ISSUE_GROUP_ID,
        name: ISSUE_GROUP_NAME,
        status: "incomplete",
        dueDate: null,
        owner: null,
        completion: 0,
      });
    }
    return [...rocks, ...extras];
  }, [rocks, hasTodos, hasIssues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (activeRockIds && !activeRockIds.has(c.rockId ?? "__none__")) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cards, activeRockIds, query]);

  /** Silently move the card's Asana task to the matching section (best-effort). */
  function syncAsanaColumn(card: BoardCard, target: ColumnId) {
    const task = loadAsanaTasks()[card.uid];
    if (!task?.gid) return;
    fetch("/api/asana/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskGid: task.gid, column: target }),
    }).catch(() => {});
  }

  /** Move a board card to a column — syncs completion to Bloom, persists overlay. */
  async function moveTo(card: BoardCard, target: ColumnId) {
    const current = columnFor(card, overlay);
    if (current === target) return;

    const nextOverlay = { ...overlay, [card.uid]: target };
    setOverlay(nextOverlay);
    saveOverlay(nextOverlay);
    syncAsanaColumn(card, target);

    const shouldComplete = target === "complete";
    if (shouldComplete !== card.complete) {
      const listKey =
        card.kind === "todo"
          ? "todos"
          : card.kind === "issue"
            ? "issues"
            : "milestones";
      mutate(
        (prev) =>
          prev && {
            ...prev,
            [listKey]: prev[listKey].map((item) =>
              item.id === card.id ? { ...item, complete: shouldComplete } : item,
            ),
          },
        { revalidate: false },
      );

      const endpoint =
        card.kind === "todo"
          ? `/api/todos/${card.id}`
          : card.kind === "issue"
            ? `/api/issues/${card.id}`
            : `/api/milestones/${card.id}`;
      try {
        const res = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ complete: shouldComplete }),
        });
        if (!res.ok) throw new Error();
      } catch {
        mutate();
        const reverted = { ...nextOverlay, [card.uid]: current };
        setOverlay(reverted);
        saveOverlay(reverted);
      }
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#0f0f11]">
      <Header
        userName={userName}
        userId={userId ?? ""}
        query={query}
        onQueryChange={setQuery}
        extraUserIds={extraUserIds}
        onExtraUsersChange={(ids) => {
          setExtraUserIds(ids);
          setActiveRockIds(null);
        }}
      />

      <div className="flex min-h-0 flex-1">
        <RockFilter
          rocks={groups}
          cards={cards}
          activeRockIds={activeRockIds}
          onChange={setActiveRockIds}
          onOpenRock={(rock) =>
            setDetail({ item: detailFromRock(rock), label: "Rock" })
          }
        />

        <main className="min-w-0 flex-1 overflow-hidden p-4">
          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : isLoading ? (
            <LoadingState />
          ) : cards.length === 0 ? (
            <EmptyState />
          ) : (
            <Board
              cards={filtered}
              groups={groups}
              overlay={overlay}
              onMove={moveTo}
              onOpenCard={(card, groupName) =>
                setDetail({ item: detailFromCard(card, groupName) })
              }
              asanaEnabled={data?.asanaEnabled ?? false}
            />
          )}
        </main>

        <KPIDrawer cards={cards} overlay={overlay} groups={groups} />
      </div>

      <DetailDrawer
        item={detail?.item ?? null}
        kindLabelOverride={detail?.label}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-zinc-600">
      Loading from Bloom Growth…
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="text-2xl">🌱</p>
      <p className="text-sm text-zinc-600">
        Nothing to show yet. Add milestones or to-dos in Bloom Growth and they&apos;ll appear here.
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <p className="max-w-md text-sm text-rose-400">{message}</p>
      <p className="max-w-md text-xs text-zinc-600">
        If this is a 404, check{" "}
        <code className="text-zinc-500">src/lib/bloom/endpoints.ts</code>.
      </p>
    </div>
  );
}
