/**
 * Budget editing helpers: redistribute what is left after the user pins some
 * amounts, and summarise health (on track / at risk / over).
 */
import type { BudgetCategory } from "@/lib/schemas/common";
import type { BudgetItem } from "@/lib/schemas/plan";
import { allocateProportionally, toWholeUnits } from "./allocate";

export interface RebalanceResult {
  items: BudgetItem[];
  /** How far the locked amounts alone exceed the total (0 when they fit). */
  overBy: number;
}

/**
 * Keeps the `locked` categories at their current amounts and spreads the money
 * that remains across the other categories in proportion to their current
 * amounts (evenly if they are all zero). Results are whole numbers and, unless
 * the locked amounts already exceed the total, sum exactly to `total`.
 */
export function rebalance(
  items: readonly BudgetItem[],
  total: number,
  locked: ReadonlySet<BudgetCategory>,
): RebalanceResult {
  const whole = toWholeUnits(total);
  const lockedSum = items
    .filter((item) => locked.has(item.category))
    .reduce((sum, item) => sum + toWholeUnits(item.allocated), 0);
  const remaining = Math.max(0, whole - lockedSum);
  const overBy = Math.max(0, lockedSum - whole);

  const free = items.filter((item) => !locked.has(item.category));
  const shares = allocateProportionally(
    remaining,
    free.map((item) => ({ key: item.category, weight: item.allocated })),
  );
  const byCategory = new Map(shares.map((s) => [s.key, s.amount]));

  return {
    overBy,
    items: items.map((item) =>
      locked.has(item.category)
        ? { ...item, allocated: toWholeUnits(item.allocated) }
        : { ...item, allocated: byCategory.get(item.category) ?? 0 },
    ),
  };
}

/** Scales the whole budget to a new total, e.g. "cut budget by 20%". */
export function scaleBudget(
  items: readonly BudgetItem[],
  newTotal: number,
): BudgetItem[] {
  return rebalance(items, newTotal, new Set()).items;
}

export type BudgetHealth = "on-track" | "at-risk" | "over";

export interface CategoryStatus {
  category: BudgetCategory;
  allocated: number;
  actual: number;
  /** allocated − actual; negative when overspent. */
  remaining: number;
  over: boolean;
}

export interface BudgetSummary {
  total: number;
  allocated: number;
  actual: number;
  /** total − actual spend. */
  remaining: number;
  unallocated: number;
  categories: CategoryStatus[];
  overCategories: BudgetCategory[];
  health: BudgetHealth;
}

/** Share of the total spent above which the plan is flagged "at risk". */
export const AT_RISK_THRESHOLD = 0.9;

export function summarizeBudget(
  items: readonly BudgetItem[],
  total: number,
): BudgetSummary {
  const categories = items.map<CategoryStatus>((item) => {
    const actual = item.actual ?? 0;
    return {
      category: item.category,
      allocated: item.allocated,
      actual,
      remaining: item.allocated - actual,
      over: actual > item.allocated,
    };
  });
  const allocated = categories.reduce((sum, c) => sum + c.allocated, 0);
  const actual = categories.reduce((sum, c) => sum + c.actual, 0);
  const overCategories = categories.filter((c) => c.over).map((c) => c.category);

  let health: BudgetHealth = "on-track";
  if (actual > total) health = "over";
  else if (
    overCategories.length > 0 ||
    (total > 0 && actual / total >= AT_RISK_THRESHOLD)
  ) {
    health = "at-risk";
  }

  return {
    total,
    allocated,
    actual,
    remaining: total - actual,
    unallocated: total - allocated,
    categories,
    overCategories,
    health,
  };
}
