"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, LogOut, Plus, Users } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { languages } from "@/lib/languages";
import { OrbitBackground } from "@/components/orbit-background";
import { useRooms } from "@/hooks/use-rooms";
import { useToast } from "@/components/ui/toast";

export function DashboardClient({ name }: { name: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { rooms, isLoading, createRoom: createRoomRecord, getRoomForJoin } = useRooms();
  const { toast } = useToast();
  const [roomName, setRoomName] = useState("Untitled Orbit");
  const [joinId, setJoinId] = useState("");
  const [language, setLanguage] = useState(languages[0].monaco);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  async function createRoom() {
    if (loading) return;
    setLoading(true);
    try {
      const roomId = await createRoomRecord({ name: roomName, language });
      console.info("[CodeOrbit] Room created", { roomId });
      toast({ title: "Room created", description: "Redirecting to your coding room.", variant: "success" });
      window.location.assign(`/room/${roomId}`);
    } catch (error) {
      console.error("[CodeOrbit] Create room failed", error);
      toast({
        title: "Could not create room",
        description: error instanceof Error ? error.message : "Check your Supabase configuration.",
        variant: "error"
      });
    } finally {
      setLoading(false);
    }
  }

  async function joinRoom() {
    if (joining) return;
    setJoining(true);
    try {
      const roomId = await getRoomForJoin(joinId);
      toast({ title: "Room found", description: "Joining the room now.", variant: "success" });
      window.location.assign(`/room/${roomId}`);
    } catch (error) {
      console.error("[CodeOrbit] Join room failed", error);
      toast({
        title: "Could not join room",
        description: error instanceof Error ? error.message : "Enter a valid room id.",
        variant: "error"
      });
    } finally {
      setJoining(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <OrbitBackground />
      <header className="sticky top-0 z-20 border-b border-slate-800/70 bg-[#0B0F14]/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Mission control</p>
            <h1 className="text-2xl font-black tracking-tight">Welcome back, {name}</h1>
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

      <section className="grid gap-5 px-5 py-6 lg:grid-cols-3 lg:px-8">
        {[
          { label: "Active rooms", value: rooms.length, tone: "from-blue-500 to-cyan-300" },
          { label: "Primary language", value: languageByLabel(language), tone: "from-violet-500 to-fuchsia-400" },
          { label: "Realtime status", value: "Online", tone: "from-emerald-400 to-cyan-300" }
        ].map((metric) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card className="glow-border group overflow-hidden border border-slate-800/70 bg-slate-950/40 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/40">
              <CardContent className="relative p-6">
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: "linear-gradient(120deg, rgba(59,130,246,0.18), transparent 55%)" }}
                />
                <div className={`mb-5 h-1.5 w-24 rounded-full bg-gradient-to-r ${metric.tone}`} />
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-black text-slate-100">{metric.value}</p>
                <p className="mt-2 text-xs text-slate-500">Synced with realtime telemetry</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-5 px-5 pb-8 lg:grid-cols-[420px_1fr] lg:px-8">
        <div className="space-y-5">
          <Card className="glow-border overflow-hidden border border-slate-800/70 bg-slate-950/40">
            <CardHeader>
              <CardTitle>Create a room</CardTitle>
              <p className="text-sm text-slate-400">Launch a collaborative editor with autosave and execution.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={roomName} onChange={(event) => setRoomName(event.target.value)} />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="h-11 w-full rounded-md border border-slate-700/70 bg-slate-950/50 px-3 text-sm text-slate-100 outline-none transition-all focus:border-blue-400/70 focus:shadow-[0_0_24px_rgba(59,130,246,0.14)]"
              >
                {languages.map((item) => (
                  <option key={item.monaco} value={item.monaco}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Button className="w-full" onClick={createRoom} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" /> {loading ? "Creating..." : "Create room"}
              </Button>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border border-slate-800/70 bg-slate-950/40">
            <CardHeader>
              <CardTitle>Join room</CardTitle>
              <p className="text-sm text-slate-400">Paste a room UUID to dock with another session.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={joinId} onChange={(event) => setJoinId(event.target.value)} placeholder="Room UUID" />
              <Button className="w-full" variant="secondary" onClick={joinRoom} disabled={joining}>
                {joining ? "Joining..." : "Join"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border border-slate-800/70 bg-slate-950/40">
          <CardHeader>
            <CardTitle>Recent coding rooms</CardTitle>
            <p className="text-sm text-slate-400">Resume active collaboration spaces.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="shimmer h-[74px] rounded-md border border-slate-700/60 bg-slate-950/45" />
                ))
              ) : null}
              {!isLoading && rooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <Link
                    href={`/room/${room.id}`}
                    className="group flex items-center justify-between rounded-md border border-slate-700/60 bg-slate-950/35 p-4 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-blue-400/50 hover:bg-blue-500/10 hover:shadow-[0_0_34px_rgba(59,130,246,0.16)]"
                  >
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-slate-100">{room.name}</h2>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {room.language} · {new Date(room.updated_at ?? room.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-900 text-slate-400 transition-colors group-hover:bg-blue-500/20 group-hover:text-blue-200">
                      <Users className="h-5 w-5" />
                    </div>
                  </Link>
                </motion.div>
              ))}
              {!isLoading && rooms.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-700/70 bg-slate-950/30 p-8 text-center text-sm text-slate-400">
                  No rooms yet. Create your first orbit.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function languageByLabel(monaco: string) {
  return languages.find((item) => item.monaco === monaco)?.label ?? "JavaScript";
}
