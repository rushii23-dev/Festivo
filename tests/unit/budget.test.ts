import { describe, expect, it } from "vitest";
import {
  allocateBudget,
  allocateProportionally,
  normalizeAmounts,
  toWholeUnits,
  weightsFor,
} from "@/lib/budget/allocate";
import { categoriesFor } from "@/lib/budget/categories";
import { PROFILE_IDS, PROFILES } from "@/lib/events/profiles";
import { rebalance, scaleBudget, summarizeBudget } from "@/lib/budget/rebalance";
import { EVENT_TYPES, type BudgetCategory } from "@/lib/schemas/common";
import type { BudgetItem } from "@/lib/schemas/plan";

const sum = (values: { amount: number }[]) => values.reduce((a, b) => a + b.amount, 0);

function items(entries: [BudgetCategory, number, number?][]): BudgetItem[] {
  return entries.map(([category, allocated, actual]) => ({
    category,
    allocated,
    rationale: "",
    ...(actual === undefined ? {} : { actual }),
  }));
}

describe("baseline shares", () => {
  it.each(PROFILE_IDS)("%s profile shares sum to 1", (id) => {
    const total = Object.values(PROFILES[id].shares).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("toWholeUnits", () => {
  it("rounds and clamps", () => {
    expect(toWholeUnits(10.5)).toBe(11);
    expect(toWholeUnits(-5)).toBe(0);
    expect(toWholeUnits(Number.NaN)).toBe(0);
    expect(toWholeUnits(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("allocateProportionally", () => {
  it("sums exactly to the total, with integers", () => {
    const result = allocateProportionally(100, [
      { key: "a", weight: 1 },
      { key: "b", weight: 1 },
      { key: "c", weight: 1 },
    ]);
    expect(result.map((r) => r.amount)).toEqual([34, 33, 33]);
    expect(sum(result)).toBe(100);
  });

  it("gives leftover units to the largest remainders", () => {
    const result = allocateProportionally(10, [
      { key: "a", weight: 0.15 },
      { key: "b", weight: 0.35 },
      { key: "c", weight: 0.5 },
    ]);
    // exact: 1.5, 3.5, 5 → floors 1, 3, 5 → one leftover goes to the first tie (a)
    expect(result.map((r) => r.amount)).toEqual([2, 3, 5]);
  });

  it("treats negative and non-finite weights as zero", () => {
    const result = allocateProportionally(90, [
      { key: "a", weight: -10 },
      { key: "b", weight: Number.NaN },
      { key: "c", weight: 3 },
    ]);
    expect(result.map((r) => r.amount)).toEqual([0, 0, 90]);
  });

  it("splits evenly when every weight is zero", () => {
    const result = allocateProportionally(10, [
      { key: "a", weight: 0 },
      { key: "b", weight: 0 },
      { key: "c", weight: 0 },
    ]);
    expect(result.map((r) => r.amount)).toEqual([4, 3, 3]);
  });

  it("handles empty input and zero totals", () => {
    expect(allocateProportionally(100, [])).toEqual([]);
    expect(sum(allocateProportionally(0, [{ key: "a", weight: 1 }]))).toBe(0);
  });

  it("never produces negatives and always sums exactly (property check)", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    for (let run = 0; run < 500; run++) {
      const total = Math.floor(random() * 10_000_000);
      const weights = Array.from({ length: 1 + Math.floor(random() * 12) }, (_, i) => ({
        key: `k${i}`,
        weight: random() * 100 - 10,
      }));
      const result = allocateProportionally(total, weights);
      expect(sum(result)).toBe(total);
      for (const r of result) {
        expect(Number.isInteger(r.amount)).toBe(true);
        expect(r.amount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("allocateBudget", () => {
  it.each(EVENT_TYPES)("allocates every %s category and sums to the total", (type) => {
    const result = allocateBudget({ eventType: type }, 1_234_567);
    expect(result.map((r) => r.key)).toEqual(categoriesFor({ eventType: type }));
    expect(sum(result)).toBe(1_234_567);
  });

  it("shifts money towards higher priorities", () => {
    const neutral = allocateBudget({ eventType: "wedding" }, 1_000_000);
    const boosted = allocateBudget({ eventType: "wedding" }, 1_000_000, {
      photography: 5,
      decor: 1,
    });
    const get = (list: typeof neutral, key: BudgetCategory) =>
      list.find((r) => r.key === key)?.amount ?? 0;
    expect(get(boosted, "photography")).toBeGreaterThan(get(neutral, "photography"));
    expect(get(boosted, "decor")).toBeLessThan(get(neutral, "decor"));
    expect(sum(boosted)).toBe(1_000_000);
  });

  it("ignores priorities for categories the event type does not use", () => {
    expect(weightsFor({ eventType: "birthday" }, { permits: 5 })).toEqual(
      weightsFor({ eventType: "birthday" }),
    );
  });
});

describe("normalizeAmounts", () => {
  it("repairs AI allocations that do not add up", () => {
    const result = normalizeAmounts(1000, [
      { key: "venue", amount: 600 },
      { key: "catering", amount: 600 },
      { key: "decor", amount: -50 },
    ]);
    expect(result).toEqual([
      { key: "venue", amount: 500 },
      { key: "catering", amount: 500 },
      { key: "decor", amount: 0 },
    ]);
  });
});

describe("rebalance", () => {
  const base = items([
    ["venue", 400],
    ["catering", 300],
    ["decor", 200],
    ["misc", 100],
  ]);

  it("keeps locked lines and spreads the rest proportionally", () => {
    const edited = base.map((i) =>
      i.category === "venue" ? { ...i, allocated: 550 } : i,
    );
    const { items: result, overBy } = rebalance(edited, 1000, new Set(["venue"]));
    expect(overBy).toBe(0);
    expect(result.map((i) => i.allocated)).toEqual([550, 225, 150, 75]);
    expect(result.reduce((a, b) => a + b.allocated, 0)).toBe(1000);
  });

  it("reports how far locked lines exceed the total", () => {
    const { items: result, overBy } = rebalance(
      base,
      500,
      new Set(["venue", "catering"]),
    );
    expect(overBy).toBe(200);
    expect(result.find((i) => i.category === "decor")?.allocated).toBe(0);
  });

  it("splits evenly across unlocked lines that are all zero", () => {
    const zeros = items([
      ["venue", 600],
      ["decor", 0],
      ["misc", 0],
    ]);
    const { items: result } = rebalance(zeros, 1000, new Set(["venue"]));
    expect(result.map((i) => i.allocated)).toEqual([600, 200, 200]);
  });

  it("preserves actual spend and rationale", () => {
    const withActual = items([
      ["venue", 400, 350],
      ["decor", 600],
    ]);
    const { items: result } = rebalance(withActual, 2000, new Set());
    expect(result[0]).toMatchObject({ category: "venue", actual: 350, rationale: "" });
  });

  it("scaleBudget cuts every line, e.g. by 20%", () => {
    const result = scaleBudget(base, 800);
    expect(result.map((i) => i.allocated)).toEqual([320, 240, 160, 80]);
  });
});

describe("summarizeBudget", () => {
  it("is on track with no spend", () => {
    const summary = summarizeBudget(items([["venue", 1000]]), 1000);
    expect(summary).toMatchObject({ health: "on-track", actual: 0, remaining: 1000 });
  });

  it("is at risk when a category is overspent", () => {
    const summary = summarizeBudget(
      items([
        ["venue", 500, 600],
        ["decor", 500, 0],
      ]),
      1000,
    );
    expect(summary.health).toBe("at-risk");
    expect(summary.overCategories).toEqual(["venue"]);
    expect(summary.categories[0]).toMatchObject({ remaining: -100, over: true });
  });

  it("is at risk at 90% of the total", () => {
    expect(summarizeBudget(items([["venue", 1000, 900]]), 1000).health).toBe("at-risk");
  });

  it("is over when total spend exceeds the budget", () => {
    const summary = summarizeBudget(items([["venue", 1000, 1200]]), 1000);
    expect(summary).toMatchObject({ health: "over", remaining: -200 });
  });

  it("reports unallocated money", () => {
    expect(summarizeBudget(items([["venue", 700]]), 1000).unallocated).toBe(300);
  });
});
