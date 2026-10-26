/**
 * Plan use-cases on the server: generate (streamed), refine, and "more like
 * this". Provider-agnostic; every AI reply is validated, repaired once if
 * needed, converted by deterministic code, and cached.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { LruCache, hashKey } from "@/lib/cache/lru";
import { generateStructured } from "@/lib/ai/parse";
import {
  SYSTEM_PROMPT,
  buildIdeasPrompt,
  buildPlanPrompt,
  buildRefinePrompt,
} from "@/lib/ai/prompts";
import { AiOutputError, AiProviderError, type AiProvider } from "@/lib/ai/provider";
import {
  IdeasDraftSchema,
  PlanDraftSchema,
  PlanPatchSchema,
  toProviderSchema,
  type PlanPatch,
} from "@/lib/ai/schemas";
import type { EventInput } from "@/lib/schemas/eventInput";
import type { Idea, IdeaCategory, Plan } from "@/lib/schemas/plan";
import { diffDays } from "@/lib/timeline/dates";
import { resolveEventDate } from "@/lib/timeline/resolveDate";
import { diffPlans, type PlanChange } from "./diff";
import { ideasFromDraft, planFromDraft } from "./fromDraft";
import { uniqueIdFactory } from "./ids";
import { PatchError, applyPatch } from "./patch";

export const PLAN_SECTIONS = [
  "budget",
  "timeline",
  "vendors",
  "ideas",
  "summary",
] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number];

export const PROGRESS_MESSAGES = {
  start: "Reading your answers…",
  budget: "Crunching your budget…",
  timeline: "Drafting your timeline…",
  vendors: "Lining up vendors…",
  ideas: "Dreaming up ideas…",
  summary: "Writing your summary…",
  repair: "Tidying up a few details…",
  finalize: "Checking every number…",
} as const;
export type ProgressStep = keyof typeof PROGRESS_MESSAGES;

export type PlanEvent =
  | { type: "progress"; step: ProgressStep; message: string }
  | { type: "plan"; plan: Plan; cached: boolean }
  | { type: "error"; code: ErrorCode; message: string; retryable: boolean };

export type ErrorCode = "provider" | "invalid-output" | "invalid-request" | "internal";

/** Generic, user-safe messages. Details go to server logs only. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  provider: "We couldn't reach the planning service. Please try again in a moment.",
  "invalid-output": "The plan came back incomplete. Please try again.",
  "invalid-request": "Some details need another look before we can plan this.",
  internal: "Something went wrong on our side. Please try again.",
};

export function toErrorEvent(error: unknown): Extract<PlanEvent, { type: "error" }> {
  if (error instanceof AiProviderError) {
    console.error("[ai] provider error", {
      status: error.status,
      message: error.message,
    });
    return {
      type: "error",
      code: "provider",
      message: ERROR_MESSAGES.provider,
      retryable: true,
    };
  }
  if (error instanceof AiOutputError) {
    console.error("[ai] invalid output after repair", { issues: error.issues });
    return {
      type: "error",
      code: "invalid-output",
      message: ERROR_MESSAGES["invalid-output"],
      retryable: true,
    };
  }
  if (error instanceof PatchError || error instanceof RangeError) {
    return {
      type: "error",
      code: "invalid-request",
      message: error.message,
      retryable: false,
    };
  }
  console.error("[plan] unexpected error", error);
  return {
    type: "error",
    code: "internal",
    message: ERROR_MESSAGES.internal,
    retryable: true,
  };
}

const planCache = new LruCache<Plan>({ maxEntries: 200, ttlMs: 60 * 60 * 1000 });
const ideasCache = new LruCache<Idea[]>({ maxEntries: 500, ttlMs: 60 * 60 * 1000 });

/** Test-only. */
export function clearPlanCaches(): void {
  planCache.clear();
  ideasCache.clear();
}

/** Minimal async queue so callbacks inside generation can feed a generator. */
function createChannel<T>() {
  const items: T[] = [];
  let wake: (() => void) | null = null;
  let closed = false;
  return {
    push(item: T) {
      items.push(item);
      wake?.();
    },
    close() {
      closed = true;
      wake?.();
    },
    async *drain(): AsyncGenerator<T> {
      while (true) {
        while (items.length > 0) yield items.shift() as T;
        if (closed) return;
        await new Promise<void>((resolve) => (wake = resolve));
        wake = null;
      }
    },
  };
}

/** Which sections have started appearing in the partial JSON text. */
export function sectionsSeen(text: string): PlanSection[] {
  return PLAN_SECTIONS.filter((section) => new RegExp(`"${section}"\\s*:`).test(text));
}

export interface ServiceOptions {
  provider: AiProvider;
  today: string;
  now?: Date;
  signal?: AbortSignal;
  newId?: () => string;
}

/**
 * Generates a plan, yielding progress events as sections arrive and finally
 * the validated plan. Never throws: failures become an `error` event.
 */
export async function* streamPlan(
  input: EventInput,
  { provider, today, now = new Date(), signal, newId = randomUUID }: ServiceOptions,
): AsyncGenerator<PlanEvent> {
  const progress = (step: ProgressStep): PlanEvent => ({
    type: "progress",
    step,
    message: PROGRESS_MESSAGES[step],
  });
  yield progress("start");

  const { date: eventDate, flexible } = resolveEventDate(input.date, today);
  const key = hashKey({
    v: 1,
    kind: "plan",
    model: `${provider.name}:${provider.model}`,
    input,
    today,
  });
  const hit = planCache.get(key);
  if (hit) {
    yield progress("finalize");
    yield {
      type: "plan",
      plan: { ...hit, id: newId(), createdAt: now.toISOString() },
      cached: true,
    };
    return;
  }

  const channel = createChannel<PlanEvent>();
  const announced = new Set<PlanSection>();

  const work = (async () => {
    const draft = await generateStructured({
      provider,
      schema: PlanDraftSchema,
      signal,
      task: {
        system: SYSTEM_PROMPT,
        prompt: buildPlanPrompt({
          input,
          today,
          eventDate,
          daysAvailable: diffDays(today, eventDate),
          flexible,
        }),
        schema: toProviderSchema(PlanDraftSchema),
        context: { kind: "plan", input, today },
        maxOutputTokens: 8192,
      },
      onText: (text) => {
        for (const section of sectionsSeen(text)) {
          if (!announced.has(section)) {
            announced.add(section);
            channel.push(progress(section));
          }
        }
      },
      onRepair: () => channel.push(progress("repair")),
    });
    channel.push(progress("finalize"));
    const plan = planFromDraft(draft, input, {
      id: newId(),
      today,
      now,
      eventDate,
      flexible,
    });
    planCache.set(key, plan);
    channel.push({ type: "plan", plan, cached: false });
  })()
    .catch((error: unknown) => channel.push(toErrorEvent(error)))
    .finally(() => channel.close());

  yield* channel.drain();
  await work;
}

export interface RefineResult {
  explanation: string;
  patch: PlanPatch;
  plan: Plan;
  changes: PlanChange[];
}

export async function refinePlan(
  plan: Plan,
  instruction: string,
  { provider, today, signal }: ServiceOptions,
): Promise<RefineResult> {
  const patch = await generateStructured({
    provider,
    schema: PlanPatchSchema,
    signal,
    task: {
      system: SYSTEM_PROMPT,
      prompt: buildRefinePrompt(plan, instruction, today),
      schema: toProviderSchema(PlanPatchSchema),
      context: { kind: "refine", plan, instruction, today },
      maxOutputTokens: 4096,
    },
  });
  const updated = applyPatch(plan, patch, today);
  return {
    explanation: patch.explanation,
    patch,
    plan: updated,
    changes: diffPlans(plan, updated),
  };
}

/** New ideas for one category only ("More like this"), never repeating existing titles. */
export async function moreIdeas(
  plan: Plan,
  category: IdeaCategory,
  { provider, signal }: ServiceOptions,
): Promise<Idea[]> {
  const existing = plan.ideas.map((i) => i.title);
  const key = hashKey({
    v: 1,
    kind: "ideas",
    model: `${provider.name}:${provider.model}`,
    category,
    existing,
    eventType: plan.eventType,
    location: plan.location,
    vibes: plan.vibes,
    total: plan.totalBudget,
    guests: plan.guestCount,
  });
  const hit = ideasCache.get(key);
  if (hit) return hit;

  const draft = await generateStructured({
    provider,
    schema: IdeasDraftSchema,
    signal,
    task: {
      system: SYSTEM_PROMPT,
      prompt: buildIdeasPrompt(plan, category, existing, plan.vibes),
      schema: toProviderSchema(IdeasDraftSchema),
      context: { kind: "ideas", plan, category, excludeTitles: existing },
      maxOutputTokens: 1500,
    },
  });
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  const fresh = draft.ideas.filter((idea) => {
    const title = idea.title.toLowerCase();
    if (idea.category !== category || seen.has(title)) return false;
    seen.add(title);
    return true;
  });
  const ideas = ideasFromDraft(
    fresh,
    uniqueIdFactory(
      "idea",
      plan.ideas.map((i) => i.id),
    ),
  );
  ideasCache.set(key, ideas);
  return ideas;
}
