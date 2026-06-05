"use client";

import { useRouter } from "next/navigation";

export default function Header({
  userName,
  query,
  onQueryChange,
}: {
  userName: string;
  query: string;
  onQueryChange: (v: string) => void;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bloom text-lg">
          🌸
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold text-slate-900">BloomBoard</h1>
          <p className="text-[11px] text-slate-400">Milestones · Kanban</p>
        </div>
      </div>

      <div className="relative ml-4 max-w-xs flex-1">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search milestones…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none focus:border-bloom focus:bg-white focus:ring-2 focus:ring-bloom/20"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-slate-500 sm:inline">{userName}</span>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
