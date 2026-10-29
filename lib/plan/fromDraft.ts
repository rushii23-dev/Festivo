/**
 * Turns a validated AI draft into a Plan. The AI supplies content and rough
 * numbers; this module enforces every hard rule in code: allowed categories,
 * budget sums, valid dates, unique IDs.
 */
import { allocateBudget, normalizeAmounts } from "@/lib/budget/allocate";
import { BUDGET_CATEGORY_LABELS, categoriesFor } from "@/lib/budget/categories";
import type { BudgetCategory } from "@/lib/schemas/common";
import type { EventInput } from "@/lib/schemas/eventInput";
import {
  PlanSchema,
  type BudgetItem,
  type CostTier,
  type Idea,
  type Plan,
  type TimelineTask,
  type Vendor,
} from "@/lib/schemas/plan";
import { addDays } from "@/lib/timeline/dates";
import { normalizeTimeline, phaseForDaysBefore } from "@/lib/timeline/generate";
import { formatOf, occasionOf, vendorsFor, type PlanKind } from "@/lib/events/kind";
import { DEFAULT_QUESTIONS } from "@/lib/vendors/catalog";
import type { DraftIdea, PlanDraft } from "@/lib/ai/schemas";
import { uniqueIdFactory } from "./ids";

type DraftTask = PlanDraft["timeline"][number];
type DraftBudget = PlanDraft["budget"];

/**
 * One line per category the kind of event uses, in canonical order, summing
 * exactly to `total`. Unknown categories are dropped and missing ones added.
 * If the draft has no usable amounts, the baseline split is used instead.
 */
export function budgetFromDraft(
  draft: DraftBudget,
  kind: PlanKind,
  total: number,
  previous: readonly BudgetItem[] = [],
): BudgetItem[] {
  const categories = categoriesFor(kind);
  const byCategory = new Map<BudgetCategory, DraftBudget[number]>();
  for (const item of draft) {
    if (categories.includes(item.category) && !byCategory.has(item.category)) {
      byCategory.set(item.category, item);
    }
  }
  const usable = [...byCategory.values()].some((item) => item.amount > 0);
  const amounts = usable
    ? normalizeAmounts(
        total,
        categories.map((key) => ({ key, amount: byCategory.get(key)?.amount ?? 0 })),
      )
    : allocateBudget(kind, total);

  return amounts.map(({ key, amount }) => {
    const prior = previous.find((p) => p.category === key);
    return {
      category: key,
      allocated: amount,
      rationale:
        byCategory.get(key)?.rationale ??
        prior?.rationale ??
        `Planned share for ${BUDGET_CATEGORY_LABELS[key].toLowerCase()}.`,
      ...(prior?.actual !== undefined ? { actual: prior.actual } : {}),
    };
  });
}

/** Converts relative draft tasks to dated tasks (not yet normalised). */
export function tasksFromDraft(
  tasks: readonly DraftTask[],
  eventDate: string,
  nextId: (title: string) => string,
): TimelineTask[] {
  return tasks.map((task) => ({
    id: nextId(task.title),
    phase: phaseForDaysBefore(task.daysBefore),
    title: task.title,
    ...(task.description ? { description: task.description } : {}),
    dueDate: addDays(eventDate, -task.daysBefore),
    ...(task.time && task.daysBefore === 0 ? { time: task.time } : {}),
    done: false,
  }));
}

export function ideasFromDraft(
  ideas: readonly DraftIdea[],
  nextId: (title: string) => string,
): Idea[] {
  return ideas.map((idea) => ({
    id: nextId(idea.title),
    category: idea.category,
    title: idea.title,
    description: idea.description,
    costTier: idea.costTier as CostTier,
  }));
}

/** Every vendor category for the kind of event, using the AI's questions where given. */
export function vendorsFromDraft(draft: PlanDraft["vendors"], kind: PlanKind): Vendor[] {
  return vendorsFor(kind).map((category) => ({
    id: `vendor-${category}`,
    category,
    status: "to-research",
    questionsToAsk:
      draft.find((v) => v.category === category)?.questionsToAsk ??
      DEFAULT_QUESTIONS[category],
  }));
}

/** The kind fields a new plan copies from its input (empty details left out). */
export function planKindFields(
  input: EventInput,
): Pick<Plan, "eventType" | "occasion" | "format" | "tickets" | "details"> {
  const details = Object.fromEntries(
    Object.entries(input.details).filter(([, value]) => value !== undefined),
  );
  return {
    eventType: input.eventType,
    occasion: occasionOf(input).id,
    format: formatOf(input),
    ...(input.tickets ? { tickets: input.tickets } : {}),
    ...(Object.keys(details).length > 0 ? { details } : {}),
  };
}

export interface FromDraftContext {
  id: string;
  today: string;
  now: Date;
  eventDate: string;
  flexible: boolean;
}

export function planFromDraft(
  draft: PlanDraft,
  input: EventInput,
  { id, today, now, eventDate, flexible }: FromDraftContext,
): Plan {
  const total = Math.round(input.budget.total);
  const timeline = normalizeTimeline(
    tasksFromDraft(draft.timeline, eventDate, uniqueIdFactory("task")),
    eventDate,
    today,
  );

  return PlanSchema.parse({
    id,
    ...planKindFields(input),
    title: input.name,
    date: eventDate,
    dateFlexible: flexible,
    location: input.location,
    guestCount: input.guestCount,
    vibes: input.vibes,
    currency: input.budget.currency,
    totalBudget: total,
    budget: budgetFromDraft(draft.budget, input, total),
    timeline,
    vendors: vendorsFromDraft(draft.vendors, input),
    ideas: ideasFromDraft(draft.ideas, uniqueIdFactory("idea")),
    summary: draft.summary,
    createdAt: now.toISOString(),
  });
}
