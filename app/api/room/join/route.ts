import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { joinRoomServer } from "@/lib/services/join-room";

/**
 * POST /api/room/join
 * Body: { room_id: string }
 *
 * Called from room-client.tsx on WebSocket SUBSCRIBED to handle reconnects.
 * The primary join (on first page load) is done in app/room/[id]/page.tsx
 * via joinRoomServer(). This endpoint is a secondary / reconnect path.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { room_id } = body as { room_id?: string };
  if (!room_id || typeof room_id !== "string") {
    return NextResponse.json({ error: "room_id is required" }, { status: 400 });
  }

  // ── Fetch room ──────────────────────────────────────────────────────────
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, created_by")
    .eq("id", room_id)
    .single();

  if (roomError || !room) {
    console.error("[CodeOrbit] /api/room/join – room not found", roomError);
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // ── Resolve display name ────────────────────────────────────────────────
  const name: string =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  const avatar_url: string | null = user.user_metadata?.avatar_url ?? null;

  // ── Join (profile upsert → room_members upsert) ─────────────────────────
  const result = await joinRoomServer(
    supabase,
    user.id,
    { name, avatar_url },
    room_id,
    room.created_by ?? null
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role: result.role });
}
