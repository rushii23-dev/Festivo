import type { BudgetCategory, Vibe } from "@/lib/schemas/common";
import type { CostTier, IdeaCategory } from "@/lib/schemas/plan";

export interface IdeaSeed {
  key: string;
  category: IdeaCategory;
  title: string;
  description: string;
  costTier: CostTier;
  /** Styles this idea suits; ideas matching the user's vibes are chosen first. */
  vibes: Vibe[];
}

export interface SummaryContext {
  title: string;
  location: string;
  guestCount: number;
  budgetText: string;
  dateText: string;
  vibes: string;
}

export interface FixtureContent {
  rationales: Partial<Record<BudgetCategory, string>>;
  ideas: IdeaSeed[];
  summary: (ctx: SummaryContext) => string;
}
