import { DashboardClient } from "@/components/dashboard-client";
import { getUserOrRedirect } from "@/lib/auth";

export default async function DashboardPage() {
  const { user } = await getUserOrRedirect();
  const name =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  return <DashboardClient name={name} />;
}
