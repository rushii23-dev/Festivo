/**
 * What the wizard collects and /api/plan accepts. Objects are strict, so unknown
 * fields are rejected rather than silently passed to the AI.
 */
import { z } from "zod";
import {
  AccessibilityNeedSchema,
  BudgetCategorySchema,
  CeremonySchema,
  CurrencySchema,
  DietaryNeedSchema,
  EventTypeSchema,
  IsoDateSchema,
  SettingSchema,
  VibeSchema,
  textField,
} from "./common";

export const LIMITS = {
  nameMax: 80,
  locationMax: 80,
  freeTextMax: 500,
  guestsMin: 1,
  guestsMax: 5000,
  budgetMin: 1,
  budgetMax: 1_000_000_000,
  vibesMax: 6,
} as const;

export const EventDateSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("fixed"), date: IsoDateSchema }),
  z.strictObject({
    kind: z.literal("flexible"),
    /** Preferred month, e.g. "2027-03". Optional: without it we plan ~3 months out. */
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Use a month like 2027-03." })
      .optional(),
  }),
]);
export type EventDate = z.infer<typeof EventDateSchema>;

/** Category weight from 1 (spend less) to 5 (spend more). 3 is neutral. */
export const PrioritySchema = z.int().min(1).max(5);

export const BudgetInputSchema = z.strictObject({
  total: z
    .number({ error: "Enter a budget amount." })
    .finite()
    .min(LIMITS.budgetMin, { error: "Budget must be more than zero." })
    .max(LIMITS.budgetMax, { error: "That budget is too large to plan with." }),
  currency: CurrencySchema,
  priorities: z.partialRecord(BudgetCategorySchema, PrioritySchema).default({}),
});

export const ConstraintsSchema = z.strictObject({
  dietary: z.array(DietaryNeedSchema).max(8).default([]),
  accessibility: z.array(AccessibilityNeedSchema).max(7).default([]),
  setting: SettingSchema.default("either"),
  mustHaves: textField(LIMITS.freeTextMax, "Must-haves").default(""),
  mustAvoid: textField(LIMITS.freeTextMax, "Must-avoids").default(""),
});

export const EventInputSchema = z.strictObject({
  eventType: EventTypeSchema,
  name: textField(LIMITS.nameMax, "Event name").min(1, {
    error: "Give your event a name.",
  }),
  date: EventDateSchema,
  location: textField(LIMITS.locationMax, "Location").min(2, {
    error: "Enter a city or place.",
  }),
  guestCount: z
    .int({ error: "Guest count must be a whole number." })
    .min(LIMITS.guestsMin, { error: "Invite at least one guest." })
    .max(LIMITS.guestsMax, {
      error: `Festivo plans for up to ${LIMITS.guestsMax} guests.`,
    }),
  budget: BudgetInputSchema,
  vibes: z
    .array(VibeSchema)
    .max(LIMITS.vibesMax, { error: `Pick up to ${LIMITS.vibesMax} styles.` })
    .default([]),
  ceremonies: z.array(CeremonySchema).max(5).default([]),
  constraints: ConstraintsSchema.default({
    dietary: [],
    accessibility: [],
    setting: "either",
    mustHaves: "",
    mustAvoid: "",
  }),
});

/** Parsed (defaults applied) input. */
export type EventInput = z.infer<typeof EventInputSchema>;
/** What a client may send (defaults optional). */
export type EventInputDraft = z.input<typeof EventInputSchema>;
