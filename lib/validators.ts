import { z } from "zod";
import { VALID_MONACO_IDS } from "@/lib/languages";

export const roomIdSchema = z.string().uuid();

export const runCodeSchema = z.object({
  /** Must be a valid Monaco language ID registered in lib/languages.ts */
  language: z.enum(VALID_MONACO_IDS, {
    errorMap: () => ({ message: "Unsupported language." }),
  }),
  /** Source code — max 100 KB */
  code: z.string().min(1, "Code cannot be empty.").max(100_000, "Code exceeds 100 KB limit."),
  /** Standard input — max 20 KB */
  stdin: z.string().max(20_000, "stdin exceeds 20 KB limit.").optional().default(""),
});

export type RunCodeInput = z.infer<typeof runCodeSchema>;

export const githubFileSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().min(1),
  branch: z.string().min(1).default("main")
});

export const githubTreeSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1).default("main"),
  recursive: z.boolean().optional().default(true)
});

export const githubCommitSchema = githubFileSchema.extend({
  content: z.string().max(500_000),
  message: z.string().min(1).max(200),
  sha: z.string().optional()
});
