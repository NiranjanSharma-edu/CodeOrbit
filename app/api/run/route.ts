import { NextResponse } from "next/server";
import { runCodeSchema } from "@/lib/validators";
import { languageByMonaco } from "@/lib/languages";
import { executeCode } from "@/lib/judge0";

export const runtime = "nodejs";
export const maxDuration = 30; // seconds — Vercel hobby allows up to 60s

// ---------------------------------------------------------------------------
// In-memory rate limiter (per IP, resets every minute)
// ---------------------------------------------------------------------------
type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_MAX = Number(process.env.JUDGE0_RATE_LIMIT ?? "20");
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetAt - now };
}

// Prune stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) rateLimitStore.delete(ip);
  }
}, 5 * 60_000);

// ---------------------------------------------------------------------------
// POST /api/run
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  // 1. Rate limiting
  const ip = getClientIp(request);
  const rl = checkRateLimit(ip);

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)} seconds.`,
        retryAfter: Math.ceil(rl.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.resetIn / 1000)),
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 2. Input validation
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = runCodeSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: messages }, { status: 400 });
  }

  const { language, code, stdin } = parsed.data;

  // 3. Resolve language ID
  const langMeta = languageByMonaco(language);
  if (!langMeta) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }

  // 4. Judge0 config check
  if (!process.env.JUDGE0_API_URL) {
    console.error("[CodeOrbit] JUDGE0_API_URL is not set");
    return NextResponse.json(
      { error: "Code execution service is not configured. Contact the admin." },
      { status: 500 }
    );
  }

  // 5. Execute via Judge0 (submit → poll)
  try {
    const result = await executeCode(code, langMeta.id, stdin);

    return NextResponse.json(
      {
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compileOutput,
        status: {
          id: result.statusId,
          description: result.statusDescription,
        },
        time: result.time,
        memory: result.memory,
        exit_code: result.exitCode,
        // Convenience booleans for the client
        is_success: result.isSuccess,
        is_compile_error: result.isCompileError,
        is_runtime_error: result.isRuntimeError,
        is_tle: result.isTLE,
        // Language metadata echoed back
        language: {
          monaco: language,
          label: langMeta.label,
          compiled: langMeta.compiled,
        },
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": String(rl.remaining),
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed.";
    console.error("[CodeOrbit] Execution failed", { language, ip, error });

    // Distinguish timeout vs other errors
    if (message.includes("timed out")) {
      return NextResponse.json(
        {
          error: message,
          stdout: "",
          stderr: "",
          compile_output: "",
          status: { id: 5, description: "Time Limit Exceeded" },
          is_tle: true,
        },
        { status: 200 } // Return 200 so client can display it as execution output
      );
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
