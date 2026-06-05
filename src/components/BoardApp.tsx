"use client";

import { useEffect, useMemo, useState } from "react";
import Board from "./Board";
import Header from "./Header";
import RockFilter from "./RockFilter";
import { useBoard } from "@/hooks/useBloomData";
import {
  columnFor,
  issueToCard,
  ISSUE_GROUP_ID,
  ISSUE_GROUP_NAME,
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

export default function BoardApp({ userName }: { userName: string }) {
  const { data, error, isLoading, mutate } = useBoard();

  const [overlay, setOverlay] = useState<Record<string, ColumnId>>({});
  const [activeRockIds, setActiveRockIds] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState("");

  // Hydrate the local stage overlay once on mount.
  useEffect(() => setOverlay(loadOverlay()), []);

  const rocks: Rock[] = useMemo(() => data?.rocks ?? [], [data]);

  // Milestones + to-dos + issues unified into board cards.
  const cards: BoardCard[] = useMemo(() => {
    const ms = (data?.milestones ?? []).map(milestoneToCard);
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
      if (activeRockIds && !activeRockIds.has(c.rockId ?? "__none__")) {
        return false;
      }
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cards, activeRockIds, query]);

  /** Move a card to a column — sync completion to Bloom, persist overlay. */
  async function moveTo(card: BoardCard, target: ColumnId) {
    const current = columnFor(card, overlay);
    if (current === target) return;

    // Update the local overlay immediately for snappy UX.
    const nextOverlay = { ...overlay, [card.uid]: target };
    setOverlay(nextOverlay);
    saveOverlay(nextOverlay);

    const shouldComplete = target === "complete";
    if (shouldComplete !== card.complete) {
      const listKey =
        card.kind === "todo" ? "todos" : card.kind === "issue" ? "issues" : "milestones";
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

  const loading = isLoading;

  return (
    <div className="flex h-screen flex-col bg-[#0f0f11]">
      <Header userName={userName} query={query} onQueryChange={setQuery} />

      <div className="flex min-h-0 flex-1">
        <RockFilter
          rocks={groups}
          cards={cards}
          activeRockIds={activeRockIds}
          onChange={setActiveRockIds}
        />

        <main className="min-w-0 flex-1 overflow-hidden p-4">
          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : loading ? (
            <LoadingState />
          ) : cards.length === 0 ? (
            <EmptyState />
          ) : (
            <Board
              cards={filtered}
              groups={groups}
              overlay={overlay}
              onMove={moveTo}
            />
          )}
        </main>
      </div>
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
        If this is a 404, check <code className="text-zinc-500">src/lib/bloom/endpoints.ts</code>.
      </p>
    </div>
  );
}
