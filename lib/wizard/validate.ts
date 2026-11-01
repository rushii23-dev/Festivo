/**
 * Per-step validation for the wizard. Messages come from the same Zod schemas
 * the API uses, plus a few phrased for typed-in numbers. Each step checks only
 * the questions the current answers make relevant.
 */
import type { z } from "zod";
import { parseMoneyInput } from "@/lib/budget/format";
import {
  BudgetInputSchema,
  ConstraintsSchema,
  DetailsSchema,
  EventInputSchema,
  TicketsSchema,
} from "@/lib/schemas/eventInput";
import { eventDateProblem } from "@/lib/timeline/resolveDate";
import {
  STEPS,
  draftEventDate,
  draftQuestions,
  parseWholeNumber,
  type DraftField,
  type StepId,
  type WizardDraft,
} from "./draft";

export type FieldErrors = Partial<Record<DraftField, string>>;

/** Records a field's first problem; `undefined` means the field is fine. */
type SetError = (field: DraftField, message: string | undefined) => void;
type StepValidator = (draft: WizardDraft, today: string, set: SetError) => void;

const shape = EventInputSchema.shape;

const firstMessage = (result: z.ZodSafeParseResult<unknown>): string | undefined =>
  result.success ? undefined : result.error.issues[0]?.message;

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

const NUMBER_RULES = {
  days: {
    parse: parseWholeNumber,
    missing: "Use a whole number of days, like 2.",
    invalid: "Use a whole number of days, like 2.",
    schema: DetailsSchema.shape.days,
  },
  guestCount: {
    parse: parseWholeNumber,
    missing: "Enter how many guests you expect.",
    invalid: "Use a whole number, like 120.",
    schema: shape.guestCount,
  },
  ageTurning: {
    parse: parseWholeNumber,
    invalid: "Use a whole number, like 7.",
    schema: DetailsSchema.shape.ageTurning,
  },
  budgetTotal: {
    parse: parseMoneyInput,
    missing: "Enter your total budget.",
    invalid: "Use numbers only, like 250000.",
    schema: BudgetInputSchema.shape.total,
  },
  ticketPrice: {
    parse: parseMoneyInput,
    missing: "Enter a ticket price.",
    invalid: "Use numbers only, like 499.",
    schema: TicketsSchema.shape.price,
  },
  capacity: {
    parse: parseWholeNumber,
    invalid: "Use a whole number, like 80.",
    schema: TicketsSchema.shape.capacity,
  },
} satisfies Partial<Record<DraftField, NumberRule>>;

type NumberField = keyof typeof NUMBER_RULES;

function checkNumber(draft: WizardDraft, field: NumberField, set: SetError) {
  const rule: NumberRule = NUMBER_RULES[field];
  const raw = draft[field];
  if (raw.trim() === "") {
    set(field, rule.missing);
    return;
  }
  const value = rule.parse(raw);
  set(field, value === null ? rule.invalid : firstMessage(rule.schema.safeParse(value)));
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
  if (questions.multiDay) checkNumber(draft, "days", set);
  set("location", firstMessage(shape.location.safeParse(draft.location)));
  checkNumber(draft, "guestCount", set);
  if (questions.age) checkNumber(draft, "ageTurning", set);
}

function validateBudget(draft: WizardDraft, _today: string, set: SetError) {
  checkNumber(draft, "budgetTotal", set);
  if (!draftQuestions(draft).tickets || draft.tickets === "none") return;
  if (draft.tickets === "paid") checkNumber(draft, "ticketPrice", set);
  checkNumber(draft, "capacity", set);
}

function validateVibe(draft: WizardDraft, _today: string, set: SetError) {
  set("vibes", firstMessage(shape.vibes.safeParse(draft.vibes)));
}

function validateConstraints(draft: WizardDraft, _today: string, set: SetError) {
  const { mustHaves, mustAvoid } = ConstraintsSchema.shape;
  set("mustHaves", firstMessage(mustHaves.safeParse(draft.mustHaves)));
  set("mustAvoid", firstMessage(mustAvoid.safeParse(draft.mustAvoid)));
}

const STEP_VALIDATORS: Record<StepId, StepValidator> = {
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
