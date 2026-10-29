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
  FormatSchema,
  IsoDateSchema,
  OccasionSchema,
  SettingSchema,
  TicketPricingSchema,
  VibeSchema,
  textField,
} from "./common";
import { OCCASION_INFO } from "@/lib/events/occasions";

export const LIMITS = {
  nameMax: 80,
  locationMax: 80,
  freeTextMax: 500,
  guestsMin: 1,
  guestsMax: 5000,
  budgetMin: 1,
  budgetMax: 1_000_000_000,
  vibesMax: 6,
  ageMax: 120,
  daysMax: 10,
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

/** Asked only for occasions that sell or hand out tickets. */
export const TicketsSchema = z.strictObject({
  pricing: TicketPricingSchema,
  /** Price per ticket, in the budget's currency; only for paid tickets. */
  price: z
    .number({ error: "Enter a ticket price." })
    .finite()
    .min(1, { error: "A paid ticket costs more than zero." })
    .max(LIMITS.budgetMax, { error: "That ticket price is too large." })
    .optional(),
  capacity: z
    .int({ error: "Capacity must be a whole number." })
    .min(1, { error: "Allow at least one spot." })
    .max(LIMITS.guestsMax, {
      error: `Festivo plans for up to ${LIMITS.guestsMax} guests.`,
    })
    .optional(),
  approval: z.boolean().default(false),
});
export type Tickets = z.infer<typeof TicketsSchema>;

/** Occasion-specific answers: each is asked only where it applies. */
export const DetailsSchema = z.strictObject({
  ageTurning: z
    .int({ error: "Use a whole number, like 7." })
    .min(1, { error: "Use an age of 1 or more." })
    .max(LIMITS.ageMax, { error: `Use an age up to ${LIMITS.ageMax}.` })
    .optional(),
  kids: z.boolean().optional(),
  days: z
    .int({ error: "Use a whole number of days." })
    .min(1, { error: "An event runs at least one day." })
    .max(LIMITS.daysMax, { error: `Festivo plans up to ${LIMITS.daysMax} days.` })
    .optional(),
});
export type Details = z.infer<typeof DetailsSchema>;

export const EventInputSchema = z
  .strictObject({
    eventType: EventTypeSchema,
    /** The specific occasion; optional so older clients and plans keep working. */
    occasion: OccasionSchema.optional(),
    format: FormatSchema.default("in-person"),
    tickets: TicketsSchema.optional(),
    details: DetailsSchema.default({}),
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
  })
  .superRefine((input, ctx) => {
    if (!input.occasion) return;
    const occasion = OCCASION_INFO[input.occasion];
    if (occasion.eventType !== input.eventType)
      ctx.addIssue({
        code: "custom",
        path: ["occasion"],
        message: "Occasion and event type disagree.",
      });
    if (!occasion.formats.includes(input.format))
      ctx.addIssue({
        code: "custom",
        path: ["format"],
        message: "That format is not offered for this occasion.",
      });
    if (input.tickets && !occasion.tickets)
      ctx.addIssue({
        code: "custom",
        path: ["tickets"],
        message: "This occasion has no tickets.",
      });
    if (input.tickets?.pricing === "paid" && input.tickets.price === undefined)
      ctx.addIssue({
        code: "custom",
        path: ["tickets", "price"],
        message: "Enter a ticket price.",
      });
  });

/** Parsed (defaults applied) input. */
export type EventInput = z.infer<typeof EventInputSchema>;
/** What a client may send (defaults optional). */
export type EventInputDraft = z.input<typeof EventInputSchema>;
