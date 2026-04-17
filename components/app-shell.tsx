"use client";

import { useMemo } from "react";
import { Bell, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({
  name,
  title,
  subtitle,
  children
}: {
  name: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-[#0B0F14]/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">{subtitle ?? "Mission control"}</p>
            <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full px-3">
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-3 rounded-full border border-slate-700/60 bg-slate-950/50 px-3 py-1.5 sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-xs font-black text-white">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <span className="max-w-36 truncate text-sm text-slate-300">{name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <section className="px-5 py-6 lg:px-8">{children}</section>
    </main>
  );
}
