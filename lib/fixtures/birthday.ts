import type { FixtureContent } from "./types";

export const birthdayFixture: FixtureContent = {
  rationales: {
    venue:
      "A café room, party hall or rooftop; home parties can move this into food and décor.",
    catering: "Snacks, a main and drinks sized for your guest count.",
    cake: "The centrepiece: sized to serve everyone with a little left over.",
    decor: "Balloons, a backdrop for photos and table styling around one theme.",
    entertainment: "A host, games, a magician or a playlist with a good speaker.",
    photography:
      "A photographer for an hour or two catches the cake moment and group shots.",
    favors: "Small return gifts, especially if children are coming.",
    invitations: "Digital invites with an RSVP link cost almost nothing.",
    misc: "Candles, plates, tips and the things you forget until the day.",
  },
  ideas: [
    {
      key: "retro-arcade",
      category: "theme",
      title: "Retro arcade night",
      description:
        "Neon colours, pixel-art signs and a couple of rented arcade machines.",
      costTier: 2,
      vibes: ["playful", "modern"],
    },
    {
      key: "garden-picnic",
      category: "theme",
      title: "Garden picnic",
      description:
        "Rugs, cushions and low tables outdoors with lanterns for the evening.",
      costTier: 1,
      vibes: ["boho", "rustic", "kid-friendly", "eco-friendly"],
    },
    {
      key: "black-tie-dinner",
      category: "theme",
      title: "Black-and-gold dinner",
      description:
        "A seated dinner with candlelight and a dress code for a milestone birthday.",
      costTier: 3,
      vibes: ["elegant", "modern"],
    },
    {
      key: "balloon-wall",
      category: "decor",
      title: "Balloon garland photo wall",
      description: "An organic balloon arch in the theme colours behind the cake table.",
      costTier: 1,
      vibes: ["playful", "kid-friendly", "modern"],
    },
    {
      key: "memory-line",
      category: "decor",
      title: "Through-the-years photo line",
      description: "A string of photos from every year of the guest of honour's life.",
      costTier: 1,
      vibes: ["minimal", "boho", "elegant"],
    },
    {
      key: "reusable-bunting",
      category: "decor",
      title: "Reusable fabric bunting",
      description: "Cotton bunting that can be used for every birthday after this one.",
      costTier: 1,
      vibes: ["eco-friendly", "rustic", "kid-friendly"],
    },
    {
      key: "build-a-taco",
      category: "food",
      title: "Build-your-own taco bar",
      description: "Easy to make vegetarian, vegan and gluten-free options side by side.",
      costTier: 2,
      vibes: ["playful", "modern"],
    },
    {
      key: "mini-desserts",
      category: "food",
      title: "Mini dessert table",
      description: "Cupcakes, brownies and mithai bites alongside a smaller cake.",
      costTier: 2,
      vibes: ["elegant", "kid-friendly"],
    },
    {
      key: "pizza-party",
      category: "food",
      title: "Wood-fired pizza truck",
      description: "A pizza truck parks outside and cooks to order.",
      costTier: 3,
      vibes: ["playful", "rustic"],
    },
    {
      key: "treasure-hunt",
      category: "activities",
      title: "Treasure hunt",
      description: "Clues hidden around the venue that lead to the cake.",
      costTier: 1,
      vibes: ["kid-friendly", "playful"],
    },
    {
      key: "karaoke",
      category: "activities",
      title: "Karaoke hour",
      description: "A speaker, two microphones and a shared song list.",
      costTier: 1,
      vibes: ["playful", "modern"],
    },
    {
      key: "workshop",
      category: "activities",
      title: "Hands-on workshop",
      description:
        "Pottery, terrarium or cupcake decorating, with a host who brings supplies.",
      costTier: 3,
      vibes: ["boho", "eco-friendly", "kid-friendly"],
    },
    {
      key: "plant-favor",
      category: "favors",
      title: "Succulent in a tiny pot",
      description: "A small plant with a thank-you tag.",
      costTier: 1,
      vibes: ["eco-friendly", "boho", "minimal"],
    },
    {
      key: "craft-kit",
      category: "favors",
      title: "Mini craft kit",
      description:
        "A paper bag with crayons, stickers and a colouring sheet in the party theme.",
      costTier: 1,
      vibes: ["kid-friendly", "playful"],
    },
    {
      key: "custom-cookies",
      category: "favors",
      title: "Iced name cookies",
      description: "A cookie iced with each guest's name doubles as a place card.",
      costTier: 2,
      vibes: ["playful", "kid-friendly", "elegant"],
    },
  ],
  summary: ({ title, location, guestCount, budgetText, dateText, vibes }) =>
    `${title} in ${location} for ${guestCount} guests on ${dateText}, with ${budgetText} to spend. ` +
    `Food and the cake get the biggest share, with a ${vibes} feel throughout. ` +
    "Send invitations about four weeks ahead and order the cake two weeks out.",
};
