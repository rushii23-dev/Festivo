/**
 * Shared vocabularies for event input and plans. Every list here is closed so
 * Zod can reject unknown values from users and from the AI alike.
 */
import { z } from "zod";

/**
 * The planning family behind every occasion: it picks the base timeline and
 * the fixtures. People choose a specific occasion (below), never a family.
 */
export const EVENT_TYPES = ["wedding", "birthday", "community"] as const;
export const EventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof EventTypeSchema>;

/** The groups people browse first, then the occasion inside the group. */
export const OCCASION_GROUPS = ["life", "festival", "meetup", "work"] as const;
export const OccasionGroupSchema = z.enum(OCCASION_GROUPS);
export type OccasionGroup = z.infer<typeof OccasionGroupSchema>;

/** Every occasion Festivo plans (catalog with labels and rules: lib/events/occasions). */
export const OCCASIONS = [
  // Life moments
  "wedding",
  "engagement",
  "anniversary",
  "birthday",
  "baby-shower",
  "naming-ceremony",
  "graduation",
  "retirement",
  "farewell",
  "housewarming",
  // Festivals
  "diwali",
  "holi",
  "eid",
  "christmas",
  "navratri",
  "puja",
  "community-festival",
  // Meetups and communities (after Luma's categories)
  "tech-meetup",
  "ai-meetup",
  "crypto-meetup",
  "book-club",
  "game-night",
  "running-club",
  "fitness-class",
  "wellness",
  "arts-culture",
  "climate",
  "food-drink",
  "family-day",
  // Work and causes
  "conference",
  "hackathon",
  "workshop",
  "networking",
  "product-launch",
  "team-offsite",
  "fundraiser",
] as const;
export const OccasionSchema = z.enum(OCCASIONS);
export type Occasion = z.infer<typeof OccasionSchema>;

/** Where guests take part (Luma's in-person / online / hybrid). */
export const FORMATS = ["in-person", "online", "hybrid"] as const;
export const FormatSchema = z.enum(FORMATS);
export type Format = z.infer<typeof FormatSchema>;

export const TICKET_PRICING = ["free", "paid"] as const;
export const TicketPricingSchema = z.enum(TICKET_PRICING);

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
  "speakers",
  "prizes",
  "rituals",
  "platform",
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
  "cozy",
  "casual",
  "professional",
  "high-energy",
] as const;
export const VibeSchema = z.enum(VIBES);
export type Vibe = z.infer<typeof VibeSchema>;

/** Optional wedding functions, offered for weddings and engagements. */
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
  "live-captions",
] as const;
export const AccessibilityNeedSchema = z.enum(ACCESSIBILITY_NEEDS);
export type AccessibilityNeed = z.infer<typeof AccessibilityNeedSchema>;

export const SETTINGS = ["indoor", "outdoor", "either"] as const;
export const SettingSchema = z.enum(SETTINGS);
export type Setting = z.infer<typeof SettingSchema>;

/** A calendar date with no time zone, e.g. "2027-02-14". */
export const IsoDateSchema = z.iso.date({ error: "Use a date like 2027-02-14." });

/** Plain text field: trimmed, length-capped. Sanitising happens in lib/security. */
export function textField(max: number, label: string) {
  return z
    .string({ error: `${label} must be text.` })
    .trim()
    .max(max, { error: `${label} must be ${max} characters or fewer.` });
}
