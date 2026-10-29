import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/timeline/dates";
import {
  DEFAULT_DRAFT,
  STEPS,
  STEP_FIELDS,
  draftEventDate,
  draftQuestions,
  firstInvalidStep,
  parseGuestCount,
  toEventInput,
  toggleValue,
  upcomingMonths,
  validateStep,
  withGroup,
  withOccasion,
  type WizardDraft,
} from "@/lib/wizard/draft";

const TODAY = "2026-10-26";

const complete: WizardDraft = {
  ...DEFAULT_DRAFT,
  eventType: "wedding",
  group: "life",
  occasion: "wedding",
  name: "Priya & Arjun",
  date: "2027-02-14",
  location: "Jaipur",
  guestCount: "250",
  budgetTotal: "25,00,000",
  vibes: ["traditional"],
  ceremonies: ["mehendi"],
  mustHaves: "Live dhol",
};

describe("validateStep", () => {
  it("requires a group, then an occasion", () => {
    expect(validateStep("type", DEFAULT_DRAFT, TODAY)).toEqual({
      group: "Choose the kind of event you're planning.",
    });
    expect(validateStep("type", { ...DEFAULT_DRAFT, group: "meetup" }, TODAY)).toEqual({
      occasion: "Choose the occasion you're planning.",
    });
    expect(validateStep("type", complete, TODAY)).toEqual({});
  });

  it("reports every missing basic, in field order", () => {
    const errors = validateStep(
      "basics",
      { ...DEFAULT_DRAFT, eventType: "birthday" },
      TODAY,
    );
    expect(Object.keys(errors)).toEqual(["name", "date", "location", "guestCount"]);
    expect(STEP_FIELDS.basics.filter((f) => errors[f])[0]).toBe("name");
  });

  it.each([
    [{ date: "2026-10-01" }, "date", "Pick today or a date in the future."],
    [{ date: "2040-01-01" }, "date", "Pick a date within the next five years."],
    [{ date: "not-a-date" }, "date", "Use a date like 2027-02-14."],
    [{ guestCount: "lots" }, "guestCount", "Use a whole number, like 120."],
    [{ guestCount: "0" }, "guestCount", "Invite at least one guest."],
    [{ guestCount: "9000" }, "guestCount", "Festivo plans for up to 5000 guests."],
    [{ location: "X" }, "location", "Enter a city or place."],
    [{ name: "x".repeat(81) }, "name", "Event name must be 80 characters or fewer."],
  ])("explains %o", (patch, field, message) => {
    expect(
      validateStep("basics", { ...complete, ...patch }, TODAY)[
        field as keyof WizardDraft
      ],
    ).toBe(message);
  });

  it("validates flexible months only when one is chosen", () => {
    const flexible = { ...complete, dateKind: "flexible" as const, date: "" };
    expect(validateStep("basics", flexible, TODAY)).toEqual({});
    expect(
      validateStep("basics", { ...flexible, month: "2026-01" }, TODAY).month,
    ).toMatch(/later/);
    expect(validateStep("basics", { ...flexible, month: "2027-03" }, TODAY)).toEqual({});
  });

  it("checks the budget", () => {
    expect(
      validateStep("budget", { ...complete, budgetTotal: "" }, TODAY).budgetTotal,
    ).toBe("Enter your total budget.");
    expect(
      validateStep("budget", { ...complete, budgetTotal: "2.5L" }, TODAY).budgetTotal,
    ).toBe("Use numbers only, like 250000.");
    expect(
      validateStep("budget", { ...complete, budgetTotal: "0" }, TODAY).budgetTotal,
    ).toBe("Budget must be more than zero.");
    expect(validateStep("budget", complete, TODAY)).toEqual({});
  });

  it("limits vibes and free text", () => {
    const tooMany = {
      ...complete,
      vibes: [
        "elegant",
        "boho",
        "minimal",
        "modern",
        "rustic",
        "playful",
        "cultural",
      ] as WizardDraft["vibes"],
    };
    expect(validateStep("vibe", tooMany, TODAY).vibes).toBe("Pick up to 6 styles.");
    expect(
      validateStep("constraints", { ...complete, mustAvoid: "x".repeat(501) }, TODAY)
        .mustAvoid,
    ).toBe("Must-avoids must be 500 characters or fewer.");
    expect(validateStep("review", complete, TODAY)).toEqual({});
  });
});

describe("whole-draft helpers", () => {
  it("finds the first step that needs attention", () => {
    expect(firstInvalidStep(DEFAULT_DRAFT, TODAY)).toBe("type");
    expect(firstInvalidStep({ ...complete, budgetTotal: "" }, TODAY)).toBe("budget");
    expect(firstInvalidStep(complete, TODAY)).toBeNull();
  });

  it("converts a complete draft into API input", () => {
    const result = toEventInput(complete);
    expect(result).toMatchObject({
      ok: true,
      input: {
        eventType: "wedding",
        date: { kind: "fixed", date: "2027-02-14" },
        guestCount: 250,
        budget: { total: 2_500_000, currency: "INR" },
        ceremonies: ["mehendi"],
        constraints: { mustHaves: "Live dhol", setting: "either" },
      },
    });
  });

  it("drops ceremonies for non-weddings and reports invalid drafts", () => {
    const birthday = toEventInput(withOccasion(complete, "birthday"));
    expect(birthday.ok && birthday.input.occasion).toBe("birthday");
    expect(birthday.ok && birthday.input.ceremonies).toEqual([]);
    expect(toEventInput(DEFAULT_DRAFT).ok).toBe(false);
  });

  it("maps flexible dates with and without a month", () => {
    expect(draftEventDate({ ...complete, dateKind: "flexible" })).toEqual({
      kind: "flexible",
    });
    expect(
      draftEventDate({ ...complete, dateKind: "flexible", month: "2027-03" }),
    ).toEqual({
      kind: "flexible",
      month: "2027-03",
    });
  });

  it("resets answers that no longer apply when the occasion changes", () => {
    const withPriorities = { ...complete, priorities: { photography: 5 } };
    expect(withOccasion(withPriorities, "wedding")).toBe(withPriorities);
    expect(
      withOccasion({ ...withPriorities, format: "hybrid", tickets: "paid" }, "book-club"),
    ).toMatchObject({
      group: "meetup",
      occasion: "book-club",
      eventType: "community",
      format: "hybrid",
      priorities: {},
      ceremonies: [],
      tickets: "paid",
    });
    // A naming ceremony is in person only and has no tickets.
    expect(
      withOccasion({ ...complete, format: "online", tickets: "free" }, "naming-ceremony"),
    ).toMatchObject({ format: "in-person", tickets: "none", eventType: "birthday" });
  });

  it("keeps the occasion only while its group stays chosen", () => {
    expect(withGroup(complete, "life")).toBe(complete);
    expect(withGroup(complete, "work")).toMatchObject({
      group: "work",
      occasion: "",
      eventType: "",
    });
  });

  it("parses guest counts and toggles values", () => {
    expect(parseGuestCount(" 1,200 ")).toBe(1200);
    expect(parseGuestCount("12.5")).toBeNull();
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleValue(["a"], "b")).toEqual(["a", "b"]);
  });

  it("lists upcoming months for the flexible picker", () => {
    const months = upcomingMonths(TODAY, 3);
    expect(months).toEqual([
      { value: "2026-10", label: "October 2026" },
      { value: "2026-11", label: "November 2026" },
      { value: "2026-12", label: "December 2026" },
    ]);
    expect(upcomingMonths("2026-12-31", 2)[1]?.value).toBe("2027-01");
  });

  it("has a title for every step", () => {
    expect(STEPS.map((s) => s.id)).toEqual(Object.keys(STEP_FIELDS));
    expect(addDays(TODAY, 1)).toBe("2026-10-27");
  });
});

describe("questions that follow the occasion", () => {
  const bookClub = withOccasion(
    {
      ...complete,
      dietary: ["vegan"],
      setting: "outdoor",
      accessibility: ["live-captions", "step-free-access"],
      vibes: ["cozy", "traditional"],
    },
    "book-club",
  );

  it("asks only what applies", () => {
    expect(draftQuestions(withOccasion(complete, "birthday"))).toMatchObject({
      age: true,
      tickets: false,
      ceremonies: false,
      formats: ["in-person", "hybrid"],
    });
    expect(draftQuestions(bookClub)).toMatchObject({
      age: false,
      tickets: true,
      multiDay: false,
      formats: ["in-person", "online", "hybrid"],
    });
    expect(draftQuestions(complete)).toMatchObject({ ceremonies: true, multiDay: true });
  });

  it("leaves in-person answers out of an online event", () => {
    const result = toEventInput({ ...bookClub, format: "online" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.input).toMatchObject({
      occasion: "book-club",
      format: "online",
      vibes: ["cozy"],
      constraints: { dietary: [], setting: "either", accessibility: ["live-captions"] },
    });
  });

  it("validates and maps tickets", () => {
    const paid = {
      ...bookClub,
      tickets: "paid" as const,
      ticketPrice: "",
      capacity: "lots",
    };
    expect(validateStep("budget", paid, TODAY)).toEqual({
      ticketPrice: "Enter a ticket price.",
      capacity: "Use a whole number, like 80.",
    });
    const fixed = { ...paid, ticketPrice: "199", capacity: "40", approval: true };
    expect(validateStep("budget", fixed, TODAY)).toEqual({});
    const result = toEventInput(fixed);
    expect(result.ok && result.input.tickets).toEqual({
      pricing: "paid",
      price: 199,
      capacity: 40,
      approval: true,
    });
    // Tickets are ignored where the occasion has none.
    const engagement = toEventInput({
      ...withOccasion(complete, "engagement"),
      tickets: "paid",
    });
    expect(engagement.ok && engagement.input.tickets).toBeUndefined();
  });

  it("checks days, age and children only where asked", () => {
    expect(validateStep("basics", { ...complete, days: "0" }, TODAY)).toEqual({
      days: "An event runs at least one day.",
    });
    const birthday = { ...withOccasion(complete, "birthday"), ageTurning: "seven" };
    expect(validateStep("basics", birthday, TODAY)).toEqual({
      ageTurning: "Use a whole number, like 7.",
    });
    const party = toEventInput({ ...birthday, ageTurning: "7", days: "3", kids: true });
    expect(party.ok && party.input.details).toEqual({ ageTurning: 7 });
    const diwali = toEventInput({ ...withOccasion(complete, "diwali"), kids: true });
    expect(diwali.ok && diwali.input.details).toEqual({ kids: true });
  });
});
