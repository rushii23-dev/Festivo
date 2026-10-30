/**
 * Reads AI settings from server-side environment variables only. Nothing here
 * is prefixed NEXT_PUBLIC_, so none of it can reach the browser bundle.
 */
import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  AI_PROVIDER: z.enum(["mock", "gemini"]).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-flash-latest"),
  /** Total artificial delay for mock streaming, so demo mode shows progress. */
  MOCK_STREAM_DELAY_MS: z.coerce.number().int().min(0).max(10_000).default(1200),
  /** Retries for a Gemini request that fails before streaming starts (429, 5xx). */
  GEMINI_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
});

export interface AiConfig {
  provider: "mock" | "gemini";
  geminiApiKey?: string;
  geminiModel: string;
  geminiRetries: number;
  mockDelayMs: number;
}

export function readAiConfig(
  env: Record<string, string | undefined> = process.env,
): AiConfig {
  const parsed = EnvSchema.parse({
    ...env,
    // Treat empty or placeholder values as "not set".
    GEMINI_API_KEY:
      env.GEMINI_API_KEY && env.GEMINI_API_KEY !== "your-gemini-api-key"
        ? env.GEMINI_API_KEY
        : undefined,
    AI_PROVIDER: env.AI_PROVIDER || undefined,
  });
  // Without a key, always fall back to demo mode so the app still works.
  const provider =
    parsed.AI_PROVIDER === "gemini" && parsed.GEMINI_API_KEY
      ? "gemini"
      : parsed.AI_PROVIDER === undefined && parsed.GEMINI_API_KEY
        ? "gemini"
        : "mock";
  return {
    provider,
    ...(parsed.GEMINI_API_KEY ? { geminiApiKey: parsed.GEMINI_API_KEY } : {}),
    geminiModel: parsed.GEMINI_MODEL,
    geminiRetries: parsed.GEMINI_RETRIES,
    mockDelayMs: parsed.MOCK_STREAM_DELAY_MS,
  };
}
