/**
 * Plan use-cases on the server: generate (streamed), refine, and "more like
 * this". Provider-agnostic; every AI reply is validated, repaired once if
 * needed, converted by deterministic code, and cached.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { createChannel } from "@/lib/async/channel";
import { LruCache, hashKey } from "@/lib/cache/lru";
import { createSingleFlight } from "@/lib/cache/singleFlight";
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
import {
  ERROR_MESSAGES,
  PLAN_SECTIONS,
  PROGRESS_MESSAGES,
  type ErrorCode,
  type ErrorEvent,
  type PlanEvent,
  type PlanSection,
  type ProgressStep,
} from "./events";
import { ideasFromDraft, planFromDraft } from "./fromDraft";
import { uniqueIdFactory, uniqueTitleFilter } from "./ids";
import { PatchError, applyPatch } from "./patch";

const CACHE_TTL_MS = 60 * 60 * 1000;

/** Output budgets per task: a whole plan, a patch to one, a handful of ideas. */
const MAX_OUTPUT_TOKENS = { plan: 8192, refine: 4096, ideas: 1500 } as const;

function errorEvent(
  code: ErrorCode,
  { message = ERROR_MESSAGES[code], retryable = true } = {},
): ErrorEvent {
  return { type: "error", code, message, retryable };
}

/**
 * Maps any failure to a user-safe error event. Provider and internal details
 * are logged here and never sent; only a refused edit explains itself, because
 * its message was written for the planner.
 */
export function toErrorEvent(error: unknown): ErrorEvent {
  if (error instanceof AiProviderError) {
    console.error("[ai] provider error", {
      status: error.status,
      message: error.message,
    });
    return errorEvent("provider");
  }
  if (error instanceof AiOutputError) {
    console.error("[ai] invalid output after repair", { issues: error.issues });
    return errorEvent("invalid-output");
  }
  if (error instanceof PatchError || error instanceof RangeError) {
    return errorEvent("invalid-request", { message: error.message, retryable: false });
  }
  console.error("[plan] unexpected error", error);
  return errorEvent("internal");
}

const planCache = new LruCache<Plan>({ maxEntries: 200, ttlMs: CACHE_TTL_MS });
const ideasCache = new LruCache<Idea[]>({ maxEntries: 500, ttlMs: CACHE_TTL_MS });
/** Identical requests that arrive while the first is still running share its AI call. */
const planFlights = createSingleFlight<Plan>();
const ideasFlights = createSingleFlight<Idea[]>();

/** Test-only. */
export function clearPlanCaches(): void {
  planCache.clear();
  ideasCache.clear();
  planFlights.clear();
  ideasFlights.clear();
}

/** Cache keys name the model, so switching models never serves another model's work. */
const modelKey = (provider: AiProvider) => `${provider.name}:${provider.model}`;

const progressEvent = (step: ProgressStep): PlanEvent => ({
  type: "progress",
  step,
  message: PROGRESS_MESSAGES[step],
});

/** Which sections have started appearing in the partial JSON text. */
export function sectionsSeen(text: string): PlanSection[] {
  return PLAN_SECTIONS.filter((section) => new RegExp(`"${section}"\\s*:`).test(text));
}

/** What every AI call needs. */
export interface AiCallOptions {
  provider: AiProvider;
  signal?: AbortSignal;
}

export interface ServiceOptions extends AiCallOptions {
  today: string;
  now?: Date;
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
  yield progressEvent("start");

  /** A plan someone else already paid for, under a new id so saved copies never collide. */
  const reuse = (plan: Plan): PlanEvent[] => [
    progressEvent("finalize"),
    {
      type: "plan",
      plan: { ...plan, id: newId(), createdAt: now.toISOString() },
      cached: true,
    },
  ];

  const { date: eventDate, flexible } = resolveEventDate(input.date, today);
  const key = hashKey({ v: 1, kind: "plan", model: modelKey(provider), input, today });
  const hit = planCache.get(key);
  if (hit) {
    yield* reuse(hit);
    return;
  }

  const channel = createChannel<PlanEvent>();
  const announced = new Set<PlanSection>();
  const announceSections = (text: string) => {
    for (const section of sectionsSeen(text)) {
      if (announced.has(section)) continue;
      announced.add(section);
      channel.push(progressEvent(section));
    }
  };

  const generate = async (): Promise<Plan> => {
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
        maxOutputTokens: MAX_OUTPUT_TOKENS.plan,
      },
      onText: announceSections,
      onRepair: () => channel.push(progressEvent("repair")),
    });
    channel.push(progressEvent("finalize"));
    const plan = planFromDraft(draft, input, {
      id: newId(),
      today,
      now,
      eventDate,
      flexible,
    });
    planCache.set(key, plan);
    return plan;
  };

  const flight = planFlights.run(key, generate);
  if (flight.shared) {
    // The same plan is already being generated: wait for it rather than call the AI again.
    const plan = await flight.promise.catch(() => null);
    if (plan) {
      yield* reuse(plan);
      return;
    }
    // That request failed or was cancelled; this one still gets its own attempt.
  }

  const work = (flight.shared ? generate() : flight.promise)
    .then(
      (plan) => channel.push({ type: "plan", plan, cached: false }),
      (error: unknown) => channel.push(toErrorEvent(error)),
    )
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
  const ask = (pastDate?: string) =>
    generateStructured({
      provider,
      schema: PlanPatchSchema,
      signal,
      task: {
        system: SYSTEM_PROMPT,
        prompt: buildRefinePrompt(plan, instruction, today, pastDate),
        schema: toProviderSchema(PlanPatchSchema),
        context: { kind: "refine", plan, instruction, today },
        maxOutputTokens: MAX_OUTPUT_TOKENS.refine,
      },
    });
  let patch = await ask();
  // Models sometimes add a date nobody asked for. Ask once more, naming it; if the
  // planner really asked for a past date, applyPatch refuses it in plain words.
  if (patch.date && patch.date <= today) patch = await ask(patch.date);
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
  { provider, signal }: AiCallOptions,
): Promise<Idea[]> {
  const existing = plan.ideas.map((i) => i.title);
  const key = hashKey({
    v: 1,
    kind: "ideas",
    model: modelKey(provider),
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

  const generate = async (): Promise<Idea[]> => {
    const draft = await generateStructured({
      provider,
      schema: IdeasDraftSchema,
      signal,
      task: {
        system: SYSTEM_PROMPT,
        prompt: buildIdeasPrompt(plan, category, existing, plan.vibes),
        schema: toProviderSchema(IdeasDraftSchema),
        context: { kind: "ideas", plan, category, excludeTitles: existing },
        maxOutputTokens: MAX_OUTPUT_TOKENS.ideas,
      },
    });
    const isNewTitle = uniqueTitleFilter(existing);
    const fresh = draft.ideas.filter(
      (idea) => idea.category === category && isNewTitle(idea.title),
    );
    const ideas = ideasFromDraft(
      fresh,
      uniqueIdFactory(
        "idea",
        plan.ideas.map((i) => i.id),
      ),
    );
    ideasCache.set(key, ideas);
    return ideas;
  };

  const flight = ideasFlights.run(key, generate);
  // A joined request that fails gets its own attempt, like a fresh one would.
  return flight.shared ? flight.promise.catch(generate) : flight.promise;
}
