import { notFound } from "next/navigation";
import { RoomClient } from "@/components/editor/room-client";
import { getUserOrRedirect } from "@/lib/auth";
import { languageByMonaco } from "@/lib/languages";
import { roomIdSchema } from "@/lib/validators";
import { joinRoomServer } from "@/lib/services/join-room";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = roomIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const { supabase, user } = await getUserOrRedirect();

  // ── Fetch room ──────────────────────────────────────────────────────────
  const { data: room } = await supabase
    .from("rooms")
    .select("id,name,language,created_at,created_by")
    .eq("id", id)
    .single();

  if (!room) {
    notFound();
  }

  // ── Resolve display name + avatar ───────────────────────────────────────
  const name: string =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  const avatar_url: string | null = user.user_metadata?.avatar_url ?? null;

  // ── Join room (server-side, synchronous, guaranteed to run) ─────────────
  // This upserts the profile row first (FK guard) then room_members.
  // Running it here means the Team page will always see at least the current
  // user, regardless of whether the WebSocket SUBSCRIBED event fires.
  await joinRoomServer(supabase, user.id, { name, avatar_url }, room.id, room.created_by ?? null);

  // ── Fetch latest code snapshot ──────────────────────────────────────────
  const { data: snapshot } = await supabase
    .from("code_snapshots")
    .select("code")
    .eq("room_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const roomWithCode = {
    ...room,
    code: snapshot?.code ?? languageByMonaco(room.language).starter
  };

  return (
    <RoomClient
      room={roomWithCode}
      user={{
        id: user.id,
        email: user.email ?? "",
        name,
        avatar: avatar_url ?? ""
      }}
    />
  );
}
