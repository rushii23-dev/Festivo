/**
 * Applies a validated refine patch to a plan. The result is always re-checked:
 * budgets re-normalised to the total, dates re-validated, IDs kept unique.
 */
import { scaleBudget } from "@/lib/budget/rebalance";
import type { PlanPatch } from "@/lib/ai/schemas";
import {
  PLAN_LIMITS,
  PlanSchema,
  type BudgetItem,
  type Idea,
  type Plan,
  type TimelineTask,
} from "@/lib/schemas/plan";
import { addDays, diffDays } from "@/lib/timeline/dates";
import { normalizeTimeline } from "@/lib/timeline/generate";
import { budgetFromDraft, ideasFromDraft, tasksFromDraft } from "./fromDraft";
import { uniqueIdFactory, uniqueTitleFilter } from "./ids";

export class PatchError extends Error {
  override name = "PatchError";
}

/** Moving the event shifts every task by the same amount, keeping its lead time. */
function shiftTasks(plan: Plan, date: string): TimelineTask[] {
  if (date === plan.date) return plan.timeline;
  return plan.timeline.map((task) => ({
    ...task,
    dueDate: addDays(date, -diffDays(task.dueDate, plan.date)),
  }));
}

/** Removes and adds tasks; new ones fill only the room the plan has left. */
function patchTimeline(
  plan: Plan,
  patch: PlanPatch,
  date: string,
  today: string,
): TimelineTask[] {
  const removed = new Set(patch.removeTaskIds ?? []);
  const kept = shiftTasks(plan, date).filter((task) => !removed.has(task.id));
  const nextTaskId = uniqueIdFactory(
    "task",
    kept.map((t) => t.id),
  );
  const added = tasksFromDraft(patch.addTasks ?? [], date, nextTaskId).slice(
    0,
    Math.max(0, PLAN_LIMITS.tasks - kept.length),
  );
  return normalizeTimeline([...kept, ...added], date, today);
}

/** A new breakdown wins; a new total on its own scales the current lines. */
function patchBudget(plan: Plan, patch: PlanPatch, totalBudget: number): BudgetItem[] {
  if (patch.budget) return budgetFromDraft(patch.budget, plan, totalBudget, plan.budget);
  if (totalBudget !== plan.totalBudget) return scaleBudget(plan.budget, totalBudget);
  return plan.budget;
}

/** Saved ideas are the user's choice: a patch can never remove them. */
function patchIdeas(plan: Plan, patch: PlanPatch): Idea[] {
  const removed = new Set(patch.removeIdeaIds ?? []);
  const kept = plan.ideas.filter((idea) => idea.saved || !removed.has(idea.id));
  const isNewTitle = uniqueTitleFilter(kept.map((i) => i.title));
  const nextIdeaId = uniqueIdFactory(
    "idea",
    plan.ideas.map((i) => i.id),
  );
  const added = ideasFromDraft(
    (patch.addIdeas ?? []).filter((idea) => isNewTitle(idea.title)),
    nextIdeaId,
  );
  return [...kept, ...added].slice(0, PLAN_LIMITS.ideas);
}

/**
 * @throws PatchError when the patch moves the event into the past.
 */
export function applyPatch(plan: Plan, patch: PlanPatch, today: string): Plan {
  const date = patch.date ?? plan.date;
  if (diffDays(today, date) < 0) throw new PatchError("The new date is in the past.");
  const totalBudget =
    patch.totalBudget === undefined ? plan.totalBudget : Math.round(patch.totalBudget);

  return PlanSchema.parse({
    ...plan,
    date,
    totalBudget,
    budget: patchBudget(plan, patch, totalBudget),
    timeline: patchTimeline(plan, patch, date, today),
    ideas: patchIdeas(plan, patch),
    summary: patch.summary ?? plan.summary,
  });
}
