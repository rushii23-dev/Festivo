/**
 * The occasion catalog: what people choose on the wizard's first step, in four
 * groups (the meetups follow Luma's discover categories). Each occasion says
 * which planning family and profile it uses, and which questions apply to it,
 * so the wizard only asks what matters for that kind of event.
 */
import {
  OCCASIONS,
  type EventType,
  type Format,
  type Occasion,
  type OccasionGroup,
  type Vibe,
} from "@/lib/schemas/common";
import type { ProfileId } from "./profiles";

export interface OccasionInfo {
  id: Occasion;
  group: OccasionGroup;
  label: string;
  description: string;
  eventType: EventType;
  profile: ProfileId;
  /** Formats offered, the first is the default. One entry: the question is skipped. */
  formats: readonly Format[];
  /** Ask about free or paid tickets, capacity and approval. */
  tickets?: boolean;
  /** Offer wedding functions (haldi, mehendi…). */
  ceremonies?: boolean;
  /** Ask the age being celebrated. */
  age?: boolean;
  /** Ask whether children will come. */
  kids?: boolean;
  /** Ask how many days it runs. */
  multiDay?: boolean;
}

export const OCCASION_GROUP_COPY: Record<
  OccasionGroup,
  { title: string; description: string }
> = {
  life: {
    title: "Life moments",
    description: "Weddings, birthdays and the milestones in between.",
  },
  festival: {
    title: "Festivals",
    description: "Diwali, Holi, Eid, Christmas and gatherings of the season.",
  },
  meetup: {
    title: "Meetups & communities",
    description: "Clubs, circles and get-togethers around something you love.",
  },
  work: {
    title: "Work & causes",
    description: "Conferences, hackathons, launches, offsites and fundraisers.",
  },
};

const IN_PERSON = ["in-person"] as const;
const IN_PERSON_OR_HYBRID = ["in-person", "hybrid"] as const;
const ANY_FORMAT = ["in-person", "online", "hybrid"] as const;

const CATALOG: Record<Occasion, Omit<OccasionInfo, "id">> = {
  // Life moments
  wedding: {
    group: "life",
    label: "Wedding",
    description: "From the mehendi to the reception, every function in one plan.",
    eventType: "wedding",
    profile: "wedding",
    formats: IN_PERSON_OR_HYBRID,
    ceremonies: true,
    multiDay: true,
  },
  engagement: {
    group: "life",
    label: "Engagement",
    description: "A ring ceremony or roka with both families.",
    eventType: "wedding",
    profile: "gathering",
    formats: IN_PERSON,
    ceremonies: true,
  },
  anniversary: {
    group: "life",
    label: "Anniversary",
    description: "A dinner for two or a party for the people who were there.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
  },
  birthday: {
    group: "life",
    label: "Birthday",
    description: "A first birthday, a surprise fortieth, a garden party for eighty.",
    eventType: "birthday",
    profile: "birthday",
    formats: IN_PERSON_OR_HYBRID,
    age: true,
  },
  "baby-shower": {
    group: "life",
    label: "Baby shower",
    description: "A godh bharai or shower for the parents-to-be.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
  },
  "naming-ceremony": {
    group: "life",
    label: "Naming ceremony",
    description: "A naamkaran, christening or welcome for a new arrival.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
    kids: true,
  },
  graduation: {
    group: "life",
    label: "Graduation",
    description: "Celebrate the degree with family, friends and classmates.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
  },
  retirement: {
    group: "life",
    label: "Retirement",
    description: "Honour a career with the colleagues and family who shared it.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON_OR_HYBRID,
  },
  farewell: {
    group: "life",
    label: "Farewell",
    description: "A send-off before a move, a new job or a long journey.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
  },
  housewarming: {
    group: "life",
    label: "Housewarming",
    description: "A griha pravesh or open house in a new home.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
    kids: true,
  },
  // Festivals
  diwali: {
    group: "festival",
    label: "Diwali party",
    description: "Diyas, rangoli, sweets and cards with family and friends.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
    kids: true,
  },
  holi: {
    group: "festival",
    label: "Holi",
    description: "Colours, music and thandai for the street or the society.",
    eventType: "community",
    profile: "festival",
    formats: IN_PERSON,
    tickets: true,
    kids: true,
  },
  eid: {
    group: "festival",
    label: "Eid gathering",
    description: "An iftar or Eid feast with family and neighbours.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
    kids: true,
  },
  christmas: {
    group: "festival",
    label: "Christmas",
    description: "A dinner, a carol night or a party around the tree.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON,
    kids: true,
  },
  navratri: {
    group: "festival",
    label: "Navratri & garba",
    description: "Nine nights of garba and dandiya, with passes and a live band.",
    eventType: "community",
    profile: "festival",
    formats: IN_PERSON,
    tickets: true,
    multiDay: true,
  },
  puja: {
    group: "festival",
    label: "Puja",
    description: "A Ganesh, Durga or Satyanarayan puja at home or in a pandal.",
    eventType: "birthday",
    profile: "gathering",
    formats: IN_PERSON_OR_HYBRID,
    kids: true,
  },
  "community-festival": {
    group: "festival",
    label: "Community festival",
    description: "Street fairs, melas and neighbourhood get-togethers.",
    eventType: "community",
    profile: "festival",
    formats: IN_PERSON,
    tickets: true,
    kids: true,
    multiDay: true,
  },
  // Meetups and communities
  "tech-meetup": {
    group: "meetup",
    label: "Tech meetup",
    description: "Talks, demos and pizza for builders and tinkerers.",
    eventType: "community",
    profile: "meetup",
    formats: ANY_FORMAT,
    tickets: true,
  },
  "ai-meetup": {
    group: "meetup",
    label: "AI meetup",
    description: "Paper readings, demo nights and model hack evenings.",
    eventType: "community",
    profile: "meetup",
    formats: ANY_FORMAT,
    tickets: true,
  },
  "crypto-meetup": {
    group: "meetup",
    label: "Crypto & web3",
    description: "Founder chats, workshops and community nights.",
    eventType: "community",
    profile: "meetup",
    formats: ANY_FORMAT,
    tickets: true,
  },
  "book-club": {
    group: "meetup",
    label: "Book club",
    description: "One book, good chai and an honest conversation.",
    eventType: "community",
    profile: "meetup",
    formats: ANY_FORMAT,
    tickets: true,
  },
  "game-night": {
    group: "meetup",
    label: "Game night",
    description: "Board games, quizzes or a console tournament.",
    eventType: "community",
    profile: "meetup",
    formats: ANY_FORMAT,
    tickets: true,
  },
  "running-club": {
    group: "meetup",
    label: "Running club",
    description: "A weekend run, a 5K or a fun run for a cause.",
    eventType: "community",
    profile: "active",
    formats: IN_PERSON,
    tickets: true,
  },
  "fitness-class": {
    group: "meetup",
    label: "Fitness class",
    description: "Yoga in the park, a bootcamp or a dance workout.",
    eventType: "community",
    profile: "active",
    formats: ANY_FORMAT,
    tickets: true,
  },
  wellness: {
    group: "meetup",
    label: "Wellness",
    description: "Sound baths, breathwork, retreats and quiet mornings.",
    eventType: "community",
    profile: "active",
    formats: ANY_FORMAT,
    tickets: true,
    multiDay: true,
  },
  "arts-culture": {
    group: "meetup",
    label: "Arts & culture",
    description: "Open mics, gallery walks, film screenings and poetry.",
    eventType: "community",
    profile: "meetup",
    formats: IN_PERSON_OR_HYBRID,
    tickets: true,
  },
  climate: {
    group: "meetup",
    label: "Climate",
    description: "Clean-ups, tree plantings, swaps and climate talks.",
    eventType: "community",
    profile: "meetup",
    formats: IN_PERSON_OR_HYBRID,
    tickets: true,
    kids: true,
  },
  "food-drink": {
    group: "meetup",
    label: "Food & drink",
    description: "Supper clubs, tastings, potlucks and coffee mornings.",
    eventType: "community",
    profile: "meetup",
    formats: IN_PERSON,
    tickets: true,
  },
  "family-day": {
    group: "meetup",
    label: "Family day",
    description: "Picnics, fun fairs and weekend outings for every age.",
    eventType: "community",
    profile: "festival",
    formats: IN_PERSON,
    tickets: true,
    kids: true,
  },
  // Work and causes
  conference: {
    group: "work",
    label: "Conference",
    description: "Keynotes, panels and breakout rooms across one or more days.",
    eventType: "community",
    profile: "conference",
    formats: ANY_FORMAT,
    tickets: true,
    multiDay: true,
  },
  hackathon: {
    group: "work",
    label: "Hackathon",
    description: "Teams, mentors, prizes and a night of building.",
    eventType: "community",
    profile: "hackathon",
    formats: ANY_FORMAT,
    tickets: true,
    multiDay: true,
  },
  workshop: {
    group: "work",
    label: "Workshop",
    description: "A hands-on class or training with one clear outcome.",
    eventType: "community",
    profile: "workshop",
    formats: ANY_FORMAT,
    tickets: true,
  },
  networking: {
    group: "work",
    label: "Networking",
    description: "Mixers, founder dinners and industry evenings.",
    eventType: "community",
    profile: "meetup",
    formats: IN_PERSON,
    tickets: true,
  },
  "product-launch": {
    group: "work",
    label: "Product launch",
    description: "Unveil something new to press, partners and customers.",
    eventType: "community",
    profile: "launch",
    formats: ANY_FORMAT,
    tickets: true,
  },
  "team-offsite": {
    group: "work",
    label: "Team offsite",
    description: "Strategy sessions, team games and time away together.",
    eventType: "community",
    profile: "offsite",
    formats: IN_PERSON,
    multiDay: true,
  },
  fundraiser: {
    group: "work",
    label: "Fundraiser",
    description: "A gala, auction or charity drive for a cause you care about.",
    eventType: "community",
    profile: "fundraiser",
    formats: IN_PERSON_OR_HYBRID,
    tickets: true,
  },
};

export const OCCASION_INFO = Object.fromEntries(
  OCCASIONS.map((id) => [id, { id, ...CATALOG[id] }]),
) as Record<Occasion, OccasionInfo>;

export function occasionsIn(group: OccasionGroup): OccasionInfo[] {
  return OCCASIONS.map((id) => OCCASION_INFO[id]).filter((o) => o.group === group);
}

/** The occasion assumed for plans made before occasions existed. */
export const DEFAULT_OCCASION: Record<EventType, Occasion> = {
  wedding: "wedding",
  birthday: "birthday",
  community: "community-festival",
};

/** Styles that make sense for each group, in the order they are offered. */
export const VIBES_BY_GROUP: Record<OccasionGroup, readonly Vibe[]> = {
  life: [
    "elegant",
    "traditional",
    "cultural",
    "modern",
    "minimal",
    "boho",
    "rustic",
    "cozy",
    "playful",
    "kid-friendly",
    "eco-friendly",
  ],
  festival: [
    "traditional",
    "cultural",
    "elegant",
    "playful",
    "high-energy",
    "cozy",
    "kid-friendly",
    "eco-friendly",
    "minimal",
  ],
  meetup: [
    "casual",
    "cozy",
    "high-energy",
    "playful",
    "professional",
    "modern",
    "minimal",
    "kid-friendly",
    "eco-friendly",
  ],
  work: [
    "professional",
    "modern",
    "minimal",
    "high-energy",
    "casual",
    "elegant",
    "eco-friendly",
  ],
};
