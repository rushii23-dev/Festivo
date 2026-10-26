/**
 * Calendar-date math on ISO "YYYY-MM-DD" strings. Everything runs in UTC so a
 * plan never shifts by a day because of the server's or the user's time zone.
 */

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses "YYYY-MM-DD" to a UTC midnight Date. Throws for malformed or impossible dates. */
export function parseIsoDate(iso: string): Date {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new RangeError(`Invalid ISO date: ${iso}`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new RangeError(`Invalid ISO date: ${iso}`);
  }
  return date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIsoDate(new Date(parseIsoDate(iso).getTime() + days * MS_PER_DAY));
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: string, to: string): number {
  return Math.round(
    (parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / MS_PER_DAY,
  );
}

/** Today's calendar date in the given time zone (defaults to UTC). */
export function todayIso(now: Date = new Date(), timeZone = "UTC"): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Long, human date for display, e.g. "Sunday, 14 February 2027". */
export function formatLongDate(iso: string, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseIsoDate(iso));
}

/** Short date, e.g. "14 Feb". */
export function formatShortDate(iso: string, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parseIsoDate(iso));
}

export interface Countdown {
  days: number;
  status: "upcoming" | "today" | "past";
  label: string;
}

export function countdown(eventDate: string, today: string): Countdown {
  const days = diffDays(today, eventDate);
  if (days === 0) return { days, status: "today", label: "It's today!" };
  if (days < 0) {
    const ago = -days;
    return { days, status: "past", label: `${ago} ${ago === 1 ? "day" : "days"} ago` };
  }
  return {
    days,
    status: "upcoming",
    label: `${days} ${days === 1 ? "day" : "days"} to go`,
  };
}
