import { z } from "zod";

export const roomIdSchema = z.string().uuid();

export const runCodeSchema = z.object({
  language: z.string().min(1).max(40),
  code: z.string().min(1).max(100_000),
  stdin: z.string().max(20_000).optional().default("")
});

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
