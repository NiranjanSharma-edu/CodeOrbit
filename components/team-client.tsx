"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Users, Wifi, WifiOff, ChevronDown, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

type Room = { id: string; name: string };

type Member = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: "owner" | "editor" | "viewer";
  joined_at: string;
};

type TeamClientProps = {
  currentUserId: string;
  currentUserName: string;
  rooms: Room[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roleConfig = {
  owner: {
    label: "Owner",
    color: "text-amber-300",
    border: "border-amber-400/30",
    bg: "bg-amber-400/10",
    glow: "shadow-[0_0_18px_rgba(251,191,36,0.12)]"
  },
  editor: {
    label: "Editor",
    color: "text-cyan-300",
    border: "border-cyan-400/30",
    bg: "bg-cyan-400/10",
    glow: "shadow-[0_0_18px_rgba(34,211,238,0.10)]"
  },
  viewer: {
    label: "Viewer",
    color: "text-slate-400",
    border: "border-slate-600/40",
    bg: "bg-slate-800/40",
    glow: ""
  }
} as const;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Deterministic colour for avatar gradient based on user id
const avatarGradients = [
  "from-fuchsia-500 to-cyan-400",
  "from-blue-500 to-violet-500",
  "from-emerald-400 to-cyan-400",
  "from-amber-400 to-orange-500",
  "from-rose-500 to-pink-400",
  "from-violet-500 to-fuchsia-400"
];
function gradientForId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return avatarGradients[Math.abs(h) % avatarGradients.length];
}

/**
 * Deduplicate an array of members by their `id`.
 * If two entries share the same id, the first one wins (matches DB order).
 * This is the safety net — the DB already enforces UNIQUE(room_id, user_id),
 * but rapid realtime events could produce two in-flight fetches that race.
 */
function deduplicateMembers(members: Member[]): Member[] {
  const map = new Map<string, Member>();
  for (const m of members) {
    if (!map.has(m.id)) map.set(m.id, m);
  }
  return Array.from(map.values());
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MemberSkeleton() {
  return (
    <div className="glass-panel flex items-center gap-4 rounded-xl border border-slate-800/60 p-5 animate-pulse">
      <div className="h-12 w-12 shrink-0 rounded-full bg-slate-800/80" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-slate-800/80" />
        <div className="h-3 w-20 rounded bg-slate-800/60" />
      </div>
      <div className="h-6 w-16 rounded-full bg-slate-800/60" />
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  isCurrentUser,
  isOnline,
  index
}: {
  member: Member;
  isCurrentUser: boolean;
  isOnline: boolean;
  index: number;
}) {
  const cfg = roleConfig[member.role];
  const gradient = gradientForId(member.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      layout
      className={`glass-panel group relative overflow-hidden rounded-xl border p-5 transition-all duration-300
        hover:-translate-y-1 ${cfg.border} ${cfg.glow}`}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), transparent 60%)" }}
      />

      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {member.avatar_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={member.avatar_url}
              alt={member.name}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-slate-700/60"
            />
          ) : (
            <div
              className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br ${gradient}
                text-sm font-black text-white ring-2 ring-slate-700/60`}
            >
              {getInitials(member.name)}
            </div>
          )}
          {/* Online / offline indicator */}
          <span
            title={isOnline ? "Online" : "Offline"}
            className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center
              rounded-full border-2 border-[#0B0F14] transition-colors duration-500
              ${isOnline ? "bg-emerald-400" : "bg-slate-600"}`}
          >
            {isOnline && (
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
          </span>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold text-slate-100">{member.name}</p>
            {member.role === "owner" && (
              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            )}
            {isCurrentUser && (
              <span
                className="shrink-0 rounded-full border border-indigo-400/40 bg-indigo-500/10
                px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-indigo-300"
              >
                You
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-500">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-600"}`}
            />
            {isOnline ? "Online" : "Offline"} · {cfg.label} · Joined {new Date(member.joined_at).toLocaleDateString()}
          </p>
        </div>

        {/* Role badge */}
        <span
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] uppercase
          tracking-[0.18em] font-semibold ${cfg.color} ${cfg.border} ${cfg.bg}`}
        >
          {cfg.label}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamClient({ currentUserId, currentUserName, rooms }: TeamClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id ?? "");
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Refs for channels and debounce timer
  const dbChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // ── Fetch members via API ────────────────────────────────────────────────
  const fetchMembers = useCallback(async (roomId: string) => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/team/${roomId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to load team.");
      }
      const body = (await res.json()) as { members: Member[] };
      // Deduplicate before setting state — safety net against race conditions
      setMembers(deduplicateMembers(body.members));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load team members.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Debounced refetch — Supabase can fire multiple postgres_changes events in
   * quick succession (e.g. upsert triggers both INSERT + UPDATE events).
   * Debouncing collapses them into a single API call.
   */
  const debouncedFetch = useCallback(
    (roomId: string) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => void fetchMembers(roomId), 250);
    },
    [fetchMembers]
  );

  // ── DB Changes subscription (room_members) ───────────────────────────────
  useEffect(() => {
    if (!selectedRoomId) return;

    // Clean up previous DB channel
    if (dbChannelRef.current) {
      void supabase.removeChannel(dbChannelRef.current);
      dbChannelRef.current = null;
      setConnected(false);
    }

    const channel = supabase
      .channel(`db:team:${selectedRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${selectedRoomId}`
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            // Handle DELETE optimistically: remove from local state immediately
            const deletedId = (payload.old as { user_id?: string }).user_id;
            if (deletedId) {
              setMembers((prev) => prev.filter((m) => m.id !== deletedId));
            }
          } else {
            // INSERT or UPDATE: debounce re-fetch
            debouncedFetch(selectedRoomId);
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    dbChannelRef.current = channel;

    // Initial fetch
    void fetchMembers(selectedRoomId);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      void supabase.removeChannel(channel);
      dbChannelRef.current = null;
      setConnected(false);
    };
  }, [selectedRoomId, supabase, fetchMembers, debouncedFetch]);

  // ── Presence subscription (online status) ───────────────────────────────
  useEffect(() => {
    if (!selectedRoomId) return;

    // Clean up previous presence channel
    if (presenceChannelRef.current) {
      void supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    // Watch the same channel key that room-client.tsx uses: `room:<roomId>`
    // This is READ-ONLY — we only listen; room-client.tsx owns the tracking.
    const presChannel = supabase
      .channel(`room:${selectedRoomId}`)
      .on("presence", { event: "sync" }, () => {
        const state = presChannel.presenceState<{ id?: string }>();
        // Build a Set of online user IDs using the same dedup logic as room-client
        const online = new Set<string>();
        for (const presences of Object.values(state)) {
          const latest = presences[presences.length - 1];
          if (latest?.id) online.add(latest.id);
        }
        setOnlineUserIds(online);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          for (const p of leftPresences) {
            const maybeId = (p as unknown as { id?: string }).id;
            if (maybeId) next.delete(maybeId);
          }
          return next;
        });
      })
      .subscribe();

    presenceChannelRef.current = presChannel;

    return () => {
      void supabase.removeChannel(presChannel);
      presenceChannelRef.current = null;
    };
  }, [selectedRoomId, supabase]);

  // ── Render ───────────────────────────────────────────────────────────────
  // Sort: owner first, then online editors, then offline
  const sortedMembers = useMemo(() => {
    const unique = deduplicateMembers(members); // final safety net
    return [...unique].sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      const aOnline = onlineUserIds.has(a.id) ? 0 : 1;
      const bOnline = onlineUserIds.has(b.id) ? 0 : 1;
      return aOnline - bOnline;
    });
  }, [members, onlineUserIds]);

  return (
    <div className="space-y-6">
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 shadow-[0_0_24px_rgba(217,70,239,0.25)]">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-100">
              {selectedRoom ? selectedRoom.name : "Select a Room"}
            </h2>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {sortedMembers.length} member{sortedMembers.length !== 1 ? "s" : ""}
              {onlineUserIds.size > 0 && (
                <span className="ml-2 text-emerald-400">· {onlineUserIds.size} online</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Realtime indicator */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
              connected
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-slate-700/60 bg-slate-950/40 text-slate-500"
            }`}
          >
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? "Live" : "Connecting…"}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => void fetchMembers(selectedRoomId)}
            disabled={loading || !selectedRoomId}
            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700/60 bg-slate-950/40
              text-slate-400 transition-all hover:border-slate-600 hover:text-slate-200 disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Room selector ──────────────────────────────────────────────── */}
      {rooms.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            id="room-selector"
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700/60
              bg-slate-950/50 px-4 py-3 text-left text-sm text-slate-200 transition-all
              hover:border-slate-600 focus:outline-none"
          >
            <span className="truncate font-medium">
              {selectedRoom ? selectedRoom.name : "Select a room"}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-700/60
                  bg-[#0D1117] shadow-2xl"
              >
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-slate-800/60
                      ${room.id === selectedRoomId ? "bg-slate-800/40 text-slate-100" : "text-slate-300"}`}
                  >
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" />
                    {room.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-dashed border-slate-700/60 p-8 text-center">
          <p className="text-sm text-slate-400">No rooms yet. Create a room to see team members.</p>
        </div>
      )}

      {/* ── Member list ────────────────────────────────────────────────── */}
      {selectedRoomId && (
        <div className="space-y-3">
          {/* Loading skeletons */}
          {loading && members.length === 0 && (
            <>
              <MemberSkeleton />
              <MemberSkeleton />
              <MemberSkeleton />
            </>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && sortedMembers.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-xl border border-dashed border-slate-700/60 p-10 text-center"
            >
              <Users className="mx-auto mb-3 h-10 w-10 text-slate-600" />
              <p className="text-base font-semibold text-slate-400">No members yet</p>
              <p className="mt-1 text-sm text-slate-600">
                Join the room from the editor to appear here.
              </p>
            </motion.div>
          )}

          {/* Member cards — keyed by stable user id, guaranteed unique */}
          <AnimatePresence mode="popLayout">
            {sortedMembers.map((member, index) => (
              <MemberCard
                key={member.id}
                member={member}
                isCurrentUser={member.id === currentUserId}
                isOnline={onlineUserIds.has(member.id)}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {sortedMembers.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-slate-600"
        >
          Viewing as <span className="text-slate-400">{currentUserName}</span>
          {" · "}Real-time via Supabase Presence + Postgres Changes
        </motion.p>
      )}
    </div>
  );
}
