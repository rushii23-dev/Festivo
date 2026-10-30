import { describe, expect, it } from "vitest";
import { EventInputSchema, LIMITS } from "@/lib/schemas/eventInput";
import { PlanSchema } from "@/lib/schemas/plan";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";

const validInput = {
  eventType: "wedding",
  name: "Priya & Arjun",
  date: { kind: "fixed", date: "2027-02-14" },
  location: "Jaipur",
  guestCount: 250,
  budget: { total: 2_500_000, currency: "INR", priorities: { photography: 5 } },
  vibes: ["traditional", "cultural"],
  ceremonies: ["mehendi", "sangeet"],
  constraints: {
    dietary: ["vegetarian", "jain"],
    accessibility: ["step-free-access"],
    setting: "outdoor",
    mustHaves: "Live dhol at the baraat",
    mustAvoid: "Plastic decorations",
  },
} as const;

const issues = (value: unknown) =>
  EventInputSchema.safeParse(value).error?.issues.map(
    (i) => `${i.path.join(".")}: ${i.code}`,
  ) ?? [];

describe("EventInputSchema", () => {
  it("accepts a complete input", () => {
    expect(EventInputSchema.parse(validInput)).toMatchObject({ guestCount: 250 });
  });

  it("applies defaults for optional sections", () => {
    const parsed = EventInputSchema.parse({
      eventType: "birthday",
      name: "Maya turns 7",
      date: { kind: "flexible" },
      location: "Pune",
      guestCount: 20,
      budget: { total: 30000, currency: "INR" },
    });
    expect(parsed).toMatchObject({
      vibes: [],
      ceremonies: [],
      budget: { priorities: {} },
      constraints: { dietary: [], setting: "either", mustHaves: "" },
    });
  });

  it("trims text fields", () => {
    expect(EventInputSchema.parse({ ...validInput, name: "  Priya  " }).name).toBe(
      "Priya",
    );
  });

  it("rejects unknown fields at every level", () => {
    expect(issues({ ...validInput, admin: true })).toEqual([": unrecognized_keys"]);
    expect(
      issues({ ...validInput, budget: { ...validInput.budget, discount: 5 } }),
    ).toEqual(["budget: unrecognized_keys"]);
  });

  it.each([
    ["eventType", { eventType: "funeral" }],
    ["name", { name: "" }],
    ["name", { name: "x".repeat(LIMITS.nameMax + 1) }],
    ["location", { location: "x" }],
    ["guestCount", { guestCount: 0 }],
    ["guestCount", { guestCount: 5001 }],
    ["guestCount", { guestCount: 12.5 }],
    ["budget.total", { budget: { total: 0, currency: "INR" } }],
    ["budget.total", { budget: { total: 2e9, currency: "INR" } }],
    ["budget.total", { budget: { total: Infinity, currency: "INR" } }],
    ["budget.total", { budget: { total: Number.NaN, currency: "INR" } }],
    ["budget.currency", { budget: { total: 100, currency: "JPY" } }],
    [
      "budget.priorities.venue",
      { budget: { total: 100, currency: "INR", priorities: { venue: 9 } } },
    ],
    ["date.date", { date: { kind: "fixed", date: "14/02/2027" } }],
    ["date.month", { date: { kind: "flexible", month: "2027-13" } }],
    [
      "vibes",
      {
        vibes: ["elegant", "boho", "minimal", "modern", "rustic", "playful", "cultural"],
      },
    ],
    ["vibes.0", { vibes: ["spooky"] }],
    [
      "constraints.mustHaves",
      { constraints: { ...validInput.constraints, mustHaves: "x".repeat(501) } },
    ],
  ])("rejects an invalid %s", (path, override) => {
    const result = EventInputSchema.safeParse({ ...validInput, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join("."))).toContain(path);
  });

  it("gives human-readable messages", () => {
    const result = EventInputSchema.safeParse({ ...validInput, guestCount: 0 });
    expect(result.error?.issues[0]?.message).toBe("Invite at least one guest.");
  });
});

describe("PlanSchema", () => {
  const plan = buildMockPlan(EventInputSchema.parse(validInput), {
    id: "plan-1",
    today: "2026-10-26",
    now: new Date("2026-10-26T10:00:00Z"),
  });

  it("accepts a generated plan", () => {
    expect(PlanSchema.safeParse(plan).success).toBe(true);
  });

  it("rejects fields the AI is not allowed to add", () => {
    expect(PlanSchema.safeParse({ ...plan, html: "<b>x</b>" }).success).toBe(false);
    const extraIdea = { ...plan, ideas: [{ ...plan.ideas[0], script: "x" }] };
    expect(PlanSchema.safeParse(extraIdea).success).toBe(false);
  });

  it.each([
    ["negative money", { totalBudget: -1 }],
    [
      "bad cost tier",
      {
        ideas: [
          { id: "i", category: "theme", title: "t", description: "d", costTier: 4 },
        ],
      },
    ],
    [
      "bad vendor status",
      { vendors: [{ id: "v", category: "venue", status: "maybe", questionsToAsk: [] }] },
    ],
    ["bad id", { id: "has spaces" }],
    [
      "bad time",
      {
        timeline: [
          {
            id: "t",
            phase: "Day of",
            title: "x",
            dueDate: "2027-02-14",
            time: "25:00",
            done: false,
          },
        ],
      },
    ],
    ["empty budget", { budget: [] }],
  ])("rejects %s", (_label, override) => {
    expect(PlanSchema.safeParse({ ...plan, ...override }).success).toBe(false);
  });
});
