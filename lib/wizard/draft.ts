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
  FormatSchema,
  OccasionGroupSchema,
  OccasionSchema,
  SettingSchema,
  VibeSchema,
  type Occasion,
  type OccasionGroup,
} from "@/lib/schemas/common";
import type { PlanKind } from "@/lib/events/kind";
import { OCCASION_INFO, VIBES_BY_GROUP, type OccasionInfo } from "@/lib/events/occasions";
import {
  BudgetInputSchema,
  ConstraintsSchema,
  DetailsSchema,
  EventInputSchema,
  TicketsSchema,
  LIMITS,
  type EventDate,
  type EventInput,
} from "@/lib/schemas/eventInput";
import { eventDateProblem } from "@/lib/timeline/resolveDate";

/** "none": no registration; "free" or "paid": guests register for a ticket. */
export const TICKET_CHOICES = ["none", "free", "paid"] as const;
export type TicketChoice = (typeof TICKET_CHOICES)[number];

export const WizardDraftSchema = z.object({
  eventType: EventTypeSchema.or(z.literal("")),
  group: OccasionGroupSchema.or(z.literal("")),
  occasion: OccasionSchema.or(z.literal("")),
  format: FormatSchema,
  name: z.string().max(200),
  dateKind: z.enum(["fixed", "flexible"]),
  date: z.string().max(20),
  month: z.string().max(10),
  location: z.string().max(200),
  guestCount: z.string().max(10),
  days: z.string().max(4),
  ageTurning: z.string().max(4),
  kids: z.boolean(),
  tickets: z.enum(TICKET_CHOICES),
  ticketPrice: z.string().max(20),
  capacity: z.string().max(10),
  approval: z.boolean(),
  budgetTotal: z.string().max(20),
  currency: CurrencySchema,
  priorities: z.partialRecord(BudgetCategorySchema, z.int().min(1).max(5)),
  vibes: z.array(VibeSchema).max(14),
  ceremonies: z.array(CeremonySchema).max(5),
  dietary: z.array(DietaryNeedSchema).max(8),
  accessibility: z.array(AccessibilityNeedSchema).max(8),
  setting: SettingSchema,
  mustHaves: z.string().max(1000),
  mustAvoid: z.string().max(1000),
});
export type WizardDraft = z.infer<typeof WizardDraftSchema>;
export type DraftField = keyof WizardDraft;

export const DEFAULT_DRAFT: Readonly<WizardDraft> = Object.freeze({
  eventType: "",
  group: "",
  occasion: "",
  format: "in-person",
  name: "",
  dateKind: "fixed",
  date: "",
  month: "",
  location: "",
  guestCount: "",
  days: "1",
  ageTurning: "",
  kids: false,
  tickets: "none",
  ticketPrice: "",
  capacity: "",
  approval: false,
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
  { id: "type", title: "What are you celebrating?", label: "Occasion" },
  { id: "basics", title: "The basics", label: "Basics" },
  { id: "budget", title: "Your budget", label: "Budget" },
  { id: "vibe", title: "Vibe and style", label: "Vibe" },
  { id: "constraints", title: "Needs and limits", label: "Needs" },
  { id: "review", title: "Review and generate", label: "Review" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

/** Fields each step owns, in on-screen order (first invalid one gets focus). */
export const STEP_FIELDS: Record<StepId, DraftField[]> = {
  type: ["group", "occasion", "eventType"],
  basics: [
    "name",
    "date",
    "month",
    "days",
    "format",
    "location",
    "guestCount",
    "ageTurning",
    "kids",
  ],
  budget: ["budgetTotal", "currency", "tickets", "ticketPrice", "capacity", "priorities"],
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

/** The chosen occasion's rules, or null before one is chosen. */
export function draftOccasion(draft: WizardDraft): OccasionInfo | null {
  return draft.occasion ? OCCASION_INFO[draft.occasion] : null;
}

/** What the current answers make relevant: the wizard shows only these questions. */
export function draftQuestions(draft: WizardDraft) {
  const occasion = draftOccasion(draft);
  const online = draft.format === "online";
  return {
    formats: occasion?.formats ?? (["in-person"] as const),
    multiDay: Boolean(occasion?.multiDay),
    age: Boolean(occasion?.age),
    kids: Boolean(occasion?.kids),
    tickets: Boolean(occasion?.tickets),
    ceremonies: Boolean(occasion?.ceremonies),
    vibes: occasion ? VIBES_BY_GROUP[occasion.group] : VIBES_BY_GROUP.life,
    /** Food, indoor/outdoor and step-free questions only matter in person. */
    venue: !online,
  };
}

/** Accessibility needs that apply online. */
export const ONLINE_ACCESSIBILITY = [
  "live-captions",
  "sign-language",
  "large-print",
] as const;

type SetError = (field: DraftField, message: string | undefined) => void;

/** A number typed into a text field: how to read it and what to say when it is wrong. */
interface NumberRule {
  parse: (raw: string) => number | null;
  /** Shown when the field is empty; leave out for optional fields. */
  missing?: string;
  /** Shown when the text is not a number. */
  invalid: string;
  /** The schema's own limits (minimum, maximum). */
  schema: z.ZodType;
}

function numberProblem(raw: string, rule: NumberRule): string | undefined {
  if (raw.trim() === "") return rule.missing;
  const value = rule.parse(raw);
  return value === null ? rule.invalid : firstMessage(rule.schema.safeParse(value));
}

function validateType(draft: WizardDraft, _today: string, set: SetError) {
  if (draft.occasion) return;
  if (draft.group) set("occasion", "Choose the occasion you're planning.");
  else set("group", "Choose the kind of event you're planning.");
}

function validateDate(draft: WizardDraft, today: string, set: SetError) {
  if (draft.dateKind !== "fixed") {
    if (draft.month)
      set("month", eventDateProblem(draftEventDate(draft), today) ?? undefined);
    return;
  }
  if (!draft.date) {
    set("date", "Pick a date, or choose “My date is flexible”.");
    return;
  }
  const date = draftEventDate(draft);
  set(
    "date",
    firstMessage(shape.date.safeParse(date)) ??
      eventDateProblem(date, today) ??
      undefined,
  );
}

function validateBasics(draft: WizardDraft, today: string, set: SetError) {
  const questions = draftQuestions(draft);
  set("name", firstMessage(shape.name.safeParse(draft.name)));
  validateDate(draft, today, set);
  if (questions.multiDay) {
    set(
      "days",
      numberProblem(draft.days, {
        parse: parseGuestCount,
        missing: "Use a whole number of days, like 2.",
        invalid: "Use a whole number of days, like 2.",
        schema: DetailsSchema.shape.days,
      }),
    );
  }
  set("location", firstMessage(shape.location.safeParse(draft.location)));
  set(
    "guestCount",
    numberProblem(draft.guestCount, {
      parse: parseGuestCount,
      missing: "Enter how many guests you expect.",
      invalid: "Use a whole number, like 120.",
      schema: shape.guestCount,
    }),
  );
  if (questions.age) {
    set(
      "ageTurning",
      numberProblem(draft.ageTurning, {
        parse: parseGuestCount,
        invalid: "Use a whole number, like 7.",
        schema: DetailsSchema.shape.ageTurning,
      }),
    );
  }
}

function validateBudget(draft: WizardDraft, _today: string, set: SetError) {
  set(
    "budgetTotal",
    numberProblem(draft.budgetTotal, {
      parse: parseMoneyInput,
      missing: "Enter your total budget.",
      invalid: "Use numbers only, like 250000.",
      schema: BudgetInputSchema.shape.total,
    }),
  );
  if (!draftQuestions(draft).tickets || draft.tickets === "none") return;
  if (draft.tickets === "paid") {
    set(
      "ticketPrice",
      numberProblem(draft.ticketPrice, {
        parse: parseMoneyInput,
        missing: "Enter a ticket price.",
        invalid: "Use numbers only, like 499.",
        schema: TicketsSchema.shape.price,
      }),
    );
  }
  set(
    "capacity",
    numberProblem(draft.capacity, {
      parse: parseGuestCount,
      invalid: "Use a whole number, like 80.",
      schema: TicketsSchema.shape.capacity,
    }),
  );
}

function validateVibe(draft: WizardDraft, _today: string, set: SetError) {
  set("vibes", firstMessage(shape.vibes.safeParse(draft.vibes)));
}

function validateConstraints(draft: WizardDraft, _today: string, set: SetError) {
  const { mustHaves, mustAvoid } = ConstraintsSchema.shape;
  set("mustHaves", firstMessage(mustHaves.safeParse(draft.mustHaves)));
  set("mustAvoid", firstMessage(mustAvoid.safeParse(draft.mustAvoid)));
}

const STEP_VALIDATORS: Record<
  StepId,
  (draft: WizardDraft, today: string, set: SetError) => void
> = {
  type: validateType,
  basics: validateBasics,
  budget: validateBudget,
  vibe: validateVibe,
  constraints: validateConstraints,
  review: () => {},
};

/** Validates one step. Errors are keyed by field, in the step's field order. */
export function validateStep(
  step: StepId,
  draft: WizardDraft,
  today: string,
): FieldErrors {
  const errors: FieldErrors = {};
  STEP_VALIDATORS[step](draft, today, (field, message) => {
    if (message && !errors[field]) errors[field] = message;
  });
  return errors;
}

/** First step (in order) that has errors, or null when every step is valid. */
export function firstInvalidStep(draft: WizardDraft, today: string): StepId | null {
  for (const step of STEPS) {
    if (Object.keys(validateStep(step.id, draft, today)).length > 0) return step.id;
  }
  return null;
}

/** The kind of event the answers so far describe, for budget previews. */
export function draftKind(draft: WizardDraft): PlanKind {
  return {
    eventType: draft.eventType || "birthday",
    occasion: draft.occasion || undefined,
    format: draft.format,
    tickets: draftTickets(draft),
  };
}

/** Ticket answers as API input, or undefined when the event has no tickets. */
function draftTickets(draft: WizardDraft) {
  if (!draftQuestions(draft).tickets || draft.tickets === "none") return undefined;
  const capacity = parseGuestCount(draft.capacity);
  return {
    pricing: draft.tickets,
    ...(draft.tickets === "paid" ? { price: parseMoneyInput(draft.ticketPrice) } : {}),
    ...(capacity !== null ? { capacity } : {}),
    approval: draft.approval,
  };
}

function draftDetails(draft: WizardDraft) {
  const questions = draftQuestions(draft);
  const age = parseGuestCount(draft.ageTurning);
  const days = parseGuestCount(draft.days);
  return {
    ...(questions.age && age !== null ? { ageTurning: age } : {}),
    ...(questions.kids ? { kids: draft.kids } : {}),
    ...(questions.multiDay && days !== null ? { days } : {}),
  };
}

export function toEventInput(
  draft: WizardDraft,
): { ok: true; input: EventInput } | { ok: false; issues: string[] } {
  const questions = draftQuestions(draft);
  const online = !questions.venue;
  const tickets = draftTickets(draft);
  const result = EventInputSchema.safeParse({
    eventType: draft.eventType,
    ...(draft.occasion ? { occasion: draft.occasion } : {}),
    format: draft.format,
    ...(tickets ? { tickets } : {}),
    details: draftDetails(draft),
    name: draft.name,
    date: draftEventDate(draft),
    location: draft.location,
    guestCount: parseGuestCount(draft.guestCount),
    budget: {
      total: parseMoneyInput(draft.budgetTotal),
      currency: draft.currency,
      priorities: draft.priorities,
    },
    vibes: draft.vibes.filter((vibe) => questions.vibes.includes(vibe)),
    ceremonies: questions.ceremonies ? draft.ceremonies : [],
    constraints: {
      dietary: online ? [] : draft.dietary,
      accessibility: online
        ? draft.accessibility.filter((need) =>
            (ONLINE_ACCESSIBILITY as readonly string[]).includes(need),
          )
        : draft.accessibility,
      setting: online ? "either" : draft.setting,
      mustHaves: draft.mustHaves,
      mustAvoid: draft.mustAvoid,
    },
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, issues: result.error.issues.map((i) => i.message) };
}

/** Choosing a group clears an occasion from another group. */
export function withGroup(draft: WizardDraft, group: OccasionGroup): WizardDraft {
  if (draft.group === group) return draft;
  const keep = draft.occasion && OCCASION_INFO[draft.occasion].group === group;
  return keep ? { ...draft, group } : { ...draft, group, occasion: "", eventType: "" };
}

/**
 * Choosing an occasion sets its planning family and resets answers that no
 * longer apply: budget priorities (the categories change), a format it does
 * not offer, and wedding functions.
 */
export function withOccasion(draft: WizardDraft, occasion: Occasion): WizardDraft {
  if (draft.occasion === occasion) return draft;
  const info = OCCASION_INFO[occasion];
  return {
    ...draft,
    group: info.group,
    occasion,
    eventType: info.eventType,
    format: info.formats.includes(draft.format) ? draft.format : info.formats[0]!,
    priorities: {},
    ceremonies: info.ceremonies ? draft.ceremonies : [],
    tickets: info.tickets ? draft.tickets : "none",
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
