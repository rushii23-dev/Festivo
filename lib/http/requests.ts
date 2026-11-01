/** Request bodies for the API routes. All strict: unknown fields are rejected. */
import { z } from "zod";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import { IdeaCategorySchema, PlanSchema } from "@/lib/schemas/plan";
import { TimeZoneSchema } from "./api";

/** Longest refine request, in characters. */
export const INSTRUCTION_MAX = 300;

export const PlanRequestSchema = z.strictObject({
  input: EventInputSchema,
  timeZone: TimeZoneSchema.optional(),
});

export const RefineRequestSchema = z.strictObject({
  plan: PlanSchema,
  instruction: z
    .string()
    .trim()
    .min(1, { error: "Tell Festivo what to change." })
    .max(INSTRUCTION_MAX, { error: `Keep requests to ${INSTRUCTION_MAX} characters.` }),
  timeZone: TimeZoneSchema.optional(),
});

export const IdeasRequestSchema = z.strictObject({
  plan: PlanSchema,
  category: IdeaCategorySchema,
});

export const BODY_LIMITS = {
  plan: 16 * 1024,
  refine: 128 * 1024,
  ideas: 128 * 1024,
} as const;
