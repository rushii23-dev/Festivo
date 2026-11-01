/**
 * The contract of POST /api/plan's NDJSON stream, shared by the server that
 * writes it and the browser that reads it: the sections a plan is built in,
 * the progress steps and their messages, the error codes and the event schema.
 * Isomorphic on purpose, so neither side can drift from the other.
 */
import { z } from "zod";
import { PlanSchema } from "@/lib/schemas/plan";

/** The sections of a generated plan, in the order the model writes them. */
export const PLAN_SECTIONS = [
  "budget",
  "timeline",
  "vendors",
  "ideas",
  "summary",
] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number];

export const SECTION_LABELS: Record<PlanSection, string> = {
  budget: "Budget",
  timeline: "Timeline",
  vendors: "Vendors",
  ideas: "Ideas",
  summary: "Summary",
};

export const PROGRESS_STEPS = ["start", ...PLAN_SECTIONS, "repair", "finalize"] as const;
export type ProgressStep = (typeof PROGRESS_STEPS)[number];

export const PROGRESS_MESSAGES: Record<ProgressStep, string> = {
  start: "Reading your answers…",
  budget: "Crunching your budget…",
  timeline: "Drafting your timeline…",
  vendors: "Lining up vendors…",
  ideas: "Dreaming up ideas…",
  summary: "Writing your summary…",
  repair: "Tidying up a few details…",
  finalize: "Checking every number…",
};

export function isPlanSection(step: ProgressStep): step is PlanSection {
  return (PLAN_SECTIONS as readonly string[]).includes(step);
}

export const ERROR_CODES = [
  "provider",
  "invalid-output",
  "invalid-request",
  "internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Generic, user-safe messages. Details go to server logs only. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  provider: "We couldn't reach the planning service. Please try again in a moment.",
  "invalid-output": "The plan came back incomplete. Please try again.",
  "invalid-request": "Some details need another look before we can plan this.",
  internal: "Something went wrong on our side. Please try again.",
};

const ProgressEventSchema = z.object({
  type: z.literal("progress"),
  step: z.enum(PROGRESS_STEPS),
  message: z.string(),
});

const PlanReadyEventSchema = z.object({
  type: z.literal("plan"),
  plan: PlanSchema,
  cached: z.boolean(),
});

const ErrorEventSchema = z.object({
  type: z.literal("error"),
  code: z.enum(ERROR_CODES),
  message: z.string(),
  retryable: z.boolean(),
});

/** One line of the stream. The browser parses every line with this schema. */
export const PlanEventSchema = z.discriminatedUnion("type", [
  ProgressEventSchema,
  PlanReadyEventSchema,
  ErrorEventSchema,
]);
export type PlanEvent = z.infer<typeof PlanEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;
