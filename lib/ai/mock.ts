/**
 * Demo-mode provider. Produces the same JSON a real model would, built from
 * the fixtures, and streams it section by section so the progress UI behaves
 * exactly as it does with Gemini.
 */
import "server-only";
import { buildMockPlan, fixtureFor, selectIdeas } from "@/lib/fixtures/buildMockPlan";
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
      reject(signal.reason);
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

/** Rule-based refine for demo mode: understands the common instructions. */
export function mockRefine(plan: Plan, instruction: string, today: string): PlanPatch {
  const text = instruction.toLowerCase();
  const patch: Partial<PlanPatch> = {};
  const notes: string[] = [];

  const percent = /(\d{1,2})\s*%/.exec(text);
  if (percent?.[1] && /\b(cut|reduce|lower|decrease|trim|less)\b/.test(text)) {
    const p = Number(percent[1]) / 100;
    patch.totalBudget = Math.round(plan.totalBudget * (1 - p));
    notes.push(
      `lowers the total budget by ${percent[1]}% and scales every category to match`,
    );
  } else if (percent?.[1] && /\b(increase|raise|add|more|boost)\b/.test(text)) {
    const p = Number(percent[1]) / 100;
    patch.totalBudget = Math.round(plan.totalBudget * (1 + p));
    notes.push(
      `raises the total budget by ${percent[1]}% and scales every category to match`,
    );
  }

  const monthIndex = MONTHS.findIndex((m) => text.includes(m));
  if (monthIndex >= 0 && /\b(move|change|shift|push|date|reschedule)\b/.test(text)) {
    const year = /\b(20\d{2})\b/.exec(text)?.[1];
    const date = nextMonthDate(monthIndex, today, year ? Number(year) : undefined);
    if (diffDays(today, date) >= 1 && date !== plan.date) {
      patch.date = date;
      notes.push(
        `moves the event to the 15th of ${MONTHS[monthIndex]} and shifts every task with it`,
      );
    }
  }

  const fixture = fixtureFor(plan);
  const shownTitles = new Set(plan.ideas.map((i) => i.title));
  const vibe = VIBES.find((v) => text.includes(v.split("-")[0] ?? v));
  const wantsEco = /\b(eco|green|sustainab|zero[- ]waste|plastic)\b/.test(text);
  const targetVibe: Vibe | undefined = wantsEco ? "eco-friendly" : vibe;
  if (targetVibe) {
    const fresh = fixture.ideas.filter(
      (seed) => seed.vibes.includes(targetVibe) && !shownTitles.has(seed.title),
    );
    if (fresh.length > 0) {
      patch.addIdeas = fresh
        .slice(0, 4)
        .map(({ category, title, description, costTier }) => ({
          category,
          title,
          description,
          costTier,
        }));
      notes.push(`adds ${patch.addIdeas.length} ${targetVibe} ideas`);
    }
  }

  if (/\b(cheaper|save money|budget[- ]friendly|affordable|frugal)\b/.test(text)) {
    const splurges = plan.ideas.filter((i) => i.costTier === 3 && !i.saved);
    if (splurges.length > 0) {
      patch.removeIdeaIds = splurges.map((i) => i.id);
      notes.push(`removes ${splurges.length} splurge ideas you have not saved`);
    }
    const cheaper = fixture.ideas
      .filter((seed) => seed.costTier === 1 && !shownTitles.has(seed.title))
      .filter((seed) => !patch.addIdeas?.some((idea) => idea.title === seed.title))
      .slice(0, 3);
    if (cheaper.length > 0) {
      patch.addIdeas = [
        ...(patch.addIdeas ?? []),
        ...cheaper.map(({ category, title, description, costTier }) => ({
          category,
          title,
          description,
          costTier,
        })),
      ];
      notes.push(`adds ${cheaper.length} budget-friendly ideas`);
    }
  }

  const explanation =
    notes.length > 0
      ? `This change ${notes.join(", and ")}.`
      : "Demo mode understands changes like “cut budget by 20%”, “move the date to March”, “make it eco-friendly” or “make it cheaper”. Add a Gemini key for any other request.";
  return { explanation, ...patch };
}

function mockIdeas(context: Extract<TaskContext, { kind: "ideas" }>): IdeasDraft {
  const { plan, category, excludeTitles } = context;
  const exclude = new Set(excludeTitles);
  const seeds = fixtureFor(plan).ideas.filter((s) => !exclude.has(s.title));
  const picked = selectIdeas(
    seeds,
    category,
    plan.vibes,
    {
      eventType: plan.eventType,
      currency: plan.currency,
      totalBudget: plan.totalBudget,
      guestCount: plan.guestCount,
      occasion: occasionOf(plan).id,
    },
    3,
  );
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
