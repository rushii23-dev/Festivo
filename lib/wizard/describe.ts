/**
 * Plain-language summaries of wizard answers, shared by the review step and the
 * "Your plan so far" card. Each returns text, or null when there is nothing yet.
 */
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney, parseMoneyInput } from "@/lib/budget/format";
import type { BudgetCategory } from "@/lib/schemas/common";
import { formatLongDate } from "@/lib/timeline/dates";
import { draftQuestions, upcomingMonths, type WizardDraft } from "./draft";
import { FORMAT_COPY, PRIORITY_LABELS, TICKET_COPY } from "./labels";

/** Work events and meetups count attendees; everything else counts guests. */
export const countsAttendees = (draft: WizardDraft) =>
  draft.group === "work" || draft.group === "meetup";

/** The values joined with commas, or `empty` when there are none. */
export function listOr<T extends string | null>(values: string[], empty: T): string | T {
  return values.length > 0 ? values.join(", ") : empty;
}

export function describeTickets(draft: WizardDraft): string {
  if (draft.tickets === "none") return TICKET_COPY.none;
  const price = parseMoneyInput(draft.ticketPrice);
  return [
    draft.tickets === "paid" && price
      ? formatMoney(price, draft.currency)
      : TICKET_COPY.free,
    draft.capacity ? `${draft.capacity} spots` : "no limit",
    ...(draft.approval ? ["you approve each guest"] : []),
  ].join(", ");
}

export function describeDate(draft: WizardDraft, today: string): string {
  if (draft.dateKind === "fixed")
    return draft.date ? formatLongDate(draft.date) : "Not set";
  if (!draft.month) return "Flexible";
  const label =
    upcomingMonths(today).find((m) => m.value === draft.month)?.label ?? draft.month;
  return `Flexible, around ${label}`;
}

/** The date, plus the number of days for multi-day events. */
export function describeWhen(draft: WizardDraft, today: string): string | null {
  if (draft.dateKind === "fixed" && !draft.date) return null;
  const days = Number(draft.days);
  const length = draftQuestions(draft).multiDay && days > 1 ? `, ${days} days` : "";
  return describeDate(draft, today) + length;
}

/** How people join (when the occasion offers a choice) and the place. */
export function describeWhere(draft: WizardDraft): string | null {
  const parts = [
    draftQuestions(draft).formats.length > 1 ? FORMAT_COPY[draft.format].label : "",
    draft.location.trim(),
  ].filter(Boolean);
  return listOr(parts, null);
}

/** The head count, noting children when the occasion asks about them. */
export function describeGuests(draft: WizardDraft): string | null {
  const count = draft.guestCount.trim();
  if (!count) return null;
  return draftQuestions(draft).kids && draft.kids ? `${count}, with children` : count;
}

export function describeTotal(draft: WizardDraft): string | null {
  const total = parseMoneyInput(draft.budgetTotal);
  return total ? formatMoney(total, draft.currency) : null;
}

/** Only the categories moved away from "balanced", e.g. "Decor: Spend more". */
export function describePriorities(draft: WizardDraft): string[] {
  return Object.entries(draft.priorities)
    .filter(([, value]) => value !== 3)
    .map(
      ([key, value]) =>
        `${BUDGET_CATEGORY_LABELS[key as BudgetCategory]}: ${PRIORITY_LABELS[value ?? 3]}`,
    );
}
