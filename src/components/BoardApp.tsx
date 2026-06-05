"use client";

import { useEffect, useMemo, useState } from "react";
import Board from "./Board";
import DetailDrawer, {
  detailFromCard,
  detailFromIssue,
  detailFromRock,
  type DetailItem,
} from "./DetailDrawer";
import Header, { type AppView } from "./Header";
import IssuesView from "./IssuesView";
import RockFilter from "./RockFilter";
import { useBoard } from "@/hooks/useBloomData";
import {
  columnFor,
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

  const [view, setView] = useState<AppView>("board");
  const [overlay, setOverlay] = useState<Record<string, ColumnId>>({});
  const [activeRockIds, setActiveRockIds] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<{ item: DetailItem; label?: string } | null>(
    null,
  );

  useEffect(() => setOverlay(loadOverlay()), []);

  const rocks: Rock[] = useMemo(() => data?.rocks ?? [], [data]);

  // Board cards: milestones + to-dos only (issues have their own view)
  const cards: BoardCard[] = useMemo(() => {
    const ms = (data?.milestones ?? []).map(milestoneToCard);
    const td = (data?.todos ?? []).map(todoToCard);
    return [...ms, ...td];
  }, [data]);

  const hasTodos = (data?.todos?.length ?? 0) > 0;

  const groups: Rock[] = useMemo(() => {
    if (!hasTodos) return rocks;
    return [
      ...rocks,
      {
        id: TODO_GROUP_ID,
        name: TODO_GROUP_NAME,
        status: "incomplete" as const,
        dueDate: null,
        owner: null,
        completion: 0,
      },
    ];
  }, [rocks, hasTodos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((c) => {
      if (activeRockIds && !activeRockIds.has(c.rockId ?? "__none__")) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cards, activeRockIds, query]);

  /** Move a board card to a column — syncs completion to Bloom, persists overlay. */
  async function moveTo(card: BoardCard, target: ColumnId) {
    const current = columnFor(card, overlay);
    if (current === target) return;

    const nextOverlay = { ...overlay, [card.uid]: target };
    setOverlay(nextOverlay);
    saveOverlay(nextOverlay);

    const shouldComplete = target === "complete";
    if (shouldComplete !== card.complete) {
      const listKey = card.kind === "todo" ? "todos" : "milestones";
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

  /** Toggle an issue's solved/open state — writes to Bloom optimistically. */
  async function toggleIssue(id: string, complete: boolean) {
    mutate(
      (prev) =>
        prev && {
          ...prev,
          issues: prev.issues.map((i) =>
            i.id === id ? { ...i, complete } : i,
          ),
        },
      { revalidate: false },
    );

    try {
      const res = await fetch(`/api/issues/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete }),
      });
      if (!res.ok) throw new Error();
    } catch {
      mutate();
    }
  }

  const loading = isLoading;
  const issues = data?.issues ?? [];

  return (
    <div className="flex h-screen flex-col bg-[#0f0f11]">
      <Header
        userName={userName}
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
      />

      <div className="flex min-h-0 flex-1">
        {view === "board" && (
          <RockFilter
            rocks={groups}
            cards={cards}
            activeRockIds={activeRockIds}
            onChange={setActiveRockIds}
            onOpenRock={(rock) =>
              setDetail({ item: detailFromRock(rock), label: "Rock" })
            }
          />
        )}

        <main className="min-w-0 flex-1 overflow-hidden p-4">
          {error ? (
            <ErrorState message={(error as Error).message} />
          ) : loading ? (
            <LoadingState />
          ) : view === "issues" ? (
            <IssuesView
              issues={issues}
              onToggle={toggleIssue}
              onOpen={(issue) => setDetail({ item: detailFromIssue(issue) })}
            />
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
            />
          )}
        </main>
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
