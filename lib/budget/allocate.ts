/**
 * Deterministic budget allocation. Money is held in whole currency units
 * (rupees, dollars…), which is the precision people plan events with.
 * Every function returns amounts that are non-negative integers summing
 * exactly to the total.
 */
import type { BudgetCategory, EventType } from "@/lib/schemas/common";
import { BASELINE_SHARES, PRIORITY_MULTIPLIER, categoriesFor } from "./categories";

export interface Weighted<K extends string = string> {
  key: K;
  weight: number;
}

export interface Allocation<K extends string = string> {
  key: K;
  amount: number;
}

/** Rounds a planning total to whole units; never negative. */
export function toWholeUnits(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

/**
 * Splits `total` across `weights` proportionally using the largest-remainder
 * method, so the parts are integers that add up to exactly `total`.
 * Negative or non-finite weights count as zero; if every weight is zero the
 * total is split evenly. Ties go to the earlier item, keeping results stable.
 */
export function allocateProportionally<K extends string>(
  total: number,
  weights: readonly Weighted<K>[],
): Allocation<K>[] {
  const whole = toWholeUnits(total);
  if (weights.length === 0) return [];

  const cleaned = weights.map((w) =>
    Number.isFinite(w.weight) && w.weight > 0 ? w.weight : 0,
  );
  const sum = cleaned.reduce((a, b) => a + b, 0);
  const shares =
    sum > 0 ? cleaned.map((w) => w / sum) : cleaned.map(() => 1 / weights.length);

  const exact = shares.map((share) => share * whole);
  const floors = exact.map(Math.floor);
  let leftover = whole - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (const { index } of order) {
    if (leftover <= 0) break;
    floors[index] = (floors[index] ?? 0) + 1;
    leftover -= 1;
  }

  return weights.map((w, i) => ({ key: w.key, amount: floors[i] ?? 0 }));
}

/** Category weights for an event type after applying the user's 1–5 priorities. */
export function weightsFor(
  eventType: EventType,
  priorities: Partial<Record<BudgetCategory, number>> = {},
): Weighted<BudgetCategory>[] {
  return categoriesFor(eventType).map((category) => {
    const base = BASELINE_SHARES[eventType][category] ?? 0;
    const multiplier = PRIORITY_MULTIPLIER[priorities[category] ?? 3] ?? 1;
    return { key: category, weight: base * multiplier };
  });
}

/** Initial allocation for a new plan. */
export function allocateBudget(
  eventType: EventType,
  total: number,
  priorities: Partial<Record<BudgetCategory, number>> = {},
): Allocation<BudgetCategory>[] {
  return allocateProportionally(total, weightsFor(eventType, priorities));
}

/**
 * Re-normalises amounts that came from the AI (or anywhere untrusted): negatives
 * become zero and the rest is scaled so the result sums to exactly `total`.
 */
export function normalizeAmounts<K extends string>(
  total: number,
  items: readonly Allocation<K>[],
): Allocation<K>[] {
  return allocateProportionally(
    total,
    items.map((item) => ({ key: item.key, weight: item.amount })),
  );
}
