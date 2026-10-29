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
      if (!draft.occasion) {
        set(
          draft.group ? "occasion" : "group",
          draft.group
            ? "Choose the occasion you're planning."
            : "Choose the kind of event you're planning.",
        );
      }
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
      const questions = draftQuestions(draft);
      if (questions.multiDay) {
        const days = parseGuestCount(draft.days);
        if (days === null) set("days", "Use a whole number of days, like 2.");
        else set("days", firstMessage(DetailsSchema.shape.days.safeParse(days)));
      }
      set("location", firstMessage(shape.location.safeParse(draft.location)));
      const guests = parseGuestCount(draft.guestCount);
      if (draft.guestCount.trim() === "")
        set("guestCount", "Enter how many guests you expect.");
      else if (guests === null) set("guestCount", "Use a whole number, like 120.");
      else set("guestCount", firstMessage(shape.guestCount.safeParse(guests)));
      if (questions.age && draft.ageTurning.trim() !== "") {
        const age = parseGuestCount(draft.ageTurning);
        if (age === null) set("ageTurning", "Use a whole number, like 7.");
        else
          set("ageTurning", firstMessage(DetailsSchema.shape.ageTurning.safeParse(age)));
      }
      break;
    }

    case "budget": {
      const total = parseMoneyInput(draft.budgetTotal);
      if (draft.budgetTotal.trim() === "") set("budgetTotal", "Enter your total budget.");
      else if (total === null) set("budgetTotal", "Use numbers only, like 250000.");
      else {
        set("budgetTotal", firstMessage(BudgetInputSchema.shape.total.safeParse(total)));
      }
      if (draftQuestions(draft).tickets && draft.tickets !== "none") {
        if (draft.tickets === "paid") {
          const price = parseMoneyInput(draft.ticketPrice);
          if (draft.ticketPrice.trim() === "")
            set("ticketPrice", "Enter a ticket price.");
          else if (price === null) set("ticketPrice", "Use numbers only, like 499.");
          else
            set("ticketPrice", firstMessage(TicketsSchema.shape.price.safeParse(price)));
        }
        if (draft.capacity.trim() !== "") {
          const capacity = parseGuestCount(draft.capacity);
          if (capacity === null) set("capacity", "Use a whole number, like 80.");
          else
            set(
              "capacity",
              firstMessage(TicketsSchema.shape.capacity.safeParse(capacity)),
            );
        }
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
