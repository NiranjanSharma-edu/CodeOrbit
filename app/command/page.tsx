import { AppShell } from "@/components/app-shell";
import { CommandClient } from "@/components/command-client";
import { getUserOrRedirect } from "@/lib/auth";
import { githubFetch } from "@/lib/github";

export default async function CommandPage() {
  const { user } = await getUserOrRedirect();
  const name =
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    user.email ??
    "Developer";

  let repos: { full_name: string; private: boolean; updated_at?: string; name?: string }[] = [];
  let errorMessage: string | null = null;

  try {
    const data = await githubFetch("/user/repos?per_page=100&sort=updated");
    repos = data.map((repo: { full_name: string; private: boolean; updated_at?: string; name?: string }) => ({
      full_name: repo.full_name,
      private: repo.private,
      updated_at: repo.updated_at,
      name: repo.name
    }));
  } catch (error) {
    repos = [];
    errorMessage = error instanceof Error ? error.message : "GitHub access is not available.";
  }

  return (
    <AppShell name={name} title="Command" subtitle="GitHub repository command">
      <CommandClient repos={repos} error={errorMessage} />
    </AppShell>
  );
}
