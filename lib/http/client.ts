/**
 * Browser-side API helpers: JSON requests, the server's user-safe error
 * messages, and the visitor's own time zone and date. The server-side
 * counterpart is `./api.ts`.
 */
import { todayIso } from "@/lib/timeline/dates";

export const NETWORK_ERROR =
  "We couldn't reach Festivo. Check your connection and try again.";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** Starts a JSON POST and hands back the raw response (for streamed replies). */
export function sendJson(
  url: string,
  body: unknown,
  signal?: AbortSignal | undefined,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });
}

/** The parsed JSON body, or null when there is none or it is not JSON. */
export function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

/** The message from an API error body (`{ error: { message } }`), or the network fallback. */
export function errorMessage(body: unknown): string {
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" ? message : NETWORK_ERROR;
}

/**
 * POSTs JSON and returns the parsed body, or the server's user-safe error message.
 * A cancelled request rethrows its AbortError so the caller can ignore it.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal | undefined,
): Promise<ApiResult<T>> {
  try {
    const response = await sendJson(url, body, signal);
    const json = await readJson(response);
    if (!response.ok || json === null) return { ok: false, message: errorMessage(json) };
    return { ok: true, data: json as T };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, message: NETWORK_ERROR };
  }
}

export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Today's date (YYYY-MM-DD) where the visitor is, not where the server is. */
export function localToday(): string {
  return todayIso(new Date(), userTimeZone());
}
