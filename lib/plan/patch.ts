/**
 * Applies a validated refine patch to a plan. The result is always re-checked:
 * budgets re-normalised to the total, dates re-validated, IDs kept unique.
 */
import { scaleBudget } from "@/lib/budget/rebalance";
import type { PlanPatch } from "@/lib/ai/schemas";
import { PlanSchema, type Plan } from "@/lib/schemas/plan";
import { addDays, diffDays } from "@/lib/timeline/dates";
import { normalizeTimeline } from "@/lib/timeline/generate";
import { budgetFromDraft, ideasFromDraft, tasksFromDraft } from "./fromDraft";
import { uniqueIdFactory } from "./ids";

export class PatchError extends Error {
  override name = "PatchError";
}

/**
 * @throws PatchError when the patch moves the event into the past.
 */
export function applyPatch(plan: Plan, patch: PlanPatch, today: string): Plan {
  const date = patch.date ?? plan.date;
  if (diffDays(today, date) < 0) throw new PatchError("The new date is in the past.");

  // Moving the event shifts every task by the same amount, keeping its lead time.
  const shifted =
    date === plan.date
      ? plan.timeline
      : plan.timeline.map((task) => ({
          ...task,
          dueDate: addDays(date, -diffDays(task.dueDate, plan.date)),
        }));

  const removeTasks = new Set(patch.removeTaskIds ?? []);
  const kept = shifted.filter((task) => !removeTasks.has(task.id));
  const nextTaskId = uniqueIdFactory(
    "task",
    kept.map((t) => t.id),
  );
  const timeline = normalizeTimeline(
    [...kept, ...tasksFromDraft(patch.addTasks ?? [], date, nextTaskId)],
    date,
    today,
  );

  const totalBudget =
    patch.totalBudget !== undefined ? Math.round(patch.totalBudget) : plan.totalBudget;
  const budget = patch.budget
    ? budgetFromDraft(patch.budget, plan.eventType, totalBudget, plan.budget)
    : totalBudget !== plan.totalBudget
      ? scaleBudget(plan.budget, totalBudget)
      : plan.budget;

  // Saved ideas are the user's choice: a patch can never remove them.
  const removeIdeas = new Set(patch.removeIdeaIds ?? []);
  const keptIdeas = plan.ideas.filter((idea) => idea.saved || !removeIdeas.has(idea.id));
  const knownTitles = new Set(keptIdeas.map((i) => i.title.toLowerCase()));
  const nextIdeaId = uniqueIdFactory(
    "idea",
    plan.ideas.map((i) => i.id),
  );
  const newIdeas = ideasFromDraft(
    (patch.addIdeas ?? []).filter((idea) => !knownTitles.has(idea.title.toLowerCase())),
    nextIdeaId,
  );

  return PlanSchema.parse({
    ...plan,
    date,
    totalBudget,
    budget,
    timeline,
    ideas: [...keptIdeas, ...newIdeas].slice(0, 40),
    summary: patch.summary ?? plan.summary,
  });
}
