import type { SupabaseClient } from "@supabase/supabase-js";
import { roomIdSchema } from "@/lib/validators";

export type DashboardRoom = {
  id: string;
  name: string;
  language: string;
  created_at: string;
  updated_at?: string | null;
};

function describeSupabaseError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const details = error as { message?: string; details?: string; hint?: string; code?: string };
    return [details.message, details.details, details.hint, details.code ? `Code: ${details.code}` : ""]
      .filter(Boolean)
      .join(" ");
  }
  return "Unknown Supabase error.";
}

function logAndThrow(context: string, error: unknown): never {
  console.error(`[CodeOrbit] ${context}`, error);
  throw new Error(`${context}: ${describeSupabaseError(error)}`);
}

export async function listRooms(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("rooms")
    .select("id,name,language,created_at")
    .order("created_at", { ascending: false });

  if (error) logAndThrow("Could not fetch rooms", error);
  return (data ?? []) as DashboardRoom[];
}

export async function createRoom(supabase: SupabaseClient, input: { name: string; language: string }) {
  const roomName = input.name.trim();
  if (roomName.length < 2) {
    throw new Error("Room name must be at least 2 characters.");
  }

  const language = input.language.trim();
  if (!language) {
    throw new Error("Choose a language before creating a room.");
  }

  const roomId = crypto.randomUUID();
  const roomInsert = {
    id: roomId,
    name: roomName,
    language
  };

  console.info("[CodeOrbit] Creating room", roomInsert);
  const { error } = await supabase.from("rooms").insert(roomInsert);

  if (error) logAndThrow("Could not create room", error);
  return roomId;
}

export async function getRoomForJoin(supabase: SupabaseClient, roomId: string) {
  const parsed = roomIdSchema.safeParse(roomId.trim());
  if (!parsed.success) {
    throw new Error("Enter a valid room UUID.");
  }

  const { data, error } = await supabase.from("rooms").select("id").eq("id", parsed.data).single();
  if (error || !data) {
    if (error) console.error("[CodeOrbit] Could not validate room", error);
    throw new Error(error ? `Room not found: ${describeSupabaseError(error)}` : "Room not found.");
  }

  return data.id as string;
}
