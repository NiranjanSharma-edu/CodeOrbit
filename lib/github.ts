import { createClient } from "@/lib/supabase/server";

export class GitHubError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getGithubToken() {
  const supabase = await createClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    throw new Error("Connect GitHub again with repository access.");
  }

  return session.provider_token;
}

export async function githubFetch(path: string, init: RequestInit = {}) {
  const token = await getGithubToken();
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new GitHubError(error.message ?? "GitHub request failed.", response.status);
  }

  return response.json();
}
