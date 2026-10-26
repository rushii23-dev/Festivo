/**
 * Vendor categories per event type, the default "questions to ask" for each,
 * and how vendor quotes feed into the budget's actual spend.
 */
import type { BudgetCategory, EventType } from "@/lib/schemas/common";
import type {
  BudgetItem,
  Vendor,
  VendorCategory,
  VendorStatus,
} from "@/lib/schemas/plan";

export const VENDOR_LABELS: Record<VendorCategory, string> = {
  venue: "Venue",
  caterer: "Caterer",
  baker: "Cake baker",
  decorator: "Decorator",
  florist: "Florist",
  photographer: "Photographer",
  videographer: "Videographer",
  "makeup-artist": "Makeup & hair",
  attire: "Outfits & tailoring",
  "dj-or-band": "DJ or band",
  performer: "Performers",
  officiant: "Officiant or priest",
  printer: "Invitations & printing",
  transport: "Transport",
  "sound-and-av": "Sound, stage & AV",
  rentals: "Tents, chairs & rentals",
  "permits-office": "Permits office",
  "volunteer-lead": "Volunteer coordinator",
};

/** The budget line each vendor's quote is counted against, unless overridden below. */
export const VENDOR_BUDGET_CATEGORY: Record<VendorCategory, BudgetCategory> = {
  venue: "venue",
  caterer: "catering",
  baker: "cake",
  decorator: "decor",
  florist: "decor",
  photographer: "photography",
  videographer: "photography",
  "makeup-artist": "attire",
  attire: "attire",
  "dj-or-band": "entertainment",
  performer: "entertainment",
  officiant: "misc",
  printer: "invitations",
  transport: "transport",
  "sound-and-av": "equipment",
  rentals: "equipment",
  "permits-office": "permits",
  "volunteer-lead": "volunteers",
};

/** Event types that track a vendor under a different budget line. */
const VENDOR_BUDGET_OVERRIDES: Partial<
  Record<EventType, Partial<Record<VendorCategory, BudgetCategory>>>
> = {
  community: { printer: "marketing" },
};

export function budgetCategoryFor(
  vendorCategory: VendorCategory,
  eventType: EventType,
): BudgetCategory {
  return (
    VENDOR_BUDGET_OVERRIDES[eventType]?.[vendorCategory] ??
    VENDOR_BUDGET_CATEGORY[vendorCategory]
  );
}

export const DEFAULT_QUESTIONS: Record<VendorCategory, string[]> = {
  venue: [
    "Is our date available, and how long can you hold it?",
    "What is the seated and standing capacity?",
    "What does the fee include: furniture, cleaning, security, power backup?",
    "Is there step-free access and an accessible restroom?",
    "What are the cancellation and refund terms?",
  ],
  caterer: [
    "What is the per-plate price for our guest count?",
    "Can you cater for our dietary needs, kept separate in prep?",
    "Is a tasting included before we confirm?",
    "How many service staff come with the booking?",
  ],
  baker: [
    "What size serves our guest count?",
    "Can you avoid the allergens on our list?",
    "Is delivery and set-up included?",
  ],
  decorator: [
    "Can you share photos of set-ups in a similar budget?",
    "What is included per function, and what costs extra?",
    "How long do set-up and take-down take?",
    "Which materials are reusable or rented rather than bought?",
  ],
  florist: [
    "Which flowers are in season for our date?",
    "Can arrangements be reused between functions?",
  ],
  photographer: [
    "How many hours and photographers are included?",
    "When will we receive edited photos, and how many?",
    "Do you have a backup camera and a backup photographer?",
  ],
  videographer: [
    "What is the length of the highlight film and the full edit?",
    "Do you bring your own audio recording for speeches?",
  ],
  "makeup-artist": [
    "Is a trial included in the price?",
    "How many people can you get ready, and how long per person?",
  ],
  attire: ["How many fittings are included?", "What is the latest date for alterations?"],
  "dj-or-band": [
    "Do you bring sound equipment and lighting?",
    "Can we share a must-play and do-not-play list?",
    "What happens if the event runs late?",
  ],
  performer: [
    "How long is the set and what space do you need?",
    "Is the act suitable for all ages in the audience?",
  ],
  officiant: [
    "Which rituals will you perform and how long will they take?",
    "What do you need us to arrange beforehand?",
  ],
  printer: [
    "What is the turnaround time for printing?",
    "Do you offer recycled paper or a digital version?",
  ],
  transport: [
    "How many vehicles and drivers are available on the day?",
    "Are there wheelchair-accessible vehicles?",
  ],
  "sound-and-av": [
    "Is a technician on site for the whole event?",
    "What power supply do you need, and do you bring a generator?",
    "Can you provide a hearing loop or captions screen?",
  ],
  rentals: [
    "When do you deliver and collect?",
    "What is the deposit and the damage policy?",
  ],
  "permits-office": [
    "Which permits do we need for sound, food and road use?",
    "How long does approval take, and what documents are required?",
  ],
  "volunteer-lead": [
    "How many volunteers can you organise and for which shifts?",
    "Who handles first aid and the lost-and-found desk?",
  ],
};

export const VENDORS_BY_EVENT: Record<EventType, VendorCategory[]> = {
  wedding: [
    "venue",
    "caterer",
    "decorator",
    "photographer",
    "videographer",
    "makeup-artist",
    "attire",
    "dj-or-band",
    "officiant",
    "printer",
    "transport",
  ],
  birthday: [
    "venue",
    "caterer",
    "baker",
    "decorator",
    "photographer",
    "performer",
    "printer",
  ],
  community: [
    "venue",
    "permits-office",
    "caterer",
    "sound-and-av",
    "rentals",
    "performer",
    "printer",
    "volunteer-lead",
  ],
};

/** Statuses at which a vendor's quote counts as money committed or spent. */
export const SPEND_STATUSES: ReadonlySet<VendorStatus> = new Set([
  "quoted",
  "booked",
  "paid",
]);

export function defaultVendors(eventType: EventType): Vendor[] {
  return VENDORS_BY_EVENT[eventType].map((category) => ({
    id: `vendor-${category}`,
    category,
    status: "to-research",
    questionsToAsk: DEFAULT_QUESTIONS[category],
  }));
}

/** Sum of counted quotes per budget category. */
export function vendorSpendByCategory(
  vendors: readonly Vendor[],
  eventType: EventType,
): Partial<Record<BudgetCategory, number>> {
  const totals: Partial<Record<BudgetCategory, number>> = {};
  for (const vendor of vendors) {
    if (vendor.quote === undefined || !SPEND_STATUSES.has(vendor.status)) continue;
    const category = budgetCategoryFor(vendor.category, eventType);
    totals[category] = (totals[category] ?? 0) + vendor.quote;
  }
  return totals;
}

/**
 * Sets each budget line's `actual` from vendor quotes. Lines without any counted
 * quote keep the amount the user typed (or none).
 */
export function applyVendorSpend(
  budget: readonly BudgetItem[],
  vendors: readonly Vendor[],
  eventType: EventType,
): BudgetItem[] {
  const spend = vendorSpendByCategory(vendors, eventType);
  return budget.map((item) => {
    const fromVendors = spend[item.category];
    return fromVendors === undefined ? item : { ...item, actual: fromVendors };
  });
}

/** Booking progress for the overview: vendors booked or paid out of all vendors. */
export function bookingProgress(vendors: readonly Vendor[]): {
  booked: number;
  total: number;
} {
  return {
    booked: vendors.filter((v) => v.status === "booked" || v.status === "paid").length,
    total: vendors.length,
  };
}
