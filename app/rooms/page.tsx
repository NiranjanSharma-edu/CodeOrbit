import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getUserOrRedirect } from "@/lib/auth";

export default async function RoomsPage() {
  const { supabase, user } = await getUserOrRedirect();
  const name =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id,name,language,created_at")
    .order("created_at", { ascending: false });

  return (
    <AppShell name={name} title="Rooms" subtitle="Active collaboration spaces">
      <div className="glass-panel rounded-xl border border-slate-800/60 p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">All rooms</h2>
        <div className="mt-4 grid gap-3">
          {(rooms ?? []).map((room) => (
            <div
              key={room.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-950/40 p-4"
            >
              <div>
                <p className="text-lg font-semibold text-slate-100">{room.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {room.language} · {new Date(room.created_at).toLocaleString()}
                </p>
              </div>
              <Link
                href={`/room/${room.id}`}
                className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-200 transition hover:bg-cyan-500/20"
              >
                Join
              </Link>
            </div>
          ))}
          {(rooms ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700/70 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
              No rooms found yet.
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
