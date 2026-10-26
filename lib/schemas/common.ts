/**
 * Shared vocabularies for event input and plans. Every list here is closed so
 * Zod can reject unknown values from users and from the AI alike.
 */
import { z } from "zod";

export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export const CurrencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof CurrencySchema>;
export const DEFAULT_CURRENCY: Currency = "INR";

/** Union of every budget category; each event type uses a subset (see lib/budget/categories). */
export const BUDGET_CATEGORIES = [
  "venue",
  "catering",
  "cake",
  "decor",
  "photography",
  "attire",
  "entertainment",
  "invitations",
  "favors",
  "transport",
  "permits",
  "equipment",
  "marketing",
  "volunteers",
  "misc",
] as const;
export const BudgetCategorySchema = z.enum(BUDGET_CATEGORIES);
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>;

export const VIBES = [
  "elegant",
  "boho",
  "traditional",
  "eco-friendly",
  "kid-friendly",
  "minimal",
  "cultural",
  "modern",
  "rustic",
  "playful",
] as const;
export const VibeSchema = z.enum(VIBES);
export type Vibe = z.infer<typeof VibeSchema>;

/** Optional wedding ceremonies, used when the "cultural" vibe applies. */
export const CEREMONIES = [
  "haldi",
  "mehendi",
  "sangeet",
  "wedding",
  "reception",
] as const;
export const CeremonySchema = z.enum(CEREMONIES);
export type Ceremony = z.infer<typeof CeremonySchema>;

export const DIETARY_NEEDS = [
  "vegetarian",
  "vegan",
  "jain",
  "halal",
  "kosher",
  "gluten-free",
  "nut-free",
  "dairy-free",
] as const;
export const DietaryNeedSchema = z.enum(DIETARY_NEEDS);
export type DietaryNeed = z.infer<typeof DietaryNeedSchema>;

export const ACCESSIBILITY_NEEDS = [
  "step-free-access",
  "accessible-restrooms",
  "seating-for-elders",
  "quiet-space",
  "sign-language",
  "large-print",
  "hearing-loop",
] as const;
export const AccessibilityNeedSchema = z.enum(ACCESSIBILITY_NEEDS);
export type AccessibilityNeed = z.infer<typeof AccessibilityNeedSchema>;

export const SETTINGS = ["indoor", "outdoor", "either"] as const;
export const SettingSchema = z.enum(SETTINGS);
export type Setting = z.infer<typeof SettingSchema>;

/** A calendar date with no time zone, e.g. "2027-02-14". */
export const IsoDateSchema = z.iso.date({ error: "Use a date like 2027-02-14." });
export type IsoDate = z.infer<typeof IsoDateSchema>;

/** Plain text field: trimmed, length-capped. Sanitising happens in lib/security. */
export function textField(max: number, label: string) {
  return z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, { error: `${label} must be ${max} characters or fewer.` });
}
