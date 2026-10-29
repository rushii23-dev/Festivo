/**
 * Vendor categories per event type, the default "questions to ask" for each,
 * and how vendor quotes feed into the budget's actual spend.
 */
import { categoriesFor, vendorsFor, type PlanKind } from "@/lib/events/kind";
import type { BudgetCategory } from "@/lib/schemas/common";
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
  streaming: "Streaming & online platform",
  speaker: "Speakers & instructors",
  ticketing: "Ticketing & registration",
  merch: "Merch & swag",
};

/**
 * The budget lines each vendor's quote can count against, in order of
 * preference; the first one the plan has wins, otherwise the buffer.
 */
export const VENDOR_BUDGET_CATEGORIES: Record<VendorCategory, readonly BudgetCategory[]> =
  {
    venue: ["venue"],
    caterer: ["catering"],
    baker: ["cake", "catering"],
    decorator: ["decor"],
    florist: ["decor"],
    photographer: ["photography", "marketing"],
    videographer: ["photography", "marketing"],
    "makeup-artist": ["attire"],
    attire: ["attire"],
    "dj-or-band": ["entertainment"],
    performer: ["entertainment"],
    officiant: ["rituals"],
    printer: ["invitations", "marketing"],
    transport: ["transport"],
    "sound-and-av": ["equipment"],
    rentals: ["equipment"],
    "permits-office": ["permits"],
    "volunteer-lead": ["volunteers"],
    streaming: ["platform", "equipment"],
    speaker: ["speakers", "entertainment"],
    ticketing: ["marketing"],
    merch: ["favors", "marketing"],
  };

export function budgetCategoryFor(
  vendorCategory: VendorCategory,
  kind: PlanKind,
): BudgetCategory {
  const lines = categoriesFor(kind);
  return (
    VENDOR_BUDGET_CATEGORIES[vendorCategory].find((c) => lines.includes(c)) ?? "misc"
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
  streaming: [
    "How many people can join at once, and is there a time limit?",
    "Can guests join from a phone without installing anything?",
    "Is the session recorded, and who can download it?",
    "Are live captions available?",
  ],
  speaker: [
    "What is your fee, and does it include travel?",
    "How long is the talk or session, and do you need a Q&A slot?",
    "What do you need on the day: projector, mic, a whiteboard?",
    "Can we share your slides or recording afterwards?",
  ],
  ticketing: [
    "What is the fee per ticket, and who pays it?",
    "Can we approve guests before they get a ticket?",
    "How do refunds and transfers work?",
    "Is there a check-in app for the door?",
  ],
  merch: [
    "What is the minimum order and the price per piece?",
    "How long does printing take, and can we see a sample?",
    "Do you offer sustainable fabrics or materials?",
  ],
};

/** Statuses at which a vendor's quote counts as money committed or spent. */
export const SPEND_STATUSES: ReadonlySet<VendorStatus> = new Set([
  "quoted",
  "booked",
  "paid",
]);

export function defaultVendors(kind: PlanKind): Vendor[] {
  return vendorsFor(kind).map((category) => ({
    id: `vendor-${category}`,
    category,
    status: "to-research",
    questionsToAsk: DEFAULT_QUESTIONS[category],
  }));
}

/** Sum of counted quotes per budget category. */
export function vendorSpendByCategory(
  vendors: readonly Vendor[],
  kind: PlanKind,
): Partial<Record<BudgetCategory, number>> {
  const totals: Partial<Record<BudgetCategory, number>> = {};
  for (const vendor of vendors) {
    if (vendor.quote === undefined || !SPEND_STATUSES.has(vendor.status)) continue;
    const category = budgetCategoryFor(vendor.category, kind);
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
  kind: PlanKind,
): BudgetItem[] {
  const spend = vendorSpendByCategory(vendors, kind);
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
