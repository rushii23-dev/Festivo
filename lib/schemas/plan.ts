/**
 * The plan document: generated once by the AI (or mock), then edited by the user.
 * Every AI response is parsed with PlanSchema before it reaches the UI.
 */
import { z } from "zod";
import {
  BudgetCategorySchema,
  CurrencySchema,
  EventTypeSchema,
  IsoDateSchema,
  textField,
} from "./common";
import { LIMITS } from "./eventInput";

export const TIMELINE_PHASES = [
  "12+ weeks",
  "8 weeks",
  "1 month",
  "1 week",
  "Day of",
  "After",
] as const;
export const TimelinePhaseSchema = z.enum(TIMELINE_PHASES);
export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;

export const VENDOR_STATUSES = [
  "to-research",
  "contacted",
  "quoted",
  "booked",
  "paid",
] as const;
export const VendorStatusSchema = z.enum(VENDOR_STATUSES);
export type VendorStatus = z.infer<typeof VendorStatusSchema>;

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  "to-research": "To research",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  paid: "Paid",
};

export const VENDOR_CATEGORIES = [
  "venue",
  "caterer",
  "baker",
  "decorator",
  "florist",
  "photographer",
  "videographer",
  "makeup-artist",
  "attire",
  "dj-or-band",
  "performer",
  "officiant",
  "printer",
  "transport",
  "sound-and-av",
  "rentals",
  "permits-office",
  "volunteer-lead",
] as const;
export const VendorCategorySchema = z.enum(VENDOR_CATEGORIES);
export type VendorCategory = z.infer<typeof VendorCategorySchema>;

export const IDEA_CATEGORIES = [
  "theme",
  "decor",
  "food",
  "activities",
  "favors",
] as const;
export const IdeaCategorySchema = z.enum(IDEA_CATEGORIES);
export type IdeaCategory = z.infer<typeof IdeaCategorySchema>;

export const CostTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export type CostTier = z.infer<typeof CostTierSchema>;

const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\w-]+$/, { error: "IDs use letters, numbers, - and _ only." });
const MoneySchema = z.number().finite().min(0).max(LIMITS.budgetMax);

export const BudgetItemSchema = z.strictObject({
  category: BudgetCategorySchema,
  allocated: MoneySchema,
  actual: MoneySchema.optional(),
  rationale: textField(240, "Rationale"),
});
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

export const TimelineTaskSchema = z.strictObject({
  id: IdSchema,
  phase: TimelinePhaseSchema,
  title: textField(120, "Task title").min(1),
  dueDate: IsoDateSchema,
  /** Optional 24-hour start time, used by the day-of run sheet. */
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Use a time like 09:30." })
    .optional(),
  done: z.boolean(),
  description: textField(400, "Task description").optional(),
});
export type TimelineTask = z.infer<typeof TimelineTaskSchema>;

export const VendorSchema = z.strictObject({
  id: IdSchema,
  category: VendorCategorySchema,
  status: VendorStatusSchema,
  questionsToAsk: z.array(textField(200, "Question").min(1)).max(8),
  quote: MoneySchema.optional(),
  notes: textField(500, "Notes").optional(),
});
export type Vendor = z.infer<typeof VendorSchema>;

export const IdeaSchema = z.strictObject({
  id: IdSchema,
  category: IdeaCategorySchema,
  title: textField(100, "Idea title").min(1),
  description: textField(400, "Idea description").min(1),
  costTier: CostTierSchema,
  saved: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});
export type Idea = z.infer<typeof IdeaSchema>;

export const PlanSchema = z.strictObject({
  id: IdSchema,
  eventType: EventTypeSchema,
  title: textField(LIMITS.nameMax, "Title").min(1),
  date: IsoDateSchema,
  /** True when the user chose "flexible"; `date` is then our planning anchor. */
  dateFlexible: z.boolean(),
  location: textField(LIMITS.locationMax, "Location").min(1),
  guestCount: z.int().min(LIMITS.guestsMin).max(LIMITS.guestsMax),
  currency: CurrencySchema,
  totalBudget: MoneySchema,
  budget: z.array(BudgetItemSchema).min(1).max(15),
  timeline: z.array(TimelineTaskSchema).max(60),
  vendors: z.array(VendorSchema).max(20),
  ideas: z.array(IdeaSchema).max(40),
  summary: textField(800, "Summary"),
  createdAt: z.iso.datetime(),
});
export type Plan = z.infer<typeof PlanSchema>;
