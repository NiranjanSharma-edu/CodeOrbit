import { AppShell } from "@/components/app-shell";
import { getUserOrRedirect } from "@/lib/auth";

const members = [
  { name: "Navigator", role: "Lead" },
  { name: "Flux", role: "Engineer" },
  { name: "Nova", role: "Designer" },
  { name: "Orbit", role: "QA" }
];

export default async function TeamPage() {
  const { user } = await getUserOrRedirect();
  const name =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  return (
    <AppShell name={name} title="Team" subtitle="Crew alignment">
      <div className="grid gap-4 lg:grid-cols-2">
        {members.map((member) => (
          <div
            key={member.name}
            className="glass-panel rounded-xl border border-slate-800/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-300/30"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-sm font-black text-white">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-100">{member.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{member.role}</p>
              </div>
              <span className="ml-auto rounded-full border border-slate-700/60 bg-slate-950/50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Active
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
