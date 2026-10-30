/** Browser-only helpers for the dashboard: API calls and the visitor's time zone. */

const NETWORK_ERROR = "We couldn't reach Festivo. Check your connection and try again.";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** POSTs JSON and returns the parsed body, or the server's user-safe error message. */
export async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal | undefined,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ?? null,
    });
    const json = (await response.json().catch(() => null)) as
      (T & { error?: { message?: string } }) | null;
    if (!response.ok || !json) {
      return { ok: false, message: json?.error?.message ?? NETWORK_ERROR };
    }
    return { ok: true, data: json };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, message: NETWORK_ERROR };
  }
}

export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
