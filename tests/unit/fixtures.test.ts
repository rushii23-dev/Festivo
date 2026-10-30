import { vendorsFor } from "@/lib/events/kind";
import { describe, expect, it } from "vitest";
import { FIXTURES, buildMockPlan, selectIdeas } from "@/lib/fixtures/buildMockPlan";
import { categoriesFor } from "@/lib/budget/categories";
import { OCCASION_INFO } from "@/lib/events/occasions";
import { EVENT_TYPES, OCCASIONS, type EventType } from "@/lib/schemas/common";
import { EventInputSchema, type EventInputDraft } from "@/lib/schemas/eventInput";
import { IDEA_CATEGORIES, PlanSchema } from "@/lib/schemas/plan";

const TODAY = "2026-10-26";
const now = new Date("2026-10-26T10:00:00Z");

const inputs: Record<EventType, EventInputDraft> = {
  wedding: {
    eventType: "wedding",
    name: "Priya & Arjun",
    date: { kind: "fixed", date: "2027-02-14" },
    location: "Jaipur",
    guestCount: 250,
    budget: { total: 2_500_000, currency: "INR" },
    vibes: ["eco-friendly", "boho"],
    constraints: {
      dietary: ["vegetarian", "jain"],
      accessibility: ["step-free-access"],
      setting: "outdoor",
      mustHaves: "",
      mustAvoid: "",
    },
  },
  birthday: {
    eventType: "birthday",
    name: "Maya turns 7",
    date: { kind: "flexible", month: "2026-12" },
    location: "Pune",
    guestCount: 25,
    budget: { total: 40_000.4, currency: "INR" },
    vibes: ["kid-friendly"],
  },
  community: {
    eventType: "community",
    name: "Green Street Fair",
    date: { kind: "fixed", date: "2026-11-05" },
    location: "Bengaluru",
    guestCount: 400,
    budget: { total: 3500, currency: "USD" },
  },
};

function build(type: EventType) {
  return buildMockPlan(EventInputSchema.parse(inputs[type]), {
    id: `plan-${type}`,
    today: TODAY,
    now,
  });
}

describe.each(EVENT_TYPES)("mock %s plan", (type) => {
  const plan = build(type);

  it("is a valid plan", () => {
    expect(PlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.eventType).toBe(type);
    expect(plan.createdAt).toBe(now.toISOString());
  });

  it("allocates every category and sums exactly to the total", () => {
    expect(plan.budget.map((b) => b.category)).toEqual(
      categoriesFor({ eventType: type }),
    );
    expect(plan.budget.reduce((s, b) => s + b.allocated, 0)).toBe(plan.totalBudget);
    expect(plan.budget.every((b) => b.rationale.length > 10)).toBe(true);
  });

  it("has a valid timeline", () => {
    expect(plan.timeline.length).toBeGreaterThan(8);
    for (const task of plan.timeline) {
      expect(task.dueDate >= TODAY).toBe(true);
      if (task.phase === "After") expect(task.dueDate > plan.date).toBe(true);
      else if (task.phase !== "Day of") expect(task.dueDate < plan.date).toBe(true);
    }
  });

  it("lists the event's vendors with questions", () => {
    expect(plan.vendors.map((v) => v.category)).toEqual(vendorsFor({ eventType: type }));
  });

  it("offers three ideas in each category", () => {
    for (const category of IDEA_CATEGORIES) {
      expect(plan.ideas.filter((i) => i.category === category)).toHaveLength(3);
    }
    expect(new Set(plan.ideas.map((i) => i.id)).size).toBe(plan.ideas.length);
  });

  it("writes a personalised summary", () => {
    expect(plan.summary).toContain(plan.title);
    expect(plan.summary).toContain(plan.location);
  });
});

describe("personalisation", () => {
  it("rounds the budget and resolves a flexible date", () => {
    const plan = build("birthday");
    expect(plan.totalBudget).toBe(40_000);
    expect(plan).toMatchObject({ date: "2026-12-15", dateFlexible: true });
    expect(plan.summary).toContain("around");
  });

  it("mentions dietary and accessibility needs in the summary", () => {
    const plan = build("wedding");
    expect(plan.summary).toContain("vegetarian, jain");
    expect(plan.summary).toContain("step-free-access");
    expect(plan.summary).toContain("₹25,00,000");
  });

  it("uses a relaxed tone when no vibes are chosen", () => {
    expect(build("community").summary).toContain("relaxed and welcoming");
  });

  it("chooses ideas that match the selected vibes first", () => {
    const plan = build("wedding");
    const decor = plan.ideas.filter((i) => i.category === "decor").map((i) => i.id);
    expect(decor[0]).toBe("idea-potted-plant-mandap"); // eco-friendly + boho
  });

  it("can select more ideas while excluding ones already shown", () => {
    const budget = {
      eventType: "birthday",
      currency: "INR",
      totalBudget: 40_000,
      guestCount: 25,
    } as const;
    const first = selectIdeas(FIXTURES.birthday.ideas, {
      category: "food",
      vibes: [],
      budget,
      count: 2,
    });
    const more = selectIdeas(FIXTURES.birthday.ideas, {
      category: "food",
      vibes: [],
      budget,
      count: 3,
      excludeKeys: new Set(first.map((s) => s.key)),
    });
    expect(more.some((s) => first.includes(s))).toBe(false);
    expect(more.length).toBe(3);
  });

  it("has at least three ideas per category in every fixture", () => {
    for (const type of EVENT_TYPES) {
      for (const category of IDEA_CATEGORIES) {
        expect(
          FIXTURES[type].ideas.filter((i) => i.category === category).length,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("every occasion", () => {
  it("gets a valid demo plan whose summary names the event and the place", () => {
    for (const occasion of OCCASIONS) {
      const info = OCCASION_INFO[occasion];
      const plan = buildMockPlan(
        EventInputSchema.parse({
          eventType: info.eventType,
          occasion,
          name: `Our ${info.label}`,
          date: { kind: "fixed", date: "2027-03-20" },
          location: "Kochi",
          guestCount: 60,
          budget: { total: 200_000, currency: "INR" },
        }),
        { id: `plan-${occasion}`, today: TODAY, now },
      );
      expect(PlanSchema.safeParse(plan).success, occasion).toBe(true);
      expect(plan.summary, occasion).toContain(`Our ${info.label}`);
      expect(plan.summary, occasion).toContain("Kochi");
      expect(
        plan.budget.reduce((sum, b) => sum + b.allocated, 0),
        occasion,
      ).toBe(200_000);
    }
  });
});
