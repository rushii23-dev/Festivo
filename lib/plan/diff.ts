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

export function diffPlans(before: Plan, after: Plan): PlanChange[] {
  const money = (n: number) => formatMoney(n, after.currency);
  const changes: PlanChange[] = [];

  if (before.date !== after.date) {
    changes.push({
      kind: "changed",
      field: "Event date",
      before: formatLongDate(before.date),
      after: formatLongDate(after.date),
    });
  }
  if (before.totalBudget !== after.totalBudget) {
    changes.push({
      kind: "changed",
      field: "Total budget",
      before: money(before.totalBudget),
      after: money(after.totalBudget),
    });
  }
  for (const item of after.budget) {
    const prior = before.budget.find((b) => b.category === item.category);
    if (prior && prior.allocated !== item.allocated) {
      changes.push({
        kind: "changed",
        field: BUDGET_CATEGORY_LABELS[item.category],
        before: money(prior.allocated),
        after: money(item.allocated),
      });
    }
  }

  const beforeIdeas = new Set(before.ideas.map((i) => i.id));
  const afterIdeas = new Set(after.ideas.map((i) => i.id));
  for (const idea of after.ideas) {
    if (!beforeIdeas.has(idea.id))
      changes.push({ kind: "added", field: "Idea", after: idea.title });
  }
  for (const idea of before.ideas) {
    if (!afterIdeas.has(idea.id)) {
      changes.push({ kind: "removed", field: "Idea", before: idea.title });
    }
  }

  const beforeTasks = new Set(before.timeline.map((t) => t.id));
  const afterTasks = new Set(after.timeline.map((t) => t.id));
  for (const task of after.timeline) {
    if (!beforeTasks.has(task.id))
      changes.push({ kind: "added", field: "Task", after: task.title });
  }
  for (const task of before.timeline) {
    if (!afterTasks.has(task.id)) {
      changes.push({ kind: "removed", field: "Task", before: task.title });
    }
  }

  if (before.summary !== after.summary) {
    changes.push({
      kind: "changed",
      field: "Summary",
      before: before.summary,
      after: after.summary,
    });
  }
  return changes;
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
