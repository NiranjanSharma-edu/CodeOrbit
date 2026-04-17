import { NextResponse } from "next/server";
import { githubCommitSchema } from "@/lib/validators";
import { GitHubError, githubFetch } from "@/lib/github";

export async function POST(request: Request) {
  const parsed = githubCommitSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid commit request." }, { status: 400 });
  }

  try {
    const { owner, repo, path, branch, content, message, sha } = parsed.data;
    const result = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURI(path)}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        sha
      })
    });
    return NextResponse.json({ commit: result.commit, content: result.content });
  } catch (error) {
    const status = error instanceof GitHubError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "GitHub error" }, { status });
  }
}
