/** Dashboard tabs. The active tab lives in the URL hash so it survives a reload. */
import type { BudgetSummary } from "@/lib/budget/rebalance";
import type { IdeaCategory, TimelinePhase } from "@/lib/schemas/plan";

export const DASHBOARD_TABS = [
  "overview",
  "budget",
  "timeline",
  "vendors",
  "ideas",
] as const;
export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export const TAB_LABELS: Record<DashboardTab, string> = {
  overview: "Overview",
  budget: "Budget",
  timeline: "Timeline",
  vendors: "Vendors",
  ideas: "Ideas",
};

/** "#budget" → "budget"; anything unknown falls back to the overview. */
export function tabFromHash(hash: string): DashboardTab {
  const value = hash.replace(/^#/, "").toLowerCase();
  return (DASHBOARD_TABS as readonly string[]).includes(value)
    ? (value as DashboardTab)
    : "overview";
}

export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  theme: "Theme",
  decor: "Décor",
  food: "Food & drinks",
  activities: "Activities",
  favors: "Favors",
};

/** Headings for the timeline phases, written as plain time references. */
export const PHASE_HEADINGS: Record<TimelinePhase, string> = {
  "12+ weeks": "Three months or more before",
  "8 weeks": "Eight weeks before",
  "1 month": "The last month",
  "1 week": "The final week",
  "Day of": "On the day",
  After: "After the event",
};

/** Budget health in words, specific about why a plan needs attention. */
export function budgetHealthLabel({
  health,
  overCategories,
}: Pick<BudgetSummary, "health" | "overCategories">): string {
  if (health === "on-track") return "On track";
  if (health === "over") return "Over budget";
  const n = overCategories.length;
  if (n === 0) return "Close to the limit";
  return n === 1 ? "One line is over plan" : `${n} lines are over plan`;
}
