/**
 * Currency formatting through Intl. INR uses the Indian numbering system
 * (₹12,34,567 and ₹12.3L); other currencies use their usual English locale.
 */
import type { Currency } from "@/lib/schemas/common";
import type { CostTier } from "@/lib/schemas/plan";

export const CURRENCY_LOCALES: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

const cache = new Map<string, Intl.NumberFormat>();

function formatter(currency: Currency, compact: boolean): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      minimumFractionDigits: 0,
      ...(compact ? { notation: "compact" as const } : {}),
    });
    cache.set(key, fmt);
  }
  return fmt;
}

/** "₹12,34,567", "$1,234,567". Rounds to whole units. */
export function formatMoney(amount: number, currency: Currency): string {
  return formatter(currency, false).format(Math.round(amount));
}

/** "₹12.3L", "$1.2M": for chart labels and tight spaces. */
export function formatMoneyCompact(amount: number, currency: Currency): string {
  return formatter(currency, true).format(amount);
}

export function currencySymbol(currency: Currency): string {
  const part = formatter(currency, false)
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? currency;
}

/** Visual tier, e.g. "₹₹" for tier 2. Pair with `costTierName` for screen readers. */
export function costTierSymbol(tier: CostTier, currency: Currency): string {
  return currencySymbol(currency).repeat(tier);
}

export function costTierName(tier: CostTier): string {
  return ({ 1: "Budget-friendly", 2: "Mid-range", 3: "Splurge" } as const)[tier];
}

/**
 * Parses what someone typed into a money field, such as "1,50,000" or "₹ 2500".
 * Accepts digits, grouping separators, currency symbols and one decimal part.
 * Shorthand like "2.5L" is rejected rather than guessed. Returns null for
 * anything that is not a non-negative number.
 */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[\s,₹$€£]/g, "");
  if (cleaned === "" || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
