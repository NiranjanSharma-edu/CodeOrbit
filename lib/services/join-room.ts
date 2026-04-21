import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * Upsert profile + room_members in a single server-side call.
 *
 * Must run server-side (never from the client) so that:
 *   1. Auth cookies are available for getUser()
 *   2. Profile is created BEFORE room_members (satisfies FK)
 *   3. Errors surface in Next.js server logs, not silently dropped
 *
 * Safe to call on every page load — upsert is idempotent.
 */
export async function joinRoomServer(
  supabase: SupabaseClient,
  userId: string,
  userMeta: { name: string; avatar_url: string | null },
  roomId: string,
  createdBy: string | null
): Promise<{ role: "owner" | "editor"; error?: string }> {
  // ── 1. Upsert profile (FK guard) ──────────────────────────────────────
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        name: userMeta.name,
        avatar_url: userMeta.avatar_url,
        updated_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

  if (profileError) {
    console.error("[CodeOrbit] joinRoomServer – profile upsert failed", {
      code: profileError.code,
      message: profileError.message,
      hint: profileError.hint
    });
    return { role: "editor", error: profileError.message };
  }

  // ── 2. Upsert room_members ────────────────────────────────────────────
  const role: "owner" | "editor" = createdBy === userId ? "owner" : "editor";

  const { error: memberError } = await supabase
    .from("room_members")
    .upsert(
      { room_id: roomId, user_id: userId, role },
      { onConflict: "room_id,user_id" }
    );

  if (memberError) {
    console.error("[CodeOrbit] joinRoomServer – room_member upsert failed", {
      code: memberError.code,
      message: memberError.message,
      hint: memberError.hint
    });
    return { role, error: memberError.message };
  }

  console.info(`[CodeOrbit] joinRoomServer – ${userId} joined room ${roomId} as ${role}`);
  return { role };
}
