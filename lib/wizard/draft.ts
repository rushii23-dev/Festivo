/**
 * The wizard's working state and per-step validation. The draft holds raw
 * form values (strings for typed-in numbers) so half-finished answers survive
 * a refresh; `toEventInput` turns a complete draft into validated API input.
 * Messages come from the same Zod schemas the API uses.
 */
import { z } from "zod";
import { parseMoneyInput } from "@/lib/budget/format";
import {
  AccessibilityNeedSchema,
  BudgetCategorySchema,
  CeremonySchema,
  CurrencySchema,
  DEFAULT_CURRENCY,
  DietaryNeedSchema,
  EventTypeSchema,
  SettingSchema,
  VibeSchema,
  type EventType,
} from "@/lib/schemas/common";
import {
  BudgetInputSchema,
  ConstraintsSchema,
  EventInputSchema,
  LIMITS,
  type EventDate,
  type EventInput,
} from "@/lib/schemas/eventInput";
import { eventDateProblem } from "@/lib/timeline/resolveDate";

export const WizardDraftSchema = z.object({
  eventType: EventTypeSchema.or(z.literal("")),
  name: z.string().max(200),
  dateKind: z.enum(["fixed", "flexible"]),
  date: z.string().max(20),
  month: z.string().max(10),
  location: z.string().max(200),
  guestCount: z.string().max(10),
  budgetTotal: z.string().max(20),
  currency: CurrencySchema,
  priorities: z.partialRecord(BudgetCategorySchema, z.int().min(1).max(5)),
  vibes: z.array(VibeSchema).max(10),
  ceremonies: z.array(CeremonySchema).max(5),
  dietary: z.array(DietaryNeedSchema).max(8),
  accessibility: z.array(AccessibilityNeedSchema).max(7),
  setting: SettingSchema,
  mustHaves: z.string().max(1000),
  mustAvoid: z.string().max(1000),
});
export type WizardDraft = z.infer<typeof WizardDraftSchema>;
export type DraftField = keyof WizardDraft;

export const DEFAULT_DRAFT: Readonly<WizardDraft> = Object.freeze({
  eventType: "",
  name: "",
  dateKind: "fixed",
  date: "",
  month: "",
  location: "",
  guestCount: "",
  budgetTotal: "",
  currency: DEFAULT_CURRENCY,
  priorities: {},
  vibes: [],
  ceremonies: [],
  dietary: [],
  accessibility: [],
  setting: "either",
  mustHaves: "",
  mustAvoid: "",
});

export const STEPS = [
  { id: "type", title: "What are you celebrating?", label: "Event type" },
  { id: "basics", title: "The basics", label: "Basics" },
  { id: "budget", title: "Your budget", label: "Budget" },
  { id: "vibe", title: "Vibe and style", label: "Vibe" },
  { id: "constraints", title: "Needs and limits", label: "Needs" },
  { id: "review", title: "Review and generate", label: "Review" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

/** Fields each step owns, in on-screen order (first invalid one gets focus). */
export const STEP_FIELDS: Record<StepId, DraftField[]> = {
  type: ["eventType"],
  basics: ["name", "date", "month", "location", "guestCount"],
  budget: ["budgetTotal", "currency", "priorities"],
  vibe: ["vibes", "ceremonies"],
  constraints: ["dietary", "accessibility", "setting", "mustHaves", "mustAvoid"],
  review: [],
};

export type FieldErrors = Partial<Record<DraftField, string>>;

const firstMessage = (result: z.ZodSafeParseResult<unknown>): string | undefined =>
  result.success ? undefined : result.error.issues[0]?.message;

const shape = EventInputSchema.shape;

export function draftEventDate(draft: WizardDraft): EventDate {
  if (draft.dateKind === "fixed") return { kind: "fixed", date: draft.date };
  return draft.month ? { kind: "flexible", month: draft.month } : { kind: "flexible" };
}

export function parseGuestCount(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/** Validates one step. Errors are keyed by field, in the step's field order. */
export function validateStep(
  step: StepId,
  draft: WizardDraft,
  today: string,
): FieldErrors {
  const errors: FieldErrors = {};
  const set = (field: DraftField, message: string | undefined) => {
    if (message && !errors[field]) errors[field] = message;
  };

  switch (step) {
    case "type":
      if (!draft.eventType) set("eventType", "Choose the kind of event you're planning.");
      break;

    case "basics": {
      set("name", firstMessage(shape.name.safeParse(draft.name)));
      if (draft.dateKind === "fixed") {
        if (!draft.date) set("date", "Pick a date, or choose “My date is flexible”.");
        else {
          const parsed = shape.date.safeParse(draftEventDate(draft));
          set(
            "date",
            firstMessage(parsed) ??
              eventDateProblem(draftEventDate(draft), today) ??
              undefined,
          );
        }
      } else if (draft.month) {
        set("month", eventDateProblem(draftEventDate(draft), today) ?? undefined);
      }
      set("location", firstMessage(shape.location.safeParse(draft.location)));
      const guests = parseGuestCount(draft.guestCount);
      if (draft.guestCount.trim() === "")
        set("guestCount", "Enter how many guests you expect.");
      else if (guests === null) set("guestCount", "Use a whole number, like 120.");
      else set("guestCount", firstMessage(shape.guestCount.safeParse(guests)));
      break;
    }

    case "budget": {
      const total = parseMoneyInput(draft.budgetTotal);
      if (draft.budgetTotal.trim() === "") set("budgetTotal", "Enter your total budget.");
      else if (total === null) set("budgetTotal", "Use numbers only, like 250000.");
      else {
        set("budgetTotal", firstMessage(BudgetInputSchema.shape.total.safeParse(total)));
      }
      break;
    }

    case "vibe":
      set("vibes", firstMessage(shape.vibes.safeParse(draft.vibes)));
      break;

    case "constraints":
      set(
        "mustHaves",
        firstMessage(ConstraintsSchema.shape.mustHaves.safeParse(draft.mustHaves)),
      );
      set(
        "mustAvoid",
        firstMessage(ConstraintsSchema.shape.mustAvoid.safeParse(draft.mustAvoid)),
      );
      break;

    case "review":
      break;
  }
  return errors;
}

/** First step (in order) that has errors, or null when every step is valid. */
export function firstInvalidStep(draft: WizardDraft, today: string): StepId | null {
  for (const step of STEPS) {
    if (Object.keys(validateStep(step.id, draft, today)).length > 0) return step.id;
  }
  return null;
}

export function toEventInput(
  draft: WizardDraft,
): { ok: true; input: EventInput } | { ok: false; issues: string[] } {
  const result = EventInputSchema.safeParse({
    eventType: draft.eventType,
    name: draft.name,
    date: draftEventDate(draft),
    location: draft.location,
    guestCount: parseGuestCount(draft.guestCount),
    budget: {
      total: parseMoneyInput(draft.budgetTotal),
      currency: draft.currency,
      priorities: draft.priorities,
    },
    vibes: draft.vibes,
    ceremonies: draft.eventType === "wedding" ? draft.ceremonies : [],
    constraints: {
      dietary: draft.dietary,
      accessibility: draft.accessibility,
      setting: draft.setting,
      mustHaves: draft.mustHaves,
      mustAvoid: draft.mustAvoid,
    },
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, issues: result.error.issues.map((i) => i.message) };
}

/** Switching event type drops priorities for categories the new type doesn't use. */
export function withEventType(draft: WizardDraft, eventType: EventType): WizardDraft {
  if (draft.eventType === eventType) return draft;
  return {
    ...draft,
    eventType,
    priorities: {},
    ceremonies: eventType === "wedding" ? draft.ceremonies : [],
  };
}

/** The next 24 months as {value: "2027-03", label: "March 2027"}, for the flexible-date picker. */
export function upcomingMonths(today: string, count = 24, locale = "en-IN") {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const format = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(y, m - 1 + i, 1));
    return { value: date.toISOString().slice(0, 7), label: format.format(date) };
  });
}

export const FREE_TEXT_MAX = LIMITS.freeTextMax;

/** Adds the value if absent, removes it if present (for checkbox groups). */
export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
