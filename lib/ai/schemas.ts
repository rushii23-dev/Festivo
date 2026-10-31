/**
 * What the model is asked to return. Deliberately smaller than the Plan:
 * the model writes content and rough numbers; code assigns IDs, computes
 * every date from `daysBefore`, and re-normalises the budget.
 */
import "server-only";
import { z } from "zod";
import { BudgetCategorySchema, IsoDateSchema, textField } from "@/lib/schemas/common";
import { LIMITS } from "@/lib/schemas/eventInput";
import { IdeaCategorySchema, VendorCategorySchema } from "@/lib/schemas/plan";

const Text = (max: number, label: string) => textField(max, label).min(1);
const CostTier = z.int().min(1).max(3);
const Money = z.number().min(0).max(LIMITS.budgetMax);

export const DraftBudgetItemSchema = z.strictObject({
  category: BudgetCategorySchema,
  amount: Money,
  rationale: Text(240, "Rationale"),
});

export const DraftTaskSchema = z.strictObject({
  title: Text(120, "Task title"),
  description: textField(400, "Task description"),
  /** Days before the event (0 = the day itself, negative = after). */
  daysBefore: z.int().min(-60).max(730),
  /** "HH:MM", only for tasks on the day itself. */
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
});

export const DraftVendorSchema = z.strictObject({
  category: VendorCategorySchema,
  questionsToAsk: z.array(Text(200, "Question")).min(2).max(6),
});

export const DraftIdeaSchema = z.strictObject({
  category: IdeaCategorySchema,
  title: Text(100, "Idea title"),
  description: Text(400, "Idea description"),
  costTier: CostTier,
});
export type DraftIdea = z.infer<typeof DraftIdeaSchema>;

/** Property order matters: the model writes sections in this order, which drives progress. */
export const PlanDraftSchema = z.strictObject({
  budget: z.array(DraftBudgetItemSchema).min(3).max(15),
  timeline: z.array(DraftTaskSchema).min(6).max(40),
  vendors: z.array(DraftVendorSchema).min(3).max(15),
  ideas: z.array(DraftIdeaSchema).min(5).max(25),
  summary: Text(800, "Summary"),
});
export type PlanDraft = z.infer<typeof PlanDraftSchema>;

/** May be empty: demo mode runs out of unseen ideas, and the UI says so. */
export const IdeasDraftSchema = z.strictObject({
  ideas: z.array(DraftIdeaSchema).max(5),
});
export type IdeasDraft = z.infer<typeof IdeasDraftSchema>;

/**
 * A refine patch may only touch these fields. Anything else the model invents
 * is rejected by the strict schema before the user ever sees a preview.
 */
export const PlanPatchSchema = z.strictObject({
  /** One or two sentences shown above the diff preview. */
  explanation: Text(300, "Explanation"),
  totalBudget: Money.min(1).optional(),
  date: IsoDateSchema.optional().describe(
    "Only when the request moves the event: the new date, after today.",
  ),
  budget: z.array(DraftBudgetItemSchema).max(15).optional(),
  addIdeas: z.array(DraftIdeaSchema).max(6).optional(),
  removeIdeaIds: z.array(z.string().max(64)).max(20).optional(),
  addTasks: z.array(DraftTaskSchema).max(8).optional(),
  removeTaskIds: z.array(z.string().max(64)).max(20).optional(),
  summary: Text(800, "Summary").optional(),
});
export type PlanPatch = z.infer<typeof PlanPatchSchema>;

/**
 * Keywords left out of the schema sent to the provider. Gemini rejects the plan
 * schema with 400 INVALID_ARGUMENT once its length and count limits are included
 * (too many constraint states), and patterns and formats add to the same budget.
 * Each limit is restated in the field's description instead, which the model
 * follows without the cost, and Zod still enforces every one of them when parsing
 * the reply, asking the model to repair anything that breaks them.
 */
const PROVIDER_DROPPED_KEYWORDS = new Set([
  "$schema",
  "additionalProperties",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "pattern",
  "format",
]);

const isSchema = (value: unknown) => typeof value === "object" && value !== null;

/** The dropped limits of one schema node, in words, e.g. "At most 300 characters." */
function limitsInWords(node: Record<string, unknown>): string[] {
  const { maxLength, minItems, maxItems } = node;
  const words: string[] = [];
  if (typeof maxLength === "number") words.push(`At most ${maxLength} characters.`);
  if (typeof minItems === "number" && minItems === maxItems) {
    words.push(`Exactly ${minItems} items.`);
  } else {
    if (typeof minItems === "number" && minItems > 1)
      words.push(`At least ${minItems} items.`);
    if (typeof maxItems === "number") words.push(`At most ${maxItems} items.`);
  }
  return words;
}

/** JSON Schema for the provider's structured-output mode. */
export function toProviderSchema(schema: z.ZodType): Record<string, unknown> {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (!isSchema(node)) return node;
    const record = node as Record<string, unknown>;
    const kept = Object.fromEntries(
      Object.entries(record)
        // A property that happens to be named like a keyword is kept.
        .filter(([key, value]) => !PROVIDER_DROPPED_KEYWORDS.has(key) || isSchema(value))
        .map(([key, value]) => [key, strip(value)]),
    );
    const limits = typeof record.type === "string" ? limitsInWords(record) : [];
    if (limits.length === 0) return kept;
    const description =
      typeof record.description === "string" ? [record.description] : [];
    return { ...kept, description: [...description, ...limits].join(" ") };
  };
  return strip(z.toJSONSchema(schema, { io: "input" })) as Record<string, unknown>;
}
