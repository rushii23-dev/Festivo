/**
 * Edits the dashboard makes to a saved plan. Every function is pure: it takes
 * a plan and returns a new one, so the store only ever calls
 * `updatePlan(id, (plan) => edit(plan, …))`. User-typed values are validated
 * with the plan's own Zod schemas before they are written.
 */
import { rebalance } from "@/lib/budget/rebalance";
import type { BudgetCategory } from "@/lib/schemas/common";
import {
  IdeaSchema,
  TimelineTaskSchema,
  VendorSchema,
  type BudgetItem,
  type Idea,
  type Plan,
  type TimelinePhase,
  type TimelineTask,
  type Vendor,
} from "@/lib/schemas/plan";
import { diffDays } from "@/lib/timeline/dates";
import { normalizeTimeline, phaseForDaysBefore } from "@/lib/timeline/generate";
import { applyVendorSpend, vendorSpendByCategory } from "@/lib/vendors/catalog";
import { uniqueIdFactory } from "./ids";

export type EditResult =
  { ok: true; plan: Plan } | { ok: false; errors: Partial<Record<string, string>> };

const MAX_IDEAS = 40;
const MAX_TASKS = 60;

function errorsFrom(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const errors: Partial<Record<string, string>> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

// Budget -------------------------------------------------------------------

function setBudgetLine(
  plan: Plan,
  category: BudgetCategory,
  update: (item: BudgetItem) => BudgetItem,
): Plan {
  return {
    ...plan,
    budget: plan.budget.map((item) => (item.category === category ? update(item) : item)),
  };
}

/** Sets a category's planned amount (whole units, never negative). */
export function setAllocated(plan: Plan, category: BudgetCategory, amount: number): Plan {
  const allocated = Math.max(0, Math.round(amount));
  return setBudgetLine(plan, category, (item) => ({ ...item, allocated }));
}

/** Sets or clears what has been spent on a category by hand. */
export function setActual(
  plan: Plan,
  category: BudgetCategory,
  amount: number | undefined,
): Plan {
  return setBudgetLine(plan, category, ({ actual: _old, ...item }) =>
    amount === undefined ? item : { ...item, actual: Math.max(0, Math.round(amount)) },
  );
}

/** Spreads the money not held by `locked` categories across the rest. */
export function rebalancePlanBudget(
  plan: Plan,
  locked: ReadonlySet<BudgetCategory>,
): { plan: Plan; overBy: number } {
  const { items, overBy } = rebalance(plan.budget, plan.totalBudget, locked);
  return { plan: { ...plan, budget: items }, overBy };
}

/**
 * The budget as the dashboard shows it. Vendor quotes win over typed amounts:
 * a quote is a number someone actually gave you, so once a vendor is quoted,
 * booked or paid, its quote is the actual spend for that budget line.
 */
export function effectiveBudget(plan: Plan): BudgetItem[] {
  return applyVendorSpend(plan.budget, plan.vendors, plan);
}

/** Budget lines whose actual spend comes from vendor quotes (read-only in the table). */
export function vendorDrivenCategories(plan: Plan): Set<BudgetCategory> {
  return new Set(
    Object.keys(vendorSpendByCategory(plan.vendors, plan)) as BudgetCategory[],
  );
}

// Timeline -----------------------------------------------------------------

export interface TaskInput {
  title: string;
  dueDate: string;
  time?: string;
  description?: string;
}

/** The phase a date falls in, relative to the event day (`fallback` for a malformed date). */
export function phaseForDate(
  dueDate: string,
  eventDate: string,
  fallback: TimelinePhase = "1 month",
): TimelinePhase {
  try {
    return phaseForDaysBefore(diffDays(dueDate, eventDate));
  } catch {
    return fallback;
  }
}

function cleanTaskInput(input: TaskInput) {
  const time = input.time?.trim();
  const description = input.description?.trim();
  return {
    title: input.title.trim(),
    dueDate: input.dueDate,
    ...(time ? { time } : {}),
    ...(description ? { description } : {}),
  };
}

function validateTask(task: TimelineTask): EditResult | TimelineTask {
  const parsed = TimelineTaskSchema.safeParse(task);
  if (!parsed.success) return { ok: false, errors: errorsFrom(parsed.error.issues) };
  return parsed.data;
}

function withTimeline(plan: Plan, tasks: TimelineTask[], today: string): Plan {
  return { ...plan, timeline: normalizeTimeline(tasks, plan.date, today) };
}

export function setTaskDone(plan: Plan, taskId: string, done: boolean): Plan {
  return {
    ...plan,
    timeline: plan.timeline.map((task) =>
      task.id === taskId ? { ...task, done } : task,
    ),
  };
}

/**
 * Adds a task. Dates before today are moved to today and dates are kept on the
 * right side of the event, the same rules the generated timeline follows.
 */
export function addTask(plan: Plan, input: TaskInput, today: string): EditResult {
  if (plan.timeline.length >= MAX_TASKS) {
    return { ok: false, errors: { form: `A plan can hold up to ${MAX_TASKS} tasks.` } };
  }
  const fields = cleanTaskInput(input);
  const nextId = uniqueIdFactory(
    "task",
    plan.timeline.map((t) => t.id),
  );
  const draft = validateTask({
    ...fields,
    id: nextId(fields.title),
    phase: phaseForDate(fields.dueDate, plan.date),
    done: false,
  });
  if ("ok" in draft) return draft;
  return { ok: true, plan: withTimeline(plan, [...plan.timeline, draft], today) };
}

export function updateTask(
  plan: Plan,
  taskId: string,
  input: TaskInput,
  today: string,
): EditResult {
  const current = plan.timeline.find((t) => t.id === taskId);
  if (!current) return { ok: false, errors: { form: "That task no longer exists." } };
  const fields = cleanTaskInput(input);
  const draft = validateTask({
    id: current.id,
    done: current.done,
    ...fields,
    phase: phaseForDate(fields.dueDate, plan.date, current.phase),
  });
  if ("ok" in draft) return draft;
  return {
    ok: true,
    plan: withTimeline(
      plan,
      plan.timeline.map((t) => (t.id === taskId ? draft : t)),
      today,
    ),
  };
}

export function deleteTask(plan: Plan, taskId: string): Plan {
  return { ...plan, timeline: plan.timeline.filter((t) => t.id !== taskId) };
}

/** Puts a deleted task back (for "Undo"), unless a task with its id exists again. */
export function restoreTask(plan: Plan, task: TimelineTask, today: string): Plan {
  if (plan.timeline.some((t) => t.id === task.id)) return plan;
  return withTimeline(plan, [...plan.timeline, task], today);
}

// Vendors ------------------------------------------------------------------

export type VendorEdit = Partial<Pick<Vendor, "status" | "quote" | "notes">>;

/** Updates status, quote or notes. Returns the plan unchanged if the edit is invalid. */
export function updateVendor(plan: Plan, vendorId: string, edit: VendorEdit): Plan {
  return {
    ...plan,
    vendors: plan.vendors.map((vendor) => {
      if (vendor.id !== vendorId) return vendor;
      const next: Record<string, unknown> = { ...vendor, ...edit };
      // Optional fields are removed rather than stored as undefined or "".
      if (next.quote === undefined) delete next.quote;
      if (typeof next.notes !== "string" || next.notes.trim() === "") delete next.notes;
      const parsed = VendorSchema.safeParse(next);
      return parsed.success ? parsed.data : vendor;
    }),
  };
}

// Ideas --------------------------------------------------------------------

function setIdeaFlag(
  plan: Plan,
  ideaId: string,
  flag: "saved" | "dismissed",
  value: boolean,
): Plan {
  return {
    ...plan,
    ideas: plan.ideas.map((idea) => {
      if (idea.id !== ideaId) return idea;
      const { [flag]: _old, ...rest } = idea;
      return value ? { ...rest, [flag]: true } : rest;
    }),
  };
}

export function setIdeaSaved(plan: Plan, ideaId: string, saved: boolean): Plan {
  return setIdeaFlag(plan, ideaId, "saved", saved);
}

export function setIdeaDismissed(plan: Plan, ideaId: string, dismissed: boolean): Plan {
  return setIdeaFlag(plan, ideaId, "dismissed", dismissed);
}

/**
 * Appends new ideas, skipping invalid ones and any with a title already in the
 * plan. When the plan is full, dismissed ideas make room first.
 */
export function addIdeas(
  plan: Plan,
  incoming: readonly Idea[],
): { plan: Plan; added: Idea[] } {
  const titles = new Set(plan.ideas.map((i) => i.title.toLowerCase()));
  const nextId = uniqueIdFactory(
    "idea",
    plan.ideas.map((i) => i.id),
  );
  const fresh: Idea[] = [];
  for (const raw of incoming) {
    const parsed = IdeaSchema.safeParse(raw);
    if (!parsed.success || titles.has(parsed.data.title.toLowerCase())) continue;
    titles.add(parsed.data.title.toLowerCase());
    const { saved: _s, dismissed: _d, ...idea } = parsed.data;
    fresh.push({ ...idea, id: nextId(idea.title) });
  }

  let ideas = [...plan.ideas];
  const overflow = ideas.length + fresh.length - MAX_IDEAS;
  if (overflow > 0) {
    let toDrop = overflow;
    ideas = ideas.filter((idea) => !(idea.dismissed && toDrop-- > 0));
  }
  const room = Math.max(0, MAX_IDEAS - ideas.length);
  const added = fresh.slice(0, room);
  return { plan: { ...plan, ideas: [...ideas, ...added] }, added };
}
