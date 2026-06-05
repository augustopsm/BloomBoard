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
    <header className="flex items-center gap-4 border-b border-white/[0.06] bg-[#111113] px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bloom/90 text-sm">
          🌸
        </span>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold text-zinc-100">BloomBoard</h1>
          <p className="text-[10px] text-zinc-600">Milestones · Kanban</p>
        </div>
      </div>

      <div className="relative ml-4 max-w-xs flex-1">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition focus:border-bloom/60 focus:bg-white/[0.06] focus:ring-1 focus:ring-bloom/30"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-sm text-zinc-500 sm:inline">{userName}</span>
        <button
          onClick={logout}
          className="rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.08] hover:text-zinc-200"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
