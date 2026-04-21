import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const supabase = await createClient();

  // ── Auth ────────────────────────────────────────────────────────────────
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roomId || typeof roomId !== "string") {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  // ── Confirm room exists ─────────────────────────────────────────────────
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, created_by")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    console.error("[CodeOrbit] team GET – room not found", { roomId, roomError });
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // ── Fetch room_members joined with profiles ─────────────────────────────
  const { data: members, error } = await supabase
    .from("room_members")
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (
        id,
        name,
        avatar_url
      )
    `)
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[CodeOrbit] team GET – query error", {
      code: error.code,
      message: error.message,
      hint: error.hint
    });
    return NextResponse.json(
      { error: error.message, hint: error.hint ?? null, code: error.code ?? null },
      { status: 500 }
    );
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────
  console.info(`[CodeOrbit] team GET – room ${roomId} has ${(members ?? []).length} member(s)`);

  if ((members ?? []).length === 0) {
    console.warn(
      "[CodeOrbit] team GET – room_members is empty. " +
      "Checklist: (1) SQL migration run in Supabase? " +
      "(2) User visited /room/<id> page to trigger server-side join?"
    );
  }

  // ── Map response (with fallback when profiles join is null) ────────────
  const mapped = (members ?? []).map((m) => {
    // Supabase returns the FK join as either an object or array depending on
    // PostgREST version. Normalise both shapes.
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.user_id,
      // Fallback chain: profile name → user_id shortened (never blank)
      name: profile?.name ?? `User ${m.user_id.slice(0, 6)}`,
      avatar_url: profile?.avatar_url ?? null,
      role: m.role as "owner" | "editor" | "viewer",
      joined_at: m.joined_at
    };
  });

  return NextResponse.json({ members: mapped, roomName: room.name });
}
