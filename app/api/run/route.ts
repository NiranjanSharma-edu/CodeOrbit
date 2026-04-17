import { NextResponse } from "next/server";
import { runCodeSchema } from "@/lib/validators";

const languageMap: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  cpp: 54,
  c: 50,
  java: 62
};

export async function POST(request: Request) {
  const parsed = runCodeSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid execution request." }, { status: 400 });
  }

  const apiUrl = process.env.JUDGE0_API_URL;
  const apiKey = process.env.JUDGE0_API_KEY;
  const apiHost = process.env.JUDGE0_API_HOST;

  if (!apiUrl) {
    return NextResponse.json({ error: "JUDGE0_API_URL is not configured." }, { status: 500 });
  }

  const languageKey = parsed.data.language.toLowerCase();
  const languageId = languageMap[languageKey];

  if (!languageId) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey && apiHost) {
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const submission = await fetch(`${apiUrl}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_code: parsed.data.code,
        language_id: languageId,
        stdin: parsed.data.stdin
      })
    });

    const result = await submission.json().catch(() => ({ error: "Judge0 returned a non-JSON response." }));
    if (!submission.ok) {
      console.error("[CodeOrbit] Judge0 error", result);
    }
    return NextResponse.json(result, { status: submission.ok ? 200 : submission.status });
  } catch (error) {
    console.error("[CodeOrbit] Judge0 request failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Judge0 request failed." },
      { status: 502 }
    );
  }
}
