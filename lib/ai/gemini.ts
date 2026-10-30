/**
 * Google Gemini provider using structured JSON output (responseJsonSchema).
 * Runs on the server only; the API key never leaves this module.
 */
import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { AiProviderError, type AiProvider, type StructuredTask } from "./provider";

export interface GeminiOptions {
  apiKey: string;
  model: string;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
  /**
   * Extra attempts, with exponential backoff and jitter, when the request fails
   * before any text arrives: rate limits (429), timeouts (408) and server errors.
   * A reply that breaks off mid-stream is not retried here; parsing repairs it once.
   */
  retries?: number;
}

/** Status codes worth another attempt: the request itself was fine. */
export const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];

export function createGeminiProvider({
  apiKey,
  model,
  timeoutMs = 60_000,
  retries = 2,
}: GeminiOptions): AiProvider {
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: timeoutMs,
      ...(retries > 0
        ? {
            retryOptions: {
              attempts: retries + 1,
              initialDelay: 0.5,
              maxDelay: 4,
              httpStatusCodes: RETRYABLE_STATUS,
            },
          }
        : {}),
    },
  });

  return {
    name: "gemini",
    model,
    async *stream(task: StructuredTask, signal?: AbortSignal) {
      let response: AsyncGenerator<{ text?: string | undefined }>;
      try {
        response = await client.models.generateContentStream({
          model,
          contents: task.prompt,
          config: {
            systemInstruction: task.system,
            responseMimeType: "application/json",
            responseJsonSchema: task.schema,
            temperature: task.context.kind === "repair" ? 0 : 0.7,
            ...(task.maxOutputTokens ? { maxOutputTokens: task.maxOutputTokens } : {}),
            ...(signal ? { abortSignal: signal } : {}),
          },
        });
      } catch (error) {
        throw toProviderError(error);
      }
      try {
        for await (const chunk of response) {
          if (chunk.text) yield chunk.text;
        }
      } catch (error) {
        throw toProviderError(error);
      }
    },
  };
}

function toProviderError(error: unknown): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (error instanceof ApiError) {
    return new AiProviderError(`Gemini request failed (${error.status})`, error.status, {
      cause: error,
    });
  }
  return new AiProviderError("Gemini request failed", undefined, { cause: error });
}
