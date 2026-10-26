import { describe, expect, it } from "vitest";
import {
  costTierName,
  costTierSymbol,
  currencySymbol,
  formatMoney,
  formatMoneyCompact,
  parseMoneyInput,
} from "@/lib/budget/format";

describe("formatMoney", () => {
  it("uses Indian grouping for INR", () => {
    expect(formatMoney(1234567, "INR")).toBe("₹12,34,567");
  });

  it("formats other currencies in their usual locale", () => {
    expect(formatMoney(1234567, "USD")).toBe("$1,234,567");
    expect(formatMoney(1234567, "EUR")).toBe("€1,234,567");
    expect(formatMoney(1234567, "GBP")).toBe("£1,234,567");
  });

  it("rounds to whole units", () => {
    expect(formatMoney(999.6, "USD")).toBe("$1,000");
    expect(formatMoney(0, "INR")).toBe("₹0");
  });
});

describe("formatMoneyCompact", () => {
  it("uses lakh for INR and M for USD", () => {
    expect(formatMoneyCompact(1234567, "INR")).toBe("₹12.3L");
    expect(formatMoneyCompact(1234567, "USD")).toBe("$1.2M");
  });
});

describe("cost tiers", () => {
  it("repeats the currency symbol and names the tier", () => {
    expect(currencySymbol("INR")).toBe("₹");
    expect(costTierSymbol(1, "INR")).toBe("₹");
    expect(costTierSymbol(3, "USD")).toBe("$$$");
    expect(costTierName(1)).toBe("Budget-friendly");
    expect(costTierName(2)).toBe("Mid-range");
    expect(costTierName(3)).toBe("Splurge");
  });
});

describe("parseMoneyInput", () => {
  it.each([
    ["1,50,000", 150000],
    ["₹ 2500", 2500],
    ["$1,234.50", 1234.5],
    ["0", 0],
  ])("parses %s", (raw, expected) => {
    expect(parseMoneyInput(raw)).toBe(expected);
  });

  it.each(["", "abc", "-5", "2.5L", "1.2.3", "1e5"])("rejects %s", (raw) => {
    expect(parseMoneyInput(raw)).toBeNull();
  });
});
