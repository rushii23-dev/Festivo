import { vendorsFor } from "@/lib/events/kind";
import { describe, expect, it } from "vitest";
import { planToDraft } from "@/lib/ai/mock";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { describeChange, diffPlans } from "@/lib/plan/diff";
import { budgetFromDraft, planFromDraft, vendorsFromDraft } from "@/lib/plan/fromDraft";
import { slugify, uniqueIdFactory } from "@/lib/plan/ids";
import { PatchError, applyPatch } from "@/lib/plan/patch";
import { sectionsSeen, toErrorEvent } from "@/lib/plan/service";
import { AiOutputError, AiProviderError } from "@/lib/ai/provider";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import { PlanSchema } from "@/lib/schemas/plan";
import { DEFAULT_QUESTIONS } from "@/lib/vendors/catalog";

const TODAY = "2026-10-26";
const input = EventInputSchema.parse({
  eventType: "community",
  name: "Green Street Fair",
  date: { kind: "fixed", date: "2027-01-30" },
  location: "Bengaluru",
  guestCount: 300,
  budget: { total: 150_000, currency: "INR" },
});
const plan = buildMockPlan(input, {
  id: "p1",
  today: TODAY,
  now: new Date("2026-10-26T00:00:00Z"),
});

describe("ids", () => {
  it("slugifies titles", () => {
    expect(slugify("Café & Chaat Stall!")).toBe("cafe-chaat-stall");
    expect(slugify("!!!")).toBe("item");
    expect(slugify("a".repeat(60)).length).toBe(40);
  });

  it("never repeats an id", () => {
    const next = uniqueIdFactory("idea", ["idea-tea"]);
    expect([next("Tea"), next("Tea"), next("Cake")]).toEqual([
      "idea-tea-2",
      "idea-tea-3",
      "idea-cake",
    ]);
  });
});

describe("planFromDraft", () => {
  const draft = planToDraft(plan);
  const ctx = {
    id: "p2",
    today: TODAY,
    now: new Date(),
    eventDate: "2027-01-30",
    flexible: false,
  };

  it("rebuilds an equivalent, valid plan", () => {
    const rebuilt = planFromDraft(draft, input, ctx);
    expect(PlanSchema.safeParse(rebuilt).success).toBe(true);
    expect(rebuilt.budget.map((b) => b.allocated)).toEqual(
      plan.budget.map((b) => b.allocated),
    );
    expect(rebuilt.timeline.map((t) => t.dueDate)).toEqual(
      plan.timeline.map((t) => t.dueDate),
    );
  });

  it("drops unknown categories, fills missing ones and fixes the total", () => {
    const budget = budgetFromDraft(
      [
        { category: "venue", amount: 100, rationale: "Hall" },
        { category: "attire", amount: 500, rationale: "Not used for community events" },
        { category: "venue", amount: 999, rationale: "Duplicate" },
      ],
      { eventType: "community" },
      150_000,
    );
    expect(budget.map((b) => b.category)).not.toContain("attire");
    expect(budget[0]).toMatchObject({
      category: "venue",
      allocated: 150_000,
      rationale: "Hall",
    });
    expect(budget.reduce((s, b) => s + b.allocated, 0)).toBe(150_000);
    expect(budget.find((b) => b.category === "permits")?.rationale).toMatch(
      /Planned share/,
    );
  });

  it("falls back to the baseline split when the AI gives no amounts", () => {
    const budget = budgetFromDraft(
      [{ category: "venue", amount: 0, rationale: "x" }],
      { eventType: "community" },
      100_000,
    );
    expect(budget.find((b) => b.category === "venue")?.allocated).toBe(20_000);
  });

  it("clamps impossible task dates from the AI", () => {
    const rebuilt = planFromDraft(
      {
        ...draft,
        timeline: [
          ...draft.timeline,
          { title: "Way too early", description: "", daysBefore: 700 },
        ],
      },
      input,
      ctx,
    );
    expect(rebuilt.timeline.find((t) => t.title === "Way too early")?.dueDate).toBe(
      TODAY,
    );
  });

  it("keeps every vendor category, defaulting questions the AI skipped", () => {
    const vendors = vendorsFromDraft(
      [{ category: "venue", questionsToAsk: ["Q1?", "Q2?"] }],
      { eventType: "community" },
    );
    expect(vendors.map((v) => v.category)).toEqual(
      vendorsFor({ eventType: "community" }),
    );
    expect(vendors[0]?.questionsToAsk).toEqual(["Q1?", "Q2?"]);
    expect(vendors[1]?.questionsToAsk).toEqual(DEFAULT_QUESTIONS["permits-office"]);
  });
});

describe("applyPatch", () => {
  it("scales the budget when only the total changes, keeping actual spend", () => {
    const spent = {
      ...plan,
      budget: plan.budget.map((b, i) => (i === 0 ? { ...b, actual: 5000 } : b)),
    };
    const next = applyPatch(spent, { explanation: "x", totalBudget: 120_000 }, TODAY);
    expect(next.budget.reduce((s, b) => s + b.allocated, 0)).toBe(120_000);
    expect(next.budget[0]?.actual).toBe(5000);
  });

  it("uses an explicit budget list, normalised to the total", () => {
    const next = applyPatch(
      plan,
      {
        explanation: "x",
        budget: [{ category: "venue", amount: 1, rationale: "All on venue" }],
      },
      TODAY,
    );
    expect(next.budget.find((b) => b.category === "venue")?.allocated).toBe(150_000);
  });

  it("shifts tasks when the date moves and re-validates them", () => {
    const next = applyPatch(plan, { explanation: "x", date: "2027-03-30" }, TODAY);
    const before = plan.timeline.find((t) => t.phase === "Day of");
    const after = next.timeline.find((t) => t.id === before?.id);
    expect(after?.dueDate).toBe("2027-03-30");
    expect(next.timeline.every((t) => t.dueDate >= TODAY)).toBe(true);
  });

  it("adds and removes tasks and ideas, but never removes saved ideas", () => {
    const [saved, removable] = plan.ideas;
    const withSaved = {
      ...plan,
      ideas: plan.ideas.map((i) => (i.id === saved?.id ? { ...i, saved: true } : i)),
    };
    const next = applyPatch(
      withSaved,
      {
        explanation: "x",
        removeIdeaIds: [saved?.id ?? "", removable?.id ?? ""],
        addIdeas: [
          { category: "food", title: "Fresh idea", description: "New.", costTier: 1 },
          {
            category: "food",
            title: plan.ideas[2]?.title ?? "",
            description: "Duplicate.",
            costTier: 1,
          },
        ],
        removeTaskIds: [plan.timeline[0]?.id ?? ""],
        addTasks: [{ title: "Book a photographer", description: "", daysBefore: 20 }],
        summary: "New summary.",
      },
      TODAY,
    );
    const ids = next.ideas.map((i) => i.id);
    expect(ids).toContain(saved?.id);
    expect(ids).not.toContain(removable?.id);
    expect(next.ideas.filter((i) => i.title === "Fresh idea")).toHaveLength(1);
    expect(next.ideas.filter((i) => i.title === plan.ideas[2]?.title)).toHaveLength(1);
    expect(next.timeline.map((t) => t.id)).not.toContain(plan.timeline[0]?.id);
    expect(next.timeline.find((t) => t.title === "Book a photographer")?.dueDate).toBe(
      "2027-01-10",
    );
    expect(next.summary).toBe("New summary.");
  });

  it("refuses to move the event into the past", () => {
    expect(() =>
      applyPatch(plan, { explanation: "x", date: "2026-01-01" }, TODAY),
    ).toThrow(PatchError);
  });
});

describe("diffPlans", () => {
  it("lists every kind of change in readable form", () => {
    const next = applyPatch(
      plan,
      {
        explanation: "x",
        totalBudget: 100_000,
        date: "2027-02-27",
        addIdeas: [
          {
            category: "theme",
            title: "Lantern walk",
            description: "Evening walk.",
            costTier: 1,
          },
        ],
        removeIdeaIds: [plan.ideas[0]?.id ?? ""],
        addTasks: [{ title: "Print maps", description: "", daysBefore: 3 }],
        removeTaskIds: [plan.timeline[0]?.id ?? ""],
        summary: "Smaller and later.",
      },
      TODAY,
    );
    const changes = diffPlans(plan, next);
    const fields = changes.map((c) => `${c.kind}:${c.field}`);
    expect(fields).toEqual(
      expect.arrayContaining([
        "changed:Event date",
        "changed:Total budget",
        "changed:Venue",
        "added:Idea",
        "removed:Idea",
        "added:Task",
        "removed:Task",
        "changed:Summary",
      ]),
    );
    expect(changes.find((c) => c.field === "Event date")).toMatchObject({
      before: "Saturday, 30 January 2027",
      after: "Saturday, 27 February 2027",
    });
    expect(describeChange({ kind: "added", field: "Idea", after: "Lantern walk" })).toBe(
      "Idea added: Lantern walk",
    );
    expect(describeChange({ kind: "removed", field: "Task", before: "Print" })).toBe(
      "Task removed: Print",
    );
    expect(
      describeChange({
        kind: "changed",
        field: "Total budget",
        before: "₹1",
        after: "₹2",
      }),
    ).toBe("Total budget: ₹1 to ₹2");
  });

  it("is empty when nothing changed", () => {
    expect(diffPlans(plan, plan)).toEqual([]);
  });
});

describe("service helpers", () => {
  it("detects sections as their keys appear in partial JSON", () => {
    expect(sectionsSeen('{"budget":[{"rationale":"the timeline is tight"')).toEqual([
      "budget",
    ]);
    expect(sectionsSeen('{"budget":[],"timeline" : [')).toEqual(["budget", "timeline"]);
  });

  it("maps errors to safe, generic events", () => {
    expect(toErrorEvent(new AiProviderError("boom", 500))).toMatchObject({
      code: "provider",
      retryable: true,
    });
    expect(toErrorEvent(new AiOutputError("bad", "- x"))).toMatchObject({
      code: "invalid-output",
    });
    expect(toErrorEvent(new RangeError("The event date is in the past."))).toMatchObject({
      code: "invalid-request",
      message: "The event date is in the past.",
      retryable: false,
    });
    const internal = toErrorEvent(new Error("secret stack details"));
    expect(internal).toMatchObject({ code: "internal" });
    expect(internal.message).not.toContain("secret");
  });
});
