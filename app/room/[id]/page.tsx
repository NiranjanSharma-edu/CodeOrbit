import { notFound } from "next/navigation";
import { RoomClient } from "@/components/editor/room-client";
import { getUserOrRedirect } from "@/lib/auth";
import { languageByMonaco } from "@/lib/languages";
import { roomIdSchema } from "@/lib/validators";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = roomIdSchema.safeParse(id);
  if (!parsed.success) {
    notFound();
  }

  const { supabase, user } = await getUserOrRedirect();
  const { data: room } = await supabase
    .from("rooms")
    .select("id,name,language,created_at")
    .eq("id", id)
    .single();

  if (!room) {
    notFound();
  }

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
        name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.user_metadata?.user_name ?? "Developer",
        avatar: user.user_metadata?.avatar_url ?? ""
      }}
    />
  );
}
