"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Repo = {
  full_name: string;
  private: boolean;
  updated_at?: string;
  name?: string;
};

export function CommandClient({ repos, error }: { repos: Repo[]; error?: string | null }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return repos;
    const needle = query.toLowerCase();
    return repos.filter((repo) => repo.full_name.toLowerCase().includes(needle));
  }, [query, repos]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="glass-panel rounded-xl border border-slate-800/60 p-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Repository Search</h2>
        <p className="mt-2 text-sm text-slate-500">Search your GitHub repos and jump into a file tree.</p>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repos" className="pl-9" />
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-slate-800/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Repositories</h2>
          <span className="text-xs text-slate-500">{filtered.length} results</span>
        </div>
        <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
          {error ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-6 text-center text-sm text-rose-200">
              {error}
            </div>
          ) : null}
          {!error && filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700/70 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
              No repositories found.
            </div>
          ) : null}
          {filtered.map((repo) => (
            <div
              key={repo.full_name}
              className="group rounded-lg border border-slate-700/60 bg-slate-950/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-cyan-500/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-100">{repo.full_name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Updated {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : "recently"}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                  repo.private ? "bg-rose-500/10 text-rose-200" : "bg-emerald-500/10 text-emerald-200"
                }`}>
                  {repo.private ? "private" : "public"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
