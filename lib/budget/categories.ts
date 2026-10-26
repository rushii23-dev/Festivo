/**
 * Which budget categories each event type uses, with a baseline share of the
 * total. Shares are typical planning splits, not prices; they sum to 1 per type.
 */
import type { BudgetCategory, EventType } from "@/lib/schemas/common";

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  venue: "Venue",
  catering: "Food & drinks",
  cake: "Cake & desserts",
  decor: "Décor",
  photography: "Photography",
  attire: "Attire & beauty",
  entertainment: "Entertainment",
  invitations: "Invitations",
  favors: "Favors & gifts",
  transport: "Transport",
  permits: "Permits & insurance",
  equipment: "Equipment & AV",
  marketing: "Promotion",
  volunteers: "Volunteers & staff",
  misc: "Buffer",
};

export const BASELINE_SHARES: Record<
  EventType,
  Partial<Record<BudgetCategory, number>>
> = {
  wedding: {
    venue: 0.22,
    catering: 0.28,
    decor: 0.12,
    photography: 0.1,
    attire: 0.1,
    entertainment: 0.06,
    invitations: 0.02,
    favors: 0.03,
    transport: 0.02,
    misc: 0.05,
  },
  birthday: {
    venue: 0.18,
    catering: 0.28,
    cake: 0.1,
    decor: 0.13,
    entertainment: 0.12,
    photography: 0.06,
    favors: 0.05,
    invitations: 0.02,
    misc: 0.06,
  },
  community: {
    venue: 0.2,
    catering: 0.22,
    permits: 0.08,
    equipment: 0.14,
    marketing: 0.1,
    entertainment: 0.1,
    volunteers: 0.08,
    misc: 0.08,
  },
};

export function categoriesFor(eventType: EventType): BudgetCategory[] {
  return Object.keys(BASELINE_SHARES[eventType]) as BudgetCategory[];
}

/** Priority 1–5 scales a category's share; 3 leaves it unchanged. */
export const PRIORITY_MULTIPLIER: Record<number, number> = {
  1: 0.5,
  2: 0.75,
  3: 1,
  4: 1.3,
  5: 1.6,
};
