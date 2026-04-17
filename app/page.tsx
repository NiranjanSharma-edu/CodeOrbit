import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthPanel } from "@/components/auth-panel";
import { OrbitBackground } from "@/components/orbit-background";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0F14] text-slate-100">
      <OrbitBackground />
      <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-8">
          <p className="w-fit rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200 shadow-[0_0_32px_rgba(34,211,238,0.15)]">
            CodeOrbit
          </p>
          <div className="space-y-4">
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
              Ship code from a shared command deck.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-400">
              Pair across JavaScript, Python, C++, Java, and live repository files with realtime edits,
              execution, chat, snapshots, and secure Supabase sessions.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            {["Realtime rooms", "Judge0 execution", "GitHub commits"].map((item) => (
              <div key={item} className="glass-panel rounded-md px-4 py-3 transition-transform duration-300 hover:-translate-y-1">
                <span className="mb-2 block h-1 w-10 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" />
                {item}
              </div>
            ))}
          </div>
          <div className="orbit-float glass-panel glow-border max-w-3xl rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-700/60 pb-3">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-300" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <p className="ml-2 text-xs uppercase tracking-[0.22em] text-slate-500">orbit/main.ts</p>
            </div>
            <pre className="overflow-hidden text-sm leading-7 text-slate-300">
              <code>{`const room = await CodeOrbit.launch({
  language: "typescript",
  mode: "collaborative",
  deploy: "vercel"
});`}</code>
            </pre>
          </div>
        </div>
        <AuthPanel />
      </section>
    </main>
  );
}
