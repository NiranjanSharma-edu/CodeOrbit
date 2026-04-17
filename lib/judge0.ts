/**
 * Judge0 CE Execution Service
 *
 * Handles all communication with the Judge0 Community Edition API.
 * Implements a submit → poll pattern to support compiled languages
 * that may take several seconds to execute.
 *
 * Judge0 CE docs: https://ce.judge0.com/
 */

export type Judge0Status = {
  id: number;
  description: string;
};

export type Judge0Result = {
  token: string;
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  status: Judge0Status;
  time: string | null;
  memory: number | null;
  exit_code: number | null;
};

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  compileOutput: string;
  statusId: number;
  statusDescription: string;
  time: string | null;
  memory: number | null;
  exitCode: number | null;
  isSuccess: boolean;
  isCompileError: boolean;
  isRuntimeError: boolean;
  isTLE: boolean;
};

/** Judge0 CE status IDs */
const STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14,
} as const;

const POLL_INTERVAL_MS = 900;
const MAX_POLLS = 15; // 15 × 900ms = ~13.5s max wait

function getJudge0Config(): { url: string; headers: Record<string, string> } {
  const url = process.env.JUDGE0_API_URL ?? "https://ce.judge0.com";
  const apiKey = process.env.JUDGE0_API_KEY;
  const apiHost = process.env.JUDGE0_API_HOST;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };

  if (apiKey && apiHost) {
    // RapidAPI hosted Judge0
    headers["X-RapidAPI-Key"] = apiKey;
    headers["X-RapidAPI-Host"] = apiHost;
  } else if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  // No auth header for ce.judge0.com (free, no key required)

  return { url: url.replace(/\/$/, ""), headers };
}

/**
 * Submit code to Judge0 and return the submission token.
 */
async function submitCode(
  code: string,
  languageId: number,
  stdin: string
): Promise<string> {
  const { url, headers } = getJudge0Config();

  const body = JSON.stringify({
    source_code: code,
    language_id: languageId,
    stdin: stdin || "",
    // Reasonable resource limits
    cpu_time_limit: 10,         // seconds
    cpu_extra_time: 1,
    wall_time_limit: 12,
    memory_limit: 256000,       // KB (256 MB)
    stack_limit: 64000,         // KB (64 MB)
    max_file_size: 1024,        // KB
  });

  const response = await fetch(`${url}/submissions?base64_encoded=false`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Judge0 submission failed (HTTP ${response.status}): ${text.slice(0, 200)}`
    );
  }

  const data = (await response.json()) as { token?: string; error?: string };
  if (!data.token) {
    throw new Error(
      data.error ?? "Judge0 did not return a submission token."
    );
  }

  return data.token;
}

/**
 * Poll a submission by token until it finishes (or we time out).
 */
async function pollSubmission(token: string): Promise<Judge0Result> {
  const { url, headers } = getJudge0Config();
  const fields =
    "token,stdout,stderr,compile_output,message,status,time,memory,exit_code";

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    // Wait before each poll (first poll also waits a bit for fast interpreteds)
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await fetch(
      `${url}/submissions/${token}?base64_encoded=false&fields=${fields}`,
      { method: "GET", headers }
    );

    if (!response.ok) {
      throw new Error(
        `Judge0 poll failed (HTTP ${response.status}) on attempt ${attempt + 1}`
      );
    }

    const result = (await response.json()) as Judge0Result;
    const statusId = result.status?.id ?? 0;

    // Still in queue or processing — keep polling
    if (statusId === STATUS.IN_QUEUE || statusId === STATUS.PROCESSING) {
      continue;
    }

    // Terminal state
    return result;
  }

  throw new Error(
    `Execution timed out after ${((MAX_POLLS * POLL_INTERVAL_MS) / 1000).toFixed(1)}s. ` +
      `The program may be in an infinite loop or taking too long.`
  );
}

/**
 * Main entry point: submit code and poll until completion.
 * Returns a normalized ExecutionResult.
 */
export async function executeCode(
  code: string,
  languageId: number,
  stdin: string
): Promise<ExecutionResult> {
  const token = await submitCode(code, languageId, stdin);
  const raw = await pollSubmission(token);

  const statusId = raw.status?.id ?? 0;
  const statusDescription = raw.status?.description ?? "Unknown";

  const stdout = raw.stdout ?? "";
  const stderr = raw.stderr ?? "";
  const compileOutput = raw.compile_output ?? "";

  return {
    stdout,
    stderr,
    compileOutput,
    statusId,
    statusDescription,
    time: raw.time,
    memory: raw.memory,
    exitCode: raw.exit_code,
    isSuccess: statusId === STATUS.ACCEPTED,
    isCompileError: statusId === STATUS.COMPILATION_ERROR,
    isRuntimeError: statusId >= STATUS.RUNTIME_ERROR_SIGSEGV && statusId <= STATUS.RUNTIME_ERROR_OTHER,
    isTLE: statusId === STATUS.TIME_LIMIT_EXCEEDED,
  };
}
