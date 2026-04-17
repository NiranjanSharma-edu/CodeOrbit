import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(20_000)
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
  room: z
    .object({
      language: z.string().max(40).optional(),
      code: z.string().max(60_000).optional()
    })
    .optional()
});

export async function POST(request: Request) {
  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat request." }, { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 500 });
  }

  const model = (process.env.GROQ_MODEL ?? "mixtral-8x7b").trim();
  if (!model || model.includes(" ")) {
    return NextResponse.json({ error: "GROQ_MODEL is invalid." }, { status: 500 });
  }

  const roomContext = parsed.data.room
    ? [
        `Current language: ${parsed.data.room.language ?? "unknown"}.`,
        parsed.data.room.code ? `Current editor code:\n${parsed.data.room.code.slice(0, 60_000)}` : ""
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  const messages = [
    {
      role: "system",
      content:
        "You are CodeOrbit AI, a concise senior pair programmer inside a collaborative coding room. Help with debugging, architecture, refactoring, tests, and explanations. Prefer actionable answers and include code only when it helps."
    },
    ...(roomContext ? [{ role: "system" as const, content: roomContext }] : []),
    ...parsed.data.messages
  ];

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.35
      })
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text().catch(() => "");
      let errorMessage = "Groq request failed.";
      try {
        const parsedError = JSON.parse(errorBody) as { error?: { message?: string } };
        errorMessage = parsedError.error?.message ?? errorMessage;
      } catch {
        if (errorBody) errorMessage = errorBody;
      }
      console.error("[CodeOrbit] Groq error", response.status, errorMessage);
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    const responseBody = response.body;
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = responseBody.getReader();
          let buffer = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.replace("data:", "").trim();
              if (!payload || payload === "[DONE]") continue;

              try {
                const parsedChunk = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const token = parsedChunk.choices?.[0]?.delta?.content;
                if (token) {
                  controller.enqueue(encoder.encode(token));
                }
              } catch (parseError) {
                console.warn("[CodeOrbit] Groq stream parse error", parseError);
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error("[CodeOrbit] Groq stream failed", error);
          controller.error(error);
        }
      }
    });

    return new Response(responseStream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    console.error("[CodeOrbit] Groq request failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Groq request failed." },
      { status: 502 }
    );
  }
}
