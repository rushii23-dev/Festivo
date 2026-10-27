/** Browser-only helpers for the dashboard: API calls and file downloads. */
import type { Plan } from "@/lib/schemas/plan";
import { buildIcs, icsFileName } from "@/lib/timeline/ics";

const NETWORK_ERROR = "We couldn't reach Festivo. Check your connection and try again.";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** POSTs JSON and returns the parsed body, or the server's user-safe error message. */
export async function postJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
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

/** Saves the timeline as an .ics file through a temporary object URL. */
export function downloadCalendar(plan: Plan): string {
  const ics = buildIcs({
    calendarName: plan.title,
    eventTitle: plan.title,
    eventDate: plan.date,
    location: plan.location,
    tasks: plan.timeline,
  });
  const url = URL.createObjectURL(
    new Blob([ics], { type: "text/calendar;charset=utf-8" }),
  );
  const fileName = icsFileName(plan.title);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
