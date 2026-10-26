import type { FixtureContent } from "./types";

export const communityFixture: FixtureContent = {
  rationales: {
    venue:
      "Public spaces are cheap but need permits; halls cost more but include facilities.",
    catering: "Food stalls or a shared meal draw people in and keep them longer.",
    permits: "Sound, gathering and food permits, plus public liability insurance.",
    equipment: "PA system, stage, tents, chairs and power: the backbone of the day.",
    marketing: "Posters, social posts and community groups to get people there.",
    entertainment: "Local performers, a host and activities for every age.",
    volunteers: "T-shirts, meals and travel for volunteers who make the day run.",
    misc: "Weather backup, first aid supplies and unexpected costs.",
  },
  ideas: [
    {
      key: "street-fair",
      category: "theme",
      title: "Neighbourhood street fair",
      description: "Stalls from local makers, food and music along one closed street.",
      costTier: 2,
      vibes: ["playful", "cultural", "kid-friendly"],
    },
    {
      key: "zero-waste",
      category: "theme",
      title: "Zero-waste festival",
      description:
        "Steel plates, refill stations and sorted bins with volunteers to help.",
      costTier: 1,
      vibes: ["eco-friendly", "minimal"],
    },
    {
      key: "culture-night",
      category: "theme",
      title: "Cultures of our street",
      description:
        "Each community group hosts a table with food, music and a story from home.",
      costTier: 1,
      vibes: ["cultural", "traditional", "kid-friendly"],
    },
    {
      key: "upcycled-bunting",
      category: "decor",
      title: "Upcycled bunting workshop",
      description:
        "Residents make bunting from old fabric in the weeks before the event.",
      costTier: 1,
      vibes: ["eco-friendly", "rustic", "kid-friendly"],
    },
    {
      key: "light-trail",
      category: "decor",
      title: "Lantern trail",
      description: "Paper lanterns marking a step-free route between the main areas.",
      costTier: 2,
      vibes: ["elegant", "cultural", "boho"],
    },
    {
      key: "big-letters",
      category: "decor",
      title: "Giant name letters",
      description: "Large letters spelling the neighbourhood name for photos.",
      costTier: 2,
      vibes: ["playful", "modern"],
    },
    {
      key: "potluck",
      category: "food",
      title: "Community potluck table",
      description:
        "Residents bring a dish with an ingredients card; volunteers label allergens.",
      costTier: 1,
      vibes: ["cultural", "traditional", "eco-friendly"],
    },
    {
      key: "food-trucks",
      category: "food",
      title: "Local food trucks",
      description: "Invite three or four vendors who pay a small pitch fee.",
      costTier: 2,
      vibes: ["modern", "playful"],
    },
    {
      key: "chai-station",
      category: "food",
      title: "Free chai and water station",
      description: "Keeps people hydrated and gives volunteers a natural welcome point.",
      costTier: 1,
      vibes: ["traditional", "minimal", "kid-friendly"],
    },
    {
      key: "open-mic",
      category: "activities",
      title: "Open-mic stage",
      description: "Ten-minute slots for local musicians, poets and dance groups.",
      costTier: 1,
      vibes: ["playful", "cultural", "modern"],
    },
    {
      key: "kids-zone",
      category: "activities",
      title: "Kids' play zone",
      description: "Chalk drawing, sack races and a storytelling corner with shade.",
      costTier: 1,
      vibes: ["kid-friendly", "playful"],
    },
    {
      key: "headliner",
      category: "activities",
      title: "Evening headline act",
      description: "One well-known local band to close the day.",
      costTier: 3,
      vibes: ["modern", "cultural"],
    },
    {
      key: "tree-sapling",
      category: "favors",
      title: "Sapling giveaway",
      description: "Partner with a nursery to give away native saplings.",
      costTier: 2,
      vibes: ["eco-friendly", "rustic"],
    },
    {
      key: "tote",
      category: "favors",
      title: "Cloth tote bags",
      description:
        "Cotton totes printed with the event name; they replace plastic bags at the stalls.",
      costTier: 2,
      vibes: ["eco-friendly", "modern", "minimal"],
    },
    {
      key: "zine",
      category: "favors",
      title: "Neighbourhood zine",
      description: "A printed booklet of residents' stories, recipes and photos.",
      costTier: 1,
      vibes: ["cultural", "boho", "minimal"],
    },
  ],
  summary: ({ title, location, guestCount, budgetText, dateText, vibes }) =>
    `${title} in ${location}, expecting around ${guestCount} people on ${dateText}, with a budget of ${budgetText}. ` +
    `Permits and equipment come first, then food and performers, with a ${vibes} spirit. ` +
    "Apply for permits early: approvals can take several weeks.",
};
