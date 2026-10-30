/** Display labels for the wizard's closed vocabularies. */
import type {
  AccessibilityNeed,
  Ceremony,
  Currency,
  DietaryNeed,
  Format,
  Setting,
  Vibe,
} from "@/lib/schemas/common";
import type { StepId } from "./draft";

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
  cozy: "Cozy",
  casual: "Casual",
  professional: "Professional",
  "high-energy": "High energy",
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
  "live-captions": "Live captions",
};

export const FORMAT_COPY: Record<Format, { label: string; hint: string }> = {
  "in-person": { label: "In person", hint: "Everyone meets at one place." },
  online: {
    label: "Online",
    hint: "On Zoom, Meet or a stream: no venue, food or décor to plan.",
  },
  hybrid: {
    label: "Hybrid",
    hint: "A place to meet, with a stream for people joining from afar.",
  },
};

export const TICKET_COPY: Record<"none" | "free" | "paid", string> = {
  none: "No registration",
  free: "Free, with registration",
  paid: "Paid tickets",
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

/** A line under each step's question. */
export const STEP_COPY: Record<StepId, { intro: string }> = {
  type: {
    intro:
      "Pick a kind of event, then the occasion. The questions, budget lines and vendors adapt to it.",
  },
  basics: {
    intro: "A name, a date and a rough guest count. Nothing here is final.",
  },
  budget: {
    intro: "The total you would like to spend. Festivo splits it for you.",
  },
  vibe: {
    intro: "Pick a few words that sound like your celebration.",
  },
  constraints: {
    intro: "Anything your guests need, and anything you would rather avoid.",
  },
  review: {
    intro: "Have a last look. Change anything, then let Festivo draft your plan.",
  },
};
