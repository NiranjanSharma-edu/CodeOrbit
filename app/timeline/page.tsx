import { AppShell } from "@/components/app-shell";
import { getUserOrRedirect } from "@/lib/auth";

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  created_at: string;
};

export default async function TimelinePage() {
  const { supabase, user } = await getUserOrRedirect();
  const name =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id,name,created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: messages } = await supabase
    .from("messages")
    .select("id,content,created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const events: TimelineEvent[] = [
    ...(rooms ?? []).map((room) => ({
      id: `room-${room.id}`,
      label: "Room created",
      detail: room.name,
      created_at: room.created_at
    })),
    ...(messages ?? []).map((message) => ({
      id: `message-${message.id}`,
      label: "New message",
      detail: message.content.slice(0, 64),
      created_at: message.created_at
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <AppShell name={name} title="Timeline" subtitle="Activity feed">
      <div className="glass-panel rounded-xl border border-slate-800/60 p-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Recent activity</h2>
        <div className="mt-6 space-y-6">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700/70 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
              No activity yet.
            </div>
          ) : null}
          {events.map((event) => (
            <div key={event.id} className="relative pl-8">
              <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.6)]" />
              <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{event.label}</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">{event.detail}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
