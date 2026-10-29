/**
 * Planning profiles: the budget split, vendors and timeline changes shared by
 * similar occasions (every meetup splits money the same way, a hackathon has
 * prizes, a puja needs a priest). Shares are typical planning splits, not
 * prices; each profile's shares sum to 1.
 */
import type { BudgetCategory } from "@/lib/schemas/common";
import type { VendorCategory } from "@/lib/schemas/plan";
import type { TaskTemplate } from "@/lib/timeline/templates";

export const PROFILE_IDS = [
  "wedding",
  "birthday",
  "gathering",
  "festival",
  "meetup",
  "active",
  "conference",
  "hackathon",
  "workshop",
  "launch",
  "offsite",
  "fundraiser",
] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

/** Which set of demo-mode rationales and ideas a profile draws on. */
export type FixtureKey =
  "wedding" | "birthday" | "community" | "gathering" | "meetup" | "active" | "work";

export interface PlanningProfile {
  shares: Partial<Record<BudgetCategory, number>>;
  vendors: VendorCategory[];
  /** Keys of the family's base tasks that do not apply. */
  dropTasks?: readonly string[];
  /** Added tasks; one with a base task's key replaces it. */
  tasks?: readonly TaskTemplate[];
  fixture: FixtureKey;
}

const doorsOpen = (time: string): TaskTemplate => ({
  key: "open",
  title: "Doors open",
  description: "Welcome people at the door and start on time.",
  daysBefore: 0,
  time,
});

/** Small and medium events skip the permits and safety paperwork of a street fair. */
const SMALL_EVENT_DROPS = ["permits", "sponsors", "volunteers", "safety", "report"];

export const PROFILES: Record<ProfileId, PlanningProfile> = {
  wedding: {
    shares: {
      venue: 0.22,
      catering: 0.28,
      decor: 0.12,
      photography: 0.1,
      attire: 0.1,
      entertainment: 0.06,
      invitations: 0.02,
      favors: 0.03,
      transport: 0.02,
      misc: 0.05,
    },
    vendors: [
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
    fixture: "wedding",
  },
  birthday: {
    shares: {
      venue: 0.18,
      catering: 0.28,
      cake: 0.1,
      decor: 0.13,
      entertainment: 0.12,
      photography: 0.06,
      favors: 0.05,
      invitations: 0.02,
      misc: 0.06,
    },
    vendors: [
      "venue",
      "caterer",
      "baker",
      "decorator",
      "photographer",
      "performer",
      "printer",
    ],
    fixture: "birthday",
  },
  gathering: {
    shares: {
      venue: 0.12,
      catering: 0.34,
      decor: 0.16,
      rituals: 0.08,
      photography: 0.08,
      entertainment: 0.06,
      favors: 0.08,
      invitations: 0.02,
      misc: 0.06,
    },
    vendors: ["venue", "caterer", "decorator", "florist", "officiant", "photographer"],
    dropTasks: ["cake", "cut"],
    tasks: [
      {
        key: "rituals",
        title: "Book the priest or host and gather what the rituals need",
        description: "Confirm the muhurat or programme, and list the items to buy.",
        daysBefore: 21,
      },
      {
        key: "party",
        title: "Guests arrive",
        description: "Welcome everyone and keep the order of the day moving.",
        daysBefore: 0,
        time: "18:00",
      },
    ],
    fixture: "gathering",
  },
  festival: {
    shares: {
      venue: 0.2,
      catering: 0.22,
      permits: 0.08,
      equipment: 0.14,
      marketing: 0.1,
      entertainment: 0.1,
      volunteers: 0.08,
      misc: 0.08,
    },
    vendors: [
      "venue",
      "permits-office",
      "caterer",
      "sound-and-av",
      "rentals",
      "performer",
      "printer",
      "volunteer-lead",
    ],
    fixture: "community",
  },
  meetup: {
    shares: {
      venue: 0.25,
      catering: 0.32,
      equipment: 0.12,
      speakers: 0.1,
      marketing: 0.08,
      favors: 0.05,
      misc: 0.08,
    },
    vendors: ["venue", "caterer", "sound-and-av", "speaker", "photographer"],
    dropTasks: SMALL_EVENT_DROPS,
    tasks: [
      {
        key: "program",
        title: "Line up speakers, hosts or the evening's format",
        description: "Agree topics, timings and who introduces whom.",
        daysBefore: 30,
      },
      {
        key: "av",
        title: "Check the projector, mics and Wi-Fi",
        description: "Test them at the venue with a laptop and the slides.",
        daysBefore: 7,
      },
      doorsOpen("18:30"),
    ],
    fixture: "meetup",
  },
  active: {
    shares: {
      venue: 0.14,
      permits: 0.08,
      equipment: 0.16,
      speakers: 0.14,
      catering: 0.14,
      favors: 0.12,
      marketing: 0.08,
      photography: 0.05,
      misc: 0.09,
    },
    vendors: [
      "venue",
      "permits-office",
      "speaker",
      "rentals",
      "caterer",
      "merch",
      "photographer",
    ],
    dropTasks: ["sponsors", "report"],
    tasks: [
      {
        key: "program",
        title: "Plan the route or session with the coach",
        description: "Distances, levels, warm-up and cool-down, and a backup for rain.",
        daysBefore: 45,
      },
      {
        key: "food",
        title: "Arrange water, fruit and first aid",
        description: "Plan a station every few kilometres or by the mat area.",
        daysBefore: 10,
      },
      {
        key: "open",
        title: "Warm-up starts",
        description: "Check people in, warm up together and set off on time.",
        daysBefore: 0,
        time: "06:30",
      },
    ],
    fixture: "active",
  },
  conference: {
    shares: {
      venue: 0.24,
      catering: 0.2,
      equipment: 0.15,
      speakers: 0.12,
      marketing: 0.1,
      favors: 0.05,
      volunteers: 0.05,
      photography: 0.03,
      misc: 0.06,
    },
    vendors: [
      "venue",
      "caterer",
      "sound-and-av",
      "speaker",
      "ticketing",
      "printer",
      "merch",
      "photographer",
      "volunteer-lead",
    ],
    dropTasks: ["permits"],
    tasks: [
      {
        key: "program",
        title: "Confirm speakers and publish the agenda",
        description: "Collect bios, talk titles and slides; leave room for breaks.",
        daysBefore: 60,
      },
      {
        key: "badges",
        title: "Print badges and signage",
        description: "Names large enough to read from a step away, and clear room signs.",
        daysBefore: 7,
      },
      { ...doorsOpen("08:30"), title: "Registration opens" },
    ],
    fixture: "work",
  },
  hackathon: {
    shares: {
      venue: 0.15,
      catering: 0.28,
      prizes: 0.2,
      equipment: 0.1,
      favors: 0.09,
      marketing: 0.06,
      speakers: 0.04,
      misc: 0.08,
    },
    vendors: ["venue", "caterer", "sound-and-av", "speaker", "ticketing", "merch"],
    dropTasks: ["permits", "safety"],
    tasks: [
      {
        key: "program",
        title: "Set the themes, rules and judging criteria",
        description: "Publish them with the schedule so teams can prepare.",
        daysBefore: 45,
      },
      {
        key: "judges",
        title: "Line up mentors, judges and prizes",
        description: "Confirm who judges which track and how prizes are paid.",
        daysBefore: 35,
      },
      { ...doorsOpen("09:00"), title: "Check-in and kick-off" },
      {
        key: "judging",
        title: "Demos, judging and awards",
        description: "Keep demos short, judge on the published criteria, then celebrate.",
        daysBefore: 0,
        time: "17:00",
      },
    ],
    fixture: "work",
  },
  workshop: {
    shares: {
      venue: 0.2,
      speakers: 0.3,
      equipment: 0.12,
      catering: 0.15,
      marketing: 0.1,
      favors: 0.05,
      misc: 0.08,
    },
    vendors: ["venue", "speaker", "caterer", "sound-and-av", "printer"],
    dropTasks: SMALL_EVENT_DROPS,
    tasks: [
      {
        key: "program",
        title: "Agree the outline and outcome with the instructor",
        description: "Decide what people will be able to do by the end of the session.",
        daysBefore: 30,
      },
      {
        key: "materials",
        title: "Prepare materials and the pre-reading",
        description: "Print handouts, set up laptops or kits, and email the pre-reading.",
        daysBefore: 10,
      },
      doorsOpen("10:00"),
    ],
    fixture: "work",
  },
  launch: {
    shares: {
      venue: 0.2,
      catering: 0.18,
      decor: 0.1,
      equipment: 0.15,
      marketing: 0.17,
      photography: 0.1,
      misc: 0.1,
    },
    vendors: [
      "venue",
      "caterer",
      "decorator",
      "sound-and-av",
      "photographer",
      "videographer",
      "printer",
    ],
    dropTasks: ["permits", "volunteers"],
    tasks: [
      {
        key: "press",
        title: "Prepare the demo, press kit and guest list",
        description: "Rehearse the demo twice and send the press kit under embargo.",
        daysBefore: 21,
      },
      { ...doorsOpen("18:00"), title: "Guests arrive" },
    ],
    fixture: "work",
  },
  offsite: {
    shares: {
      venue: 0.35,
      catering: 0.25,
      transport: 0.12,
      entertainment: 0.1,
      speakers: 0.06,
      favors: 0.04,
      misc: 0.08,
    },
    vendors: ["venue", "caterer", "transport", "speaker", "performer"],
    dropTasks: SMALL_EVENT_DROPS,
    tasks: [
      {
        key: "program",
        title: "Plan sessions and team activities",
        description: "Balance work sessions with free time and one shared activity.",
        daysBefore: 30,
      },
      {
        key: "travel",
        title: "Book travel and rooms",
        description: "Collect names, dietary needs and room-sharing preferences first.",
        daysBefore: 40,
      },
      { ...doorsOpen("09:30"), title: "Day one begins" },
    ],
    fixture: "work",
  },
  fundraiser: {
    shares: {
      venue: 0.2,
      catering: 0.24,
      entertainment: 0.1,
      marketing: 0.15,
      decor: 0.1,
      permits: 0.05,
      volunteers: 0.06,
      misc: 0.1,
    },
    vendors: [
      "venue",
      "caterer",
      "decorator",
      "performer",
      "ticketing",
      "printer",
      "volunteer-lead",
    ],
    tasks: [
      {
        key: "goal",
        title: "Set the fundraising goal and donation page",
        description: "Share the goal publicly and test the donation page on a phone.",
        daysBefore: 60,
      },
      { ...doorsOpen("19:00"), title: "Guests arrive" },
    ],
    fixture: "community",
  },
};

/** Budget lines that need a physical venue; online events skip them. */
export const IN_PERSON_ONLY_CATEGORIES: ReadonlySet<BudgetCategory> = new Set([
  "venue",
  "catering",
  "cake",
  "decor",
  "transport",
  "permits",
]);

/** Vendors that need a physical venue; online events skip them. */
export const IN_PERSON_ONLY_VENDORS: ReadonlySet<VendorCategory> = new Set([
  "venue",
  "caterer",
  "baker",
  "decorator",
  "florist",
  "transport",
  "rentals",
  "permits-office",
  "makeup-artist",
  "volunteer-lead",
]);

/** Base tasks that need a physical venue; online events skip them. */
export const IN_PERSON_ONLY_TASKS: ReadonlySet<string> = new Set([
  "venue",
  "caterer",
  "decor",
  "attire",
  "makeup",
  "transport",
  "cake",
  "cut",
  "food",
  "supplies",
  "setup",
  "permits",
  "av",
  "safety",
  "walkthrough",
  "cleanup",
  "travel",
  "badges",
]);

export const ONLINE_TASKS: readonly TaskTemplate[] = [
  {
    key: "platform",
    title: "Choose the platform and set up the event page",
    description: "Pick Zoom, Meet or a stream, and test it with a co-host.",
    daysBefore: 30,
  },
  {
    key: "rehearsal",
    title: "Run a tech rehearsal",
    description: "Check audio, screen sharing, recording and who admits guests.",
    daysBefore: 3,
  },
  {
    key: "links",
    title: "Send join links and a reminder",
    description: "Send the link a day before and again an hour before the start.",
    daysBefore: 1,
  },
];

export const TICKET_TASKS: readonly TaskTemplate[] = [
  {
    key: "tickets",
    title: "Open registration",
    description: "Publish the page with the price, capacity and what guests get.",
    daysBefore: 35,
  },
  {
    key: "reminders",
    title: "Remind registered guests and release unused spots",
    description: "Ask people to cancel if they cannot come, and invite the waitlist.",
    daysBefore: 2,
  },
];

export const KIDS_TASK: TaskTemplate = {
  key: "kids",
  title: "Plan a kids' corner with an adult in charge",
  description: "Games, a quiet space and snacks children like.",
  daysBefore: 14,
};

export const MULTI_DAY_TASK: TaskTemplate = {
  key: "schedule",
  title: "Draw up a day-by-day schedule",
  description: "Who needs to be where on each day, with travel and rest.",
  daysBefore: 30,
};
