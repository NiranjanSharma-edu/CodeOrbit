import { AppShell } from "@/components/app-shell";
import { getUserOrRedirect } from "@/lib/auth";
import { TeamClient } from "@/components/team-client";

export default async function TeamPage() {
  const { supabase, user } = await getUserOrRedirect();

  const name =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  // Fetch all rooms for the selector (same query used in Rooms page)
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id,name")
    .order("created_at", { ascending: false });

  return (
    <AppShell name={name} title="Team" subtitle="Crew alignment">
      <TeamClient
        currentUserId={user.id}
        currentUserName={name}
        rooms={rooms ?? []}
      />
    </AppShell>
  );
}
