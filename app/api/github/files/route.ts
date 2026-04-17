import { NextResponse } from "next/server";
import { GitHubError, githubFetch } from "@/lib/github";
import { githubFileSchema, githubTreeSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  if (mode === "tree") {
    const parsed = githubTreeSchema.safeParse({
      owner: url.searchParams.get("owner"),
      repo: url.searchParams.get("repo"),
      branch: url.searchParams.get("branch") ?? "main",
      recursive: url.searchParams.get("recursive") !== "false"
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid GitHub tree request." }, { status: 400 });
    }

    try {
      const { owner, repo, branch, recursive } = parsed.data;
      const data = await githubFetch(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=${recursive ? 1 : 0}`);
      return NextResponse.json({
        tree: data.tree ?? [],
        sha: data.sha,
        truncated: data.truncated ?? false
      });
    } catch (error) {
      const status = error instanceof GitHubError ? error.status : 500;
      return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub error" }, { status });
    }
  }

  const parsed = githubFileSchema.safeParse({
    owner: url.searchParams.get("owner"),
    repo: url.searchParams.get("repo"),
    path: url.searchParams.get("path"),
    branch: url.searchParams.get("branch") ?? "main"
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid GitHub file request." }, { status: 400 });
  }

  try {
    const { owner, repo, path, branch } = parsed.data;
    const data = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${branch}`);
    const content = Buffer.from(data.content, "base64").toString("utf8");
    return NextResponse.json({ content, sha: data.sha, path: data.path });
  } catch (error) {
    const status = error instanceof GitHubError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub error" }, { status });
  }
}
