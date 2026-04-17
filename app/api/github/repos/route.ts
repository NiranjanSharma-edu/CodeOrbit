import { NextResponse } from "next/server";
import { GitHubError, githubFetch } from "@/lib/github";

export async function GET() {
  try {
    const repos = await githubFetch("/user/repos?per_page=100&sort=updated");
    return NextResponse.json({
      repos: repos.map(
        (repo: { full_name: string; default_branch: string; private: boolean; updated_at?: string; name?: string }) => ({
          full_name: repo.full_name,
          default_branch: repo.default_branch,
          private: repo.private,
          updated_at: repo.updated_at,
          name: repo.name
        })
      )
    });
  } catch (error) {
    const status = error instanceof GitHubError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub error" }, { status });
  }
}
