import "server-only";
import { readAiConfig } from "./config";
import { createGeminiProvider } from "./gemini";
import { createMockProvider } from "./mock";
import type { AiProvider } from "./provider";

let cached: AiProvider | null = null;

/** The configured provider: Gemini when a key is set, otherwise demo mode. */
export function getProvider(): AiProvider {
  if (cached) return cached;
  const config = readAiConfig();
  cached =
    config.provider === "gemini" && config.geminiApiKey
      ? createGeminiProvider({
          apiKey: config.geminiApiKey,
          model: config.geminiModel,
          retries: config.geminiRetries,
        })
      : createMockProvider({ delayMs: config.mockDelayMs });
  return cached;
}

/** Test-only: forget the cached provider after changing env. */
export function resetProvider(): void {
  cached = null;
}
