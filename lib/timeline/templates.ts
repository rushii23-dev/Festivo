/**
 * Baseline task lists per event type. `daysBefore` is the ideal lead time:
 * 0 is the day itself, negative values are follow-ups after the event.
 */
import type { EventType } from "@/lib/schemas/common";

export interface TaskTemplate {
  key: string;
  title: string;
  description: string;
  daysBefore: number;
  /** Start time for day-of tasks, "HH:MM". */
  time?: string;
}

export const TASK_TEMPLATES: Record<EventType, TaskTemplate[]> = {
  wedding: [
    {
      key: "budget",
      title: "Agree the budget and guest list size",
      description:
        "Settle the total, who contributes, and a rough guest count with both families.",
      daysBefore: 180,
    },
    {
      key: "venue",
      title: "Shortlist and book the venue",
      description:
        "Visit at least three venues; confirm capacity, dates and what the fee includes.",
      daysBefore: 160,
    },
    {
      key: "photo",
      title: "Book photographer and videographer",
      description:
        "Compare portfolios and confirm hours, deliverables and the delivery date.",
      daysBefore: 140,
    },
    {
      key: "caterer",
      title: "Choose the caterer and run a tasting",
      description: "Lock the menu style, dietary options and per-plate price.",
      daysBefore: 120,
    },
    {
      key: "decor",
      title: "Brief the decorator",
      description:
        "Share the colour palette and mood references; agree a quote for each function.",
      daysBefore: 100,
    },
    {
      key: "attire",
      title: "Order wedding outfits",
      description: "Leave time for two fittings and alterations.",
      daysBefore: 90,
    },
    {
      key: "invites",
      title: "Send save-the-dates and invitations",
      description: "Digital or printed; include RSVP date and venue map.",
      daysBefore: 75,
    },
    {
      key: "music",
      title: "Book DJ, band or performers",
      description:
        "Confirm sound equipment, set length and the song list for key moments.",
      daysBefore: 60,
    },
    {
      key: "makeup",
      title: "Book makeup and hair trial",
      description: "Schedule the trial and confirm the team for each function.",
      daysBefore: 45,
    },
    {
      key: "transport",
      title: "Arrange guest transport and stays",
      description: "Block hotel rooms and plan pickups for out-of-town guests.",
      daysBefore: 40,
    },
    {
      key: "rsvp",
      title: "Chase RSVPs and confirm numbers",
      description: "Give final numbers to the caterer and venue.",
      daysBefore: 21,
    },
    {
      key: "runsheet",
      title: "Share the run sheet with vendors",
      description: "Send timings, contacts and the venue layout to every vendor.",
      daysBefore: 7,
    },
    {
      key: "payments",
      title: "Prepare final payments and tips",
      description: "Put balances and tips in labelled envelopes or schedule transfers.",
      daysBefore: 3,
    },
    {
      key: "setup",
      title: "Décor and venue set-up",
      description: "Decorator and venue team set up; check seating and stage.",
      daysBefore: 0,
      time: "08:00",
    },
    {
      key: "ceremony",
      title: "Ceremony begins",
      description: "Officiant and families in place; photographer on the stage.",
      daysBefore: 0,
      time: "11:00",
    },
    {
      key: "reception",
      title: "Reception and dinner",
      description: "Speeches, first dance and dinner service.",
      daysBefore: 0,
      time: "19:00",
    },
    {
      key: "thanks",
      title: "Send thank-you notes",
      description: "Thank guests and vendors; leave reviews for vendors you loved.",
      daysBefore: -7,
    },
    {
      key: "settle",
      title: "Settle accounts and return rentals",
      description: "Close every vendor balance and return borrowed or rented items.",
      daysBefore: -10,
    },
  ],
  birthday: [
    {
      key: "guests",
      title: "Draft the guest list",
      description:
        "Decide the size and who to invite; note any kids or elders attending.",
      daysBefore: 45,
    },
    {
      key: "venue",
      title: "Book the venue",
      description: "Home, a café or a hall: confirm capacity, timing and clean-up rules.",
      daysBefore: 40,
    },
    {
      key: "theme",
      title: "Pick a theme and colours",
      description: "Choose one theme to guide the décor, cake and invitations.",
      daysBefore: 35,
    },
    {
      key: "invites",
      title: "Send invitations",
      description: "Include the time, address, dress code and RSVP date.",
      daysBefore: 28,
    },
    {
      key: "entertainment",
      title: "Book entertainment",
      description:
        "DJ, magician, games host or a playlist; confirm timing and space needs.",
      daysBefore: 21,
    },
    {
      key: "cake",
      title: "Order the cake",
      description: "Confirm flavour, size for the guest count, and any allergens.",
      daysBefore: 14,
    },
    {
      key: "food",
      title: "Plan food and drinks",
      description: "Fix the menu, quantities and dietary options.",
      daysBefore: 10,
    },
    {
      key: "supplies",
      title: "Buy décor, favors and supplies",
      description: "Balloons, tableware, candles and return gifts.",
      daysBefore: 7,
    },
    {
      key: "confirm",
      title: "Confirm vendors and final numbers",
      description: "Call the venue, baker and entertainer with the final count.",
      daysBefore: 3,
    },
    {
      key: "setup",
      title: "Set up décor",
      description: "Hang decorations, lay the cake table and test the music.",
      daysBefore: 0,
      time: "15:00",
    },
    {
      key: "party",
      title: "Party starts",
      description: "Welcome guests; games and food.",
      daysBefore: 0,
      time: "17:00",
    },
    {
      key: "cut",
      title: "Cake cutting",
      description: "Gather everyone for the song and photos.",
      daysBefore: 0,
      time: "19:00",
    },
    {
      key: "thanks",
      title: "Thank guests and share photos",
      description: "Send thank-you messages and a photo album link.",
      daysBefore: -3,
    },
  ],
  community: [
    {
      key: "goals",
      title: "Define goals and form the core team",
      description: "Agree the purpose, audience and who owns what.",
      daysBefore: 120,
    },
    {
      key: "venue",
      title: "Secure the venue or public space",
      description: "Book the hall, park or street; get written confirmation.",
      daysBefore: 100,
    },
    {
      key: "permits",
      title: "Apply for permits and insurance",
      description: "Check local rules for gatherings, sound, food stalls and road use.",
      daysBefore: 90,
    },
    {
      key: "sponsors",
      title: "Approach sponsors and partners",
      description:
        "Prepare a one-page pitch; local businesses often cover food or prizes.",
      daysBefore: 75,
    },
    {
      key: "program",
      title: "Plan the programme and performers",
      description: "Fix the schedule, performers and speakers.",
      daysBefore: 60,
    },
    {
      key: "volunteers",
      title: "Recruit and brief volunteers",
      description: "Assign roles: registration, stalls, first aid, clean-up.",
      daysBefore: 45,
    },
    {
      key: "promo",
      title: "Launch promotion",
      description:
        "Posters, social posts and community groups; include an accessibility note.",
      daysBefore: 30,
    },
    {
      key: "av",
      title: "Book sound, stage and rentals",
      description: "Confirm the PA system, stage, tents, chairs and power.",
      daysBefore: 28,
    },
    {
      key: "food",
      title: "Confirm food vendors",
      description: "Agree menus, stall positions and hygiene requirements.",
      daysBefore: 21,
    },
    {
      key: "safety",
      title: "Write the safety and access plan",
      description: "Map exits, first aid, step-free routes and a quiet space.",
      daysBefore: 14,
    },
    {
      key: "walkthrough",
      title: "Venue walkthrough with leads",
      description: "Walk the site with team leads and finalise the layout.",
      daysBefore: 5,
    },
    {
      key: "setup",
      title: "Set up stage, stalls and signage",
      description: "Volunteers set up; test sound and accessibility routes.",
      daysBefore: 0,
      time: "07:00",
    },
    {
      key: "open",
      title: "Gates open",
      description: "Registration desk and welcome team ready.",
      daysBefore: 0,
      time: "10:00",
    },
    {
      key: "cleanup",
      title: "Clean-up and pack down",
      description: "Leave the space as you found it; recycle where possible.",
      daysBefore: 0,
      time: "18:00",
    },
    {
      key: "report",
      title: "Thank volunteers and share a recap",
      description: "Post photos, attendance and thank sponsors publicly.",
      daysBefore: -5,
    },
    {
      key: "debrief",
      title: "Hold a debrief",
      description: "Note what worked and what to change next time.",
      daysBefore: -14,
    },
  ],
};
