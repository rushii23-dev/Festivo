/**
 * "Fits your budget" badge. Compares an idea's cost tier with the plan's spend
 * per guest, using rough planning bands per event type and currency. The bands
 * are guidance for a badge, not price quotes.
 */
import type { Currency, EventType } from "@/lib/schemas/common";
import type { CostTier } from "@/lib/schemas/plan";

/** [per-guest spend where tier 2 fits, per-guest spend where tier 3 fits]. */
export const PER_GUEST_BANDS: Record<EventType, Record<Currency, [number, number]>> = {
  wedding: { INR: [2500, 6000], USD: [60, 150], EUR: [55, 140], GBP: [50, 120] },
  birthday: { INR: [800, 2500], USD: [20, 60], EUR: [18, 55], GBP: [16, 50] },
  community: { INR: [300, 1000], USD: [8, 25], EUR: [7, 22], GBP: [6, 20] },
};

export function budgetLevel(
  eventType: EventType,
  currency: Currency,
  totalBudget: number,
  guestCount: number,
): CostTier {
  const perGuest = guestCount > 0 ? totalBudget / guestCount : 0;
  const [mid, high] = PER_GUEST_BANDS[eventType][currency];
  if (perGuest >= high) return 3;
  if (perGuest >= mid) return 2;
  return 1;
}

export function fitsBudget(
  tier: CostTier,
  plan: {
    eventType: EventType;
    currency: Currency;
    totalBudget: number;
    guestCount: number;
  },
): boolean {
  return (
    tier <= budgetLevel(plan.eventType, plan.currency, plan.totalBudget, plan.guestCount)
  );
}
