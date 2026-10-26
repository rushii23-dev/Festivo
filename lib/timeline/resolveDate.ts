/**
 * Turns the wizard's date answer into a concrete planning date.
 */
import type { EventDate } from "@/lib/schemas/eventInput";
import { addDays, diffDays, maxIso } from "./dates";

/** How far out we plan when the user is flexible and gives no month. */
export const FLEXIBLE_DEFAULT_DAYS = 90;
/** Furthest-out date we accept, roughly five years. */
export const MAX_DAYS_AHEAD = 365 * 5;

export interface ResolvedDate {
  date: string;
  flexible: boolean;
}

/**
 * Fixed dates are used as-is. Flexible dates aim for the 15th of the preferred
 * month (but at least 30 days out), or ~3 months from today with no month.
 */
export function resolveEventDate(input: EventDate, today: string): ResolvedDate {
  if (input.kind === "fixed") return { date: input.date, flexible: false };
  if (!input.month)
    return { date: addDays(today, FLEXIBLE_DEFAULT_DAYS), flexible: true };
  return { date: maxIso(`${input.month}-15`, addDays(today, 30)), flexible: true };
}

/** Returns a user-facing problem with the date, or null if it is plannable. */
export function eventDateProblem(input: EventDate, today: string): string | null {
  if (input.kind === "fixed") {
    const days = diffDays(today, input.date);
    if (days < 0) return "Pick today or a date in the future.";
    if (days > MAX_DAYS_AHEAD) return "Pick a date within the next five years.";
    return null;
  }
  if (input.month && input.month < today.slice(0, 7)) {
    return "Pick this month or a later one.";
  }
  if (input.month && diffDays(today, `${input.month}-01`) > MAX_DAYS_AHEAD) {
    return "Pick a month within the next five years.";
  }
  return null;
}
