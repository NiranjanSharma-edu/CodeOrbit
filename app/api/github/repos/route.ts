import { NextResponse } from "next/server";
import { GitHubError, githubFetch } from "@/lib/github";

/**
 * GET /api/github/repos
 *
 * Fetches the authenticated user's GitHub repositories server-side.
 * The GitHub access token is read from the session cookie (provider_token),
 * never exposed to the browser.
 *
 * Returns 401 when the token is missing (user must re-authenticate with GitHub).
 * Returns 200 with { repos: [...] } on success.
 */
export async function GET() {
  try {
    const repos = await githubFetch("/user/repos?per_page=100&sort=updated");
    return NextResponse.json({
      repos: (repos as {
        full_name: string;
        default_branch: string;
        private: boolean;
        updated_at?: string;
        name?: string;
      }[]).map((repo) => ({
        full_name: repo.full_name,
        default_branch: repo.default_branch,
        private: repo.private,
        updated_at: repo.updated_at,
        name: repo.name
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Connect GitHub again")) {
      // Token missing — tell the client to re-authenticate
      return NextResponse.json(
        { error: "GitHub access token missing. Sign in with GitHub to grant repository access." },
        { status: 401 }
      );
    }
    const status = error instanceof GitHubError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GitHub error" },
      { status }
    );
  }
}
