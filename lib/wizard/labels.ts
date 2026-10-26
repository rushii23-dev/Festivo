/** Display labels for the wizard's closed vocabularies. */
import type {
  AccessibilityNeed,
  Ceremony,
  Currency,
  DietaryNeed,
  EventType,
  Setting,
  Vibe,
} from "@/lib/schemas/common";

export const EVENT_TYPE_COPY: Record<EventType, { title: string; description: string }> =
  {
    wedding: {
      title: "Wedding",
      description: "From the mehendi to the reception, with every function in one plan.",
    },
    birthday: {
      title: "Birthday",
      description: "A first birthday, a surprise fortieth, or a garden party for eighty.",
    },
    community: {
      title: "Community event",
      description:
        "Street fairs, festivals, fundraisers and neighbourhood get-togethers.",
    },
  };

export const VIBE_LABELS: Record<Vibe, string> = {
  elegant: "Elegant",
  boho: "Boho",
  traditional: "Traditional",
  "eco-friendly": "Eco-friendly",
  "kid-friendly": "Kid-friendly",
  minimal: "Minimal",
  cultural: "Cultural",
  modern: "Modern",
  rustic: "Rustic",
  playful: "Playful",
};

export const CEREMONY_LABELS: Record<Ceremony, string> = {
  haldi: "Haldi",
  mehendi: "Mehendi",
  sangeet: "Sangeet",
  wedding: "Wedding ceremony",
  reception: "Reception",
};

export const DIETARY_LABELS: Record<DietaryNeed, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  jain: "Jain",
  halal: "Halal",
  kosher: "Kosher",
  "gluten-free": "Gluten-free",
  "nut-free": "Nut-free",
  "dairy-free": "Dairy-free",
};

export const ACCESSIBILITY_LABELS: Record<AccessibilityNeed, string> = {
  "step-free-access": "Step-free access",
  "accessible-restrooms": "Accessible restrooms",
  "seating-for-elders": "Seating for elders",
  "quiet-space": "A quiet space",
  "sign-language": "Sign language interpreter",
  "large-print": "Large-print materials",
  "hearing-loop": "Hearing loop",
};

export const SETTING_LABELS: Record<Setting, string> = {
  indoor: "Indoors",
  outdoor: "Outdoors",
  either: "Either is fine",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  INR: "Indian rupee (₹)",
  USD: "US dollar ($)",
  EUR: "Euro (€)",
  GBP: "British pound (£)",
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Spend less",
  2: "A bit less",
  3: "Balanced",
  4: "A bit more",
  5: "Spend more",
};
