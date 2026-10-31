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
  /**
   * A second model, tried once the main one has used its retries on an overload,
   * rate limit, timeout or server error. Same request, same schema.
   */
  fallbackModel?: string | undefined;
  /** The clock behind the cooldown below; tests pass their own. */
  now?: () => number;
}

/** Status codes worth another attempt: the request itself was fine. */
export const RETRYABLE_STATUS = [408, 429, 500, 502, 503, 504];

/** After the main model fails, requests go straight to the fallback for this long. */
export const MAIN_MODEL_COOLDOWN_MS = 5 * 60_000;

/** A failure another model might not have: overload, rate limit, timeout, network. */
const worthAnotherModel = (error: AiProviderError) =>
  error.status === undefined || RETRYABLE_STATUS.includes(error.status);

export function createGeminiProvider({
  apiKey,
  model,
  timeoutMs = 60_000,
  retries = 2,
  fallbackModel,
  now = Date.now,
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

  const open = (name: string, task: StructuredTask, signal?: AbortSignal) =>
    client.models.generateContentStream({
      model: name,
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

  // An overloaded model often hangs until the timeout rather than answering 503,
  // so once it has failed, skip it for a while instead of paying that every time.
  let mainModelBackAt = 0;
  const firstChoice = () =>
    fallbackModel && now() < mainModelBackAt ? fallbackModel : model;

  return {
    name: "gemini",
    model,
    async *stream(task: StructuredTask, signal?: AbortSignal) {
      let response: AsyncGenerator<{ text?: string | undefined }>;
      const first = firstChoice();
      try {
        response = await open(first, task, signal);
      } catch (error) {
        const failure = toProviderError(error);
        const canFallBack = fallbackModel && first !== fallbackModel && !signal?.aborted;
        if (!canFallBack || !worthAnotherModel(failure)) throw failure;
        mainModelBackAt = now() + MAIN_MODEL_COOLDOWN_MS;
        try {
          response = await open(fallbackModel, task, signal);
        } catch (fallbackError) {
          throw toProviderError(fallbackError);
        }
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
