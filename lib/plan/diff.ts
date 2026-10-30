/**
 * Human-readable list of what a refine would change, for the preview step.
 * Each change carries text for both the visual diff and screen readers.
 */
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney } from "@/lib/budget/format";
import type { Plan } from "@/lib/schemas/plan";
import { formatLongDate } from "@/lib/timeline/dates";

export type ChangeKind = "changed" | "added" | "removed";

export interface PlanChange {
  kind: ChangeKind;
  /** What changed, e.g. "Total budget" or "Idea". */
  field: string;
  before?: string;
  after?: string;
}

/** A "changed" entry when the value differs, shown with `show`. */
function changedValue<T>(
  field: string,
  before: T,
  after: T,
  show: (value: T) => string,
): PlanChange[] {
  return before === after
    ? []
    : [{ kind: "changed", field, before: show(before), after: show(after) }];
}

/** Entries added to or removed from a list, matched by id. */
function membershipChanges(
  field: string,
  before: readonly { id: string; title: string }[],
  after: readonly { id: string; title: string }[],
): PlanChange[] {
  const beforeIds = new Set(before.map((entry) => entry.id));
  const afterIds = new Set(after.map((entry) => entry.id));
  return [
    ...after
      .filter((entry) => !beforeIds.has(entry.id))
      .map((entry): PlanChange => ({ kind: "added", field, after: entry.title })),
    ...before
      .filter((entry) => !afterIds.has(entry.id))
      .map((entry): PlanChange => ({ kind: "removed", field, before: entry.title })),
  ];
}

/** What a refine would change: date, budget, budget lines, ideas, tasks and summary. */
export function diffPlans(before: Plan, after: Plan): PlanChange[] {
  const money = (n: number) => formatMoney(n, after.currency);
  const budgetLines = after.budget.flatMap((item) => {
    const prior = before.budget.find((b) => b.category === item.category);
    return prior
      ? changedValue(
          BUDGET_CATEGORY_LABELS[item.category],
          prior.allocated,
          item.allocated,
          money,
        )
      : [];
  });
  const asIs = (text: string) => text;
  return [
    ...changedValue("Event date", before.date, after.date, formatLongDate),
    ...changedValue("Total budget", before.totalBudget, after.totalBudget, money),
    ...budgetLines,
    ...membershipChanges("Idea", before.ideas, after.ideas),
    ...membershipChanges("Task", before.timeline, after.timeline),
    ...changedValue("Summary", before.summary, after.summary, asIs),
  ];
}

/** One sentence per change, for live regions and the copied summary. */
export function describeChange(change: PlanChange): string {
  switch (change.kind) {
    case "added":
      return `${change.field} added: ${change.after}`;
    case "removed":
      return `${change.field} removed: ${change.before}`;
    case "changed":
      return `${change.field}: ${change.before} to ${change.after}`;
  }
}
