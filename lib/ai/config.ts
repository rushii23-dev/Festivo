/**
 * Reads AI settings from server-side environment variables only. Nothing here
 * is prefixed NEXT_PUBLIC_, so none of it can reach the browser bundle.
 */
import "server-only";
import { z } from "zod";

const EnvSchema = z.object({
  AI_PROVIDER: z.enum(["mock", "gemini"]).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  /** Total artificial delay for mock streaming, so demo mode shows progress. */
  MOCK_STREAM_DELAY_MS: z.coerce.number().int().min(0).max(10_000).default(1200),
  /** Retries for a Gemini request that fails before streaming starts (429, 5xx). */
  GEMINI_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  /** Tried when the main model is overloaded or failing; empty turns it off. */
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-2.5-flash-lite"),
});

export interface AiConfig {
  provider: "mock" | "gemini";
  geminiApiKey?: string;
  geminiModel: string;
  geminiRetries: number;
  /** Absent when it is turned off or the same as the main model. */
  geminiFallbackModel?: string;
  mockDelayMs: number;
}

/** The value `.env.example` ships with, which means "no key yet". */
const PLACEHOLDER_KEY = "your-gemini-api-key";

/** An empty or placeholder key counts as "not set". */
const realKey = (key: string | undefined) =>
  key && key !== PLACEHOLDER_KEY ? key : undefined;

export function readAiConfig(
  env: Record<string, string | undefined> = process.env,
): AiConfig {
  const parsed = EnvSchema.parse({
    ...env,
    GEMINI_API_KEY: realKey(env.GEMINI_API_KEY),
    // An empty setting counts as "not set" too.
    AI_PROVIDER: env.AI_PROVIDER || undefined,
  });
  const key = parsed.GEMINI_API_KEY;
  const fallback = parsed.GEMINI_FALLBACK_MODEL;
  return {
    // Gemini whenever there is a key, unless demo mode is asked for. Without a
    // key, always fall back to demo mode so the app still works.
    provider: key && parsed.AI_PROVIDER !== "mock" ? "gemini" : "mock",
    ...(key ? { geminiApiKey: key } : {}),
    geminiModel: parsed.GEMINI_MODEL,
    geminiRetries: parsed.GEMINI_RETRIES,
    ...(fallback && fallback !== parsed.GEMINI_MODEL
      ? { geminiFallbackModel: fallback }
      : {}),
    mockDelayMs: parsed.MOCK_STREAM_DELAY_MS,
  };
}
