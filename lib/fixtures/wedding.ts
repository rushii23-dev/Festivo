import type { FixtureContent } from "./types";

export const weddingFixture: FixtureContent = {
  rationales: {
    venue:
      "The venue sets capacity and often bundles furniture and power, so it takes a large share.",
    catering: "Food is the biggest per-guest cost and what guests remember most.",
    decor: "Mandap or stage, entrance and table styling across the functions.",
    photography: "Photos and film are the one thing you keep; book a team you trust.",
    attire: "Outfits, fittings, makeup and hair for the couple.",
    entertainment: "DJ or band, plus sangeet choreography if you have one.",
    invitations: "Digital invites keep this small; printed cards for elders.",
    favors: "Return gifts and welcome hampers for out-of-town guests.",
    transport: "Pickups for family and the baraat or arrival car.",
    misc: "A buffer for tips, last-minute fixes and anything forgotten.",
  },
  ideas: [
    {
      key: "marigold-courtyard",
      category: "theme",
      title: "Marigold courtyard",
      description:
        "Warm orange and pink marigold garlands, brass urli bowls and low seating create a festive daytime look that photographs beautifully.",
      costTier: 1,
      vibes: ["traditional", "cultural", "boho"],
    },
    {
      key: "garden-whites",
      category: "theme",
      title: "Garden whites",
      description:
        "Ivory florals, sheer drapes and fairy lights for a soft, timeless evening ceremony.",
      costTier: 2,
      vibes: ["elegant", "minimal", "modern"],
    },
    {
      key: "heritage-haveli",
      category: "theme",
      title: "Heritage haveli evening",
      description:
        "Jharokha backdrops, lanterns and deep jewel tones for a regal reception.",
      costTier: 3,
      vibes: ["traditional", "cultural", "elegant"],
    },
    {
      key: "potted-plant-mandap",
      category: "decor",
      title: "Potted-plant mandap",
      description:
        "Build the mandap from rented potted palms and jasmine, then gift the plants to guests afterwards.",
      costTier: 1,
      vibes: ["eco-friendly", "boho", "minimal"],
    },
    {
      key: "floating-diyas",
      category: "decor",
      title: "Floating diyas and petals",
      description:
        "Bowls of water with floating candles and rose petals along the aisle and on every table.",
      costTier: 1,
      vibes: ["traditional", "elegant", "cultural"],
    },
    {
      key: "fabric-ceiling",
      category: "decor",
      title: "Draped fabric ceiling",
      description:
        "Layered chiffon swags with warm bulb strings transform a plain hall into a tent-like room.",
      costTier: 2,
      vibes: ["elegant", "boho", "modern"],
    },
    {
      key: "live-chaat",
      category: "food",
      title: "Live chaat counter",
      description:
        "Pani puri, dahi bhalla and aloo tikki made to order. Easy to keep vegetarian and Jain friendly.",
      costTier: 1,
      vibes: ["traditional", "cultural", "playful"],
    },
    {
      key: "regional-thali",
      category: "food",
      title: "Regional thali dinner",
      description:
        "A seated thali that celebrates both families' home cuisines, labelled by region.",
      costTier: 2,
      vibes: ["cultural", "traditional", "elegant"],
    },
    {
      key: "mocktail-bar",
      category: "food",
      title: "Signature mocktail bar",
      description: "Two drinks named after the couple, plus kokum and aam panna coolers.",
      costTier: 1,
      vibes: ["modern", "playful", "kid-friendly"],
    },
    {
      key: "sangeet-showcase",
      category: "activities",
      title: "Family sangeet showcase",
      description:
        "Each side of the family prepares one short dance; a host keeps the evening moving.",
      costTier: 1,
      vibes: ["cultural", "playful", "traditional"],
    },
    {
      key: "photo-booth",
      category: "activities",
      title: "Polaroid photo corner",
      description:
        "A props table and instant camera; guests stick a photo and a note in a guest book.",
      costTier: 1,
      vibes: ["playful", "modern", "boho"],
    },
    {
      key: "live-band",
      category: "activities",
      title: "Live folk ensemble",
      description: "Dhol, shehnai or a folk trio during the baraat and dinner.",
      costTier: 3,
      vibes: ["cultural", "traditional", "elegant"],
    },
    {
      key: "seed-paper",
      category: "favors",
      title: "Seed-paper thank-you cards",
      description: "Cards that can be planted to grow tulsi or marigold.",
      costTier: 1,
      vibes: ["eco-friendly", "minimal", "boho"],
    },
    {
      key: "mithai-box",
      category: "favors",
      title: "Mithai boxes from a local halwai",
      description: "Small boxes of regional sweets with a printed thank-you sleeve.",
      costTier: 2,
      vibes: ["traditional", "cultural", "elegant"],
    },
    {
      key: "brass-diya",
      category: "favors",
      title: "Engraved brass diyas",
      description: "A keepsake diya engraved with the date for close family.",
      costTier: 3,
      vibes: ["traditional", "elegant", "cultural"],
    },
  ],
  summary: ({ title, location, guestCount, budgetText, dateText, vibes }) =>
    `${title} in ${location} for ${guestCount} guests on ${dateText}, with a total budget of ${budgetText}. ` +
    `The plan puts food and the venue first, keeps a buffer for surprises, and leans ${vibes}. ` +
    "Book the venue and photographer first: they fill up earliest.",
};
