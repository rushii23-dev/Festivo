import { describe, expect, it } from "vitest";
import { budgetLevel, fitsBudget } from "@/lib/ideas/fit";
import { EVENT_TYPES } from "@/lib/schemas/common";
import { VENDOR_CATEGORIES, type BudgetItem, type Vendor } from "@/lib/schemas/plan";
import {
  DEFAULT_QUESTIONS,
  VENDORS_BY_EVENT,
  VENDOR_BUDGET_CATEGORY,
  budgetCategoryFor,
  VENDOR_LABELS,
  applyVendorSpend,
  bookingProgress,
  defaultVendors,
  vendorSpendByCategory,
} from "@/lib/vendors/catalog";
import { categoriesFor } from "@/lib/budget/categories";

const vendor = (overrides: Partial<Vendor>): Vendor => ({
  id: "v",
  category: "venue",
  status: "to-research",
  questionsToAsk: [],
  ...overrides,
});

describe("vendor catalog", () => {
  it("has a label, budget line and questions for every vendor category", () => {
    for (const category of VENDOR_CATEGORIES) {
      expect(VENDOR_LABELS[category]).toBeTruthy();
      expect(VENDOR_BUDGET_CATEGORY[category]).toBeTruthy();
      expect(DEFAULT_QUESTIONS[category].length).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(EVENT_TYPES)(
    "maps every %s vendor to a budget line that event uses",
    (type) => {
      const used = new Set(categoriesFor(type));
      for (const category of VENDORS_BY_EVENT[type]) {
        expect(used.has(budgetCategoryFor(category, type))).toBe(true);
      }
    },
  );

  it("creates default vendors to research", () => {
    const vendors = defaultVendors("birthday");
    expect(vendors.map((v) => v.category)).toEqual(VENDORS_BY_EVENT.birthday);
    expect(
      vendors.every((v) => v.status === "to-research" && v.questionsToAsk.length > 0),
    ).toBe(true);
  });
});

describe("vendor spend", () => {
  const vendors = [
    vendor({ id: "a", category: "photographer", status: "booked", quote: 80_000 }),
    vendor({ id: "b", category: "videographer", status: "quoted", quote: 50_000 }),
    vendor({ id: "c", category: "decorator", status: "contacted", quote: 99_999 }),
    vendor({ id: "d", category: "venue", status: "paid", quote: 300_000 }),
    vendor({ id: "e", category: "caterer", status: "booked" }),
  ];

  it("counts quotes once a vendor has quoted, booked or been paid", () => {
    expect(vendorSpendByCategory(vendors, "wedding")).toEqual({
      photography: 130_000,
      venue: 300_000,
    });
  });

  it("feeds quotes into the budget's actual spend", () => {
    const budget: BudgetItem[] = [
      { category: "photography", allocated: 120_000, rationale: "" },
      { category: "venue", allocated: 400_000, actual: 1, rationale: "" },
      { category: "decor", allocated: 50_000, actual: 20_000, rationale: "" },
    ];
    expect(applyVendorSpend(budget, vendors, "wedding").map((b) => b.actual)).toEqual([
      130_000, 300_000, 20_000,
    ]);
  });

  it("reports booking progress", () => {
    expect(bookingProgress(vendors)).toEqual({ booked: 3, total: 5 });
  });
});

describe("budget fit", () => {
  it("rates spend per guest against the event's bands", () => {
    expect(budgetLevel("wedding", "INR", 2_000_000, 1000)).toBe(1); // ₹2,000/guest
    expect(budgetLevel("wedding", "INR", 2_500_000, 1000)).toBe(2);
    expect(budgetLevel("wedding", "INR", 6_000_000, 1000)).toBe(3);
    expect(budgetLevel("birthday", "USD", 1000, 20)).toBe(2); // $50/guest
    expect(budgetLevel("community", "GBP", 0, 0)).toBe(1);
  });

  it("fits ideas at or below the budget level", () => {
    const plan = {
      eventType: "birthday",
      currency: "USD",
      totalBudget: 1000,
      guestCount: 20,
    } as const;
    expect(fitsBudget(1, plan)).toBe(true);
    expect(fitsBudget(2, plan)).toBe(true);
    expect(fitsBudget(3, plan)).toBe(false);
  });
});

describe("budgetCategoryFor", () => {
  it("applies per-event overrides", () => {
    expect(budgetCategoryFor("printer", "wedding")).toBe("invitations");
    expect(budgetCategoryFor("printer", "community")).toBe("marketing");
    expect(
      vendorSpendByCategory(
        [vendor({ category: "printer", status: "paid", quote: 900 })],
        "community",
      ),
    ).toEqual({ marketing: 900 });
  });
});
