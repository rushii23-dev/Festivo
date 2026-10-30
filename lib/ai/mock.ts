/**
 * Demo-mode provider. Produces the same JSON a real model would, built from
 * the fixtures, and streams it section by section so the progress UI behaves
 * exactly as it does with Gemini.
 */
import "server-only";
import { buildMockPlan, fixtureFor, selectIdeas } from "@/lib/fixtures/buildMockPlan";
import type { IdeaSeed } from "@/lib/fixtures/types";
import { occasionOf } from "@/lib/events/kind";
import type { Plan } from "@/lib/schemas/plan";
import type { Vibe } from "@/lib/schemas/common";
import { VIBES } from "@/lib/schemas/common";
import { diffDays } from "@/lib/timeline/dates";
import type { AiProvider, StructuredTask, TaskContext } from "./provider";
import type { IdeasDraft, PlanDraft, PlanPatch } from "./schemas";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (ms <= 0) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(
        signal.reason instanceof Error
          ? signal.reason
          : new DOMException("The request was cancelled.", "AbortError"),
      );
    });
  });

export function planToDraft(plan: Plan): PlanDraft {
  return {
    budget: plan.budget.map(({ category, allocated, rationale }) => ({
      category,
      amount: allocated,
      rationale,
    })),
    timeline: plan.timeline.map((task) => ({
      title: task.title,
      description: task.description ?? "",
      daysBefore: diffDays(task.dueDate, plan.date),
      ...(task.time ? { time: task.time } : {}),
    })),
    vendors: plan.vendors.map(({ category, questionsToAsk }) => ({
      category,
      questionsToAsk,
    })),
    ideas: plan.ideas.map(({ category, title, description, costTier }) => ({
      category,
      title,
      description,
      costTier,
    })),
    summary: plan.summary,
  };
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** Next mid-month date for the named month that is at least two weeks away. */
function nextMonthDate(monthIndex: number, today: string, year?: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  if (year) return `${year}-${month}-15`;
  const thisYear = Number(today.slice(0, 4));
  const candidate = `${thisYear}-${month}-15`;
  return diffDays(today, candidate) >= 14 ? candidate : `${thisYear + 1}-${month}-15`;
}

/** What one demo-mode rule sees, and where it writes its part of the patch. */
interface RefineRule {
  plan: Plan;
  text: string;
  today: string;
  patch: Partial<PlanPatch>;
  notes: string[];
  fixture: ReturnType<typeof fixtureFor>;
  shownTitles: Set<string>;
}

const asNewIdea = ({ category, title, description, costTier }: IdeaSeed) => ({
  category,
  title,
  description,
  costTier,
});

/** "Cut budget by 20%", "raise it by 10%". */
function refineBudget({ plan, text, patch, notes }: RefineRule) {
  const percent = /(\d{1,2})\s*%/.exec(text)?.[1];
  if (!percent) return;
  const cut = /\b(cut|reduce|lower|decrease|trim|less)\b/.test(text);
  const raise = !cut && /\b(increase|raise|add|more|boost)\b/.test(text);
  if (!cut && !raise) return;
  const p = Number(percent) / 100;
  patch.totalBudget = Math.round(plan.totalBudget * (cut ? 1 - p : 1 + p));
  notes.push(
    `${cut ? "lowers" : "raises"} the total budget by ${percent}% and scales every category to match`,
  );
}

/** "Move the date to March (2027)". */
function refineDate({ plan, text, today, patch, notes }: RefineRule) {
  const monthIndex = MONTHS.findIndex((m) => text.includes(m));
  if (monthIndex < 0 || !/\b(move|change|shift|push|date|reschedule)\b/.test(text))
    return;
  const year = /\b(20\d{2})\b/.exec(text)?.[1];
  const date = nextMonthDate(monthIndex, today, year ? Number(year) : undefined);
  if (diffDays(today, date) < 1 || date === plan.date) return;
  patch.date = date;
  notes.push(
    `moves the event to the 15th of ${MONTHS[monthIndex]} and shifts every task with it`,
  );
}

/** "Make it eco-friendly", "more traditional". */
function refineVibe({ text, patch, notes, fixture, shownTitles }: RefineRule) {
  const wantsEco = /\b(eco|green|sustainab|zero[- ]waste|plastic)\b/.test(text);
  const target: Vibe | undefined = wantsEco
    ? "eco-friendly"
    : VIBES.find((v) => text.includes(v.split("-")[0] ?? v));
  if (!target) return;
  const fresh = fixture.ideas.filter(
    (seed) => seed.vibes.includes(target) && !shownTitles.has(seed.title),
  );
  if (fresh.length === 0) return;
  patch.addIdeas = fresh.slice(0, 4).map(asNewIdea);
  notes.push(`adds ${patch.addIdeas.length} ${target} ideas`);
}

/** "Make it cheaper": drops unsaved splurges and suggests budget-friendly ideas. */
function refineCheaper({ plan, text, patch, notes, fixture, shownTitles }: RefineRule) {
  if (!/\b(cheaper|save money|budget[- ]friendly|affordable|frugal)\b/.test(text)) return;
  const splurges = plan.ideas.filter((i) => i.costTier === 3 && !i.saved);
  if (splurges.length > 0) {
    patch.removeIdeaIds = splurges.map((i) => i.id);
    notes.push(`removes ${splurges.length} splurge ideas you have not saved`);
  }
  const cheaper = fixture.ideas
    .filter((seed) => seed.costTier === 1 && !shownTitles.has(seed.title))
    .filter((seed) => !patch.addIdeas?.some((idea) => idea.title === seed.title))
    .slice(0, 3);
  if (cheaper.length === 0) return;
  patch.addIdeas = [...(patch.addIdeas ?? []), ...cheaper.map(asNewIdea)];
  notes.push(`adds ${cheaper.length} budget-friendly ideas`);
}

const REFINE_RULES = [refineBudget, refineDate, refineVibe, refineCheaper];

/** Rule-based refine for demo mode: understands the common instructions. */
export function mockRefine(plan: Plan, instruction: string, today: string): PlanPatch {
  const rule: RefineRule = {
    plan,
    text: instruction.toLowerCase(),
    today,
    patch: {},
    notes: [],
    fixture: fixtureFor(plan),
    shownTitles: new Set(plan.ideas.map((i) => i.title)),
  };
  for (const apply of REFINE_RULES) apply(rule);

  const explanation =
    rule.notes.length > 0
      ? `This change ${rule.notes.join(", and ")}.`
      : "Demo mode understands changes like “cut budget by 20%”, “move the date to March”, “make it eco-friendly” or “make it cheaper”. Add a Gemini key for any other request.";
  return { explanation, ...rule.patch };
}

function mockIdeas(context: Extract<TaskContext, { kind: "ideas" }>): IdeasDraft {
  const { plan, category, excludeTitles } = context;
  const exclude = new Set(excludeTitles);
  const seeds = fixtureFor(plan).ideas.filter((s) => !exclude.has(s.title));
  const picked = selectIdeas(seeds, {
    category,
    vibes: plan.vibes,
    budget: {
      eventType: plan.eventType,
      currency: plan.currency,
      totalBudget: plan.totalBudget,
      guestCount: plan.guestCount,
      occasion: occasionOf(plan).id,
    },
    count: 3,
  });
  return {
    ideas: picked.map(({ category: c, title, description, costTier }) => ({
      category: c,
      title,
      description,
      costTier,
    })),
  };
}

function respond(context: TaskContext): unknown {
  switch (context.kind) {
    case "plan":
      return planToDraft(
        buildMockPlan(context.input, {
          id: "mock",
          today: context.today,
          now: new Date(),
        }),
      );
    case "refine":
      return mockRefine(context.plan, context.instruction, context.today);
    case "ideas":
      return mockIdeas(context);
    case "repair":
      return respond(context.original);
  }
}

/** Splits a JSON object into chunks at top-level keys, like a model writing it. */
export function chunkJson(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return [JSON.stringify(value)];
  const entries = Object.entries(value);
  return entries.map(([key, val], index) => {
    const prefix = index === 0 ? "{" : ",";
    const suffix = index === entries.length - 1 ? "}" : "";
    return `${prefix}${JSON.stringify(key)}:${JSON.stringify(val)}${suffix}`;
  });
}

export function createMockProvider({
  delayMs = 0,
}: { delayMs?: number } = {}): AiProvider {
  return {
    name: "mock",
    model: "mock-fixtures-v1",
    async *stream(task: StructuredTask, signal?: AbortSignal) {
      const chunks = chunkJson(respond(task.context));
      const pause = chunks.length > 0 ? delayMs / chunks.length : 0;
      for (const chunk of chunks) {
        await sleep(pause, signal);
        yield chunk;
      }
    },
  };
}
