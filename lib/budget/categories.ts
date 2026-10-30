/** Budget category names and how priorities scale a category's share. */
import type { BudgetCategory } from "@/lib/schemas/common";

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
  speakers: "Speakers & instructors",
  prizes: "Prizes & awards",
  rituals: "Rituals & offerings",
  platform: "Online platform & streaming",
  misc: "Buffer",
};

/** Shares and categories depend on the occasion and format: see lib/events/kind. */
export { categoriesFor } from "@/lib/events/kind";

/** Priority 1–5 scales a category's share; 3 leaves it unchanged. */
export const PRIORITY_MULTIPLIER: Record<number, number> = {
  1: 0.5,
  2: 0.75,
  3: 1,
  4: 1.3,
  5: 1.6,
};
