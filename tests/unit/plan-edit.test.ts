import { describe, expect, it } from "vitest";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { DASHBOARD_TABS, budgetHealthLabel, tabFromHash } from "@/lib/plan/dashboard";
import {
  addIdeas,
  addTask,
  deleteTask,
  effectiveBudget,
  phaseForDate,
  rebalancePlanBudget,
  setActual,
  setAllocated,
  setIdeaDismissed,
  setIdeaSaved,
  setTaskDone,
  updateTask,
  updateVendor,
  vendorDrivenCategories,
} from "@/lib/plan/edit";
import { planSummaryText } from "@/lib/plan/share";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import { PlanSchema, type Idea, type Plan } from "@/lib/schemas/plan";

const TODAY = "2026-10-26";
const plan = buildMockPlan(
  EventInputSchema.parse({
    eventType: "birthday",
    name: "Maya turns 7",
    date: { kind: "fixed", date: "2027-01-30" },
    location: "Pune",
    guestCount: 25,
    budget: { total: 40_000, currency: "INR" },
  }),
  { id: "p1", today: TODAY, now: new Date("2026-10-26T00:00:00Z") },
);

const expectValid = (p: Plan) => expect(PlanSchema.safeParse(p).success).toBe(true);

describe("budget edits", () => {
  it("sets allocated amounts as whole, non-negative numbers", () => {
    const venue = setAllocated(plan, "venue", 1234.6);
    expect(venue.budget.find((b) => b.category === "venue")?.allocated).toBe(1235);
    const negative = setAllocated(plan, "venue", -5);
    expect(negative.budget.find((b) => b.category === "venue")?.allocated).toBe(0);
    expect(plan.budget.find((b) => b.category === "venue")?.allocated).not.toBe(1235);
    expectValid(venue);
  });

  it("sets and clears a manual actual", () => {
    const spent = setActual(plan, "cake", 2500);
    expect(spent.budget.find((b) => b.category === "cake")?.actual).toBe(2500);
    const cleared = setActual(spent, "cake", undefined);
    expect(cleared.budget.find((b) => b.category === "cake")).not.toHaveProperty(
      "actual",
    );
    expectValid(cleared);
  });

  it("rebalances around locked lines and sums to the total", () => {
    const edited = setAllocated(plan, "venue", 20_000);
    const { plan: balanced, overBy } = rebalancePlanBudget(edited, new Set(["venue"]));
    expect(overBy).toBe(0);
    expect(balanced.budget.find((b) => b.category === "venue")?.allocated).toBe(20_000);
    expect(balanced.budget.reduce((sum, b) => sum + b.allocated, 0)).toBe(40_000);
  });

  it("lets vendor quotes override typed actuals", () => {
    const typed = setActual(plan, "venue", 100);
    const quoted = updateVendor(typed, "vendor-venue", { status: "booked", quote: 9000 });
    expect(effectiveBudget(quoted).find((b) => b.category === "venue")?.actual).toBe(
      9000,
    );
    expect(vendorDrivenCategories(quoted)).toEqual(new Set(["venue"]));
    expect(vendorDrivenCategories(typed).size).toBe(0);
  });
});

describe("timeline edits", () => {
  const first = plan.timeline[0]!;

  it("ticks and unticks a task", () => {
    const done = setTaskDone(plan, first.id, true);
    expect(done.timeline.find((t) => t.id === first.id)?.done).toBe(true);
    expect(setTaskDone(done, first.id, false).timeline[0]?.done).toBe(false);
  });

  it("works out the phase from the date", () => {
    expect(phaseForDate("2027-01-30", "2027-01-30")).toBe("Day of");
    expect(phaseForDate("2027-02-02", "2027-01-30")).toBe("After");
    expect(phaseForDate("2027-01-25", "2027-01-30")).toBe("1 week");
    expect(phaseForDate("not a date", "2027-01-30", "8 weeks")).toBe("8 weeks");
  });

  it("adds a valid task in date order with a unique id", () => {
    const result = addTask(
      plan,
      { title: "  Pick up balloons ", dueDate: "2027-01-29", time: " " },
      TODAY,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const task = result.plan.timeline.find((t) => t.title === "Pick up balloons");
    expect(task).toMatchObject({
      phase: "1 week",
      done: false,
      id: "task-pick-up-balloons",
    });
    expect(task).not.toHaveProperty("time");
    expectValid(result.plan);

    const again = addTask(
      result.plan,
      { title: "Pick up balloons", dueDate: "2027-01-29" },
      TODAY,
    );
    expect(
      again.ok &&
        again.plan.timeline.filter((t) => t.id.startsWith("task-pick-up")).length,
    ).toBe(2);
  });

  it("moves a past due date to today", () => {
    const result = addTask(plan, { title: "Overdue", dueDate: "2026-01-01" }, TODAY);
    expect(
      result.ok && result.plan.timeline.find((t) => t.title === "Overdue")?.dueDate,
    ).toBe(TODAY);
  });

  it("rejects an empty title or a bad time with field errors", () => {
    const empty = addTask(plan, { title: " ", dueDate: "2027-01-10" }, TODAY);
    expect(empty).toEqual({ ok: false, errors: { title: expect.any(String) } });
    const badTime = addTask(
      plan,
      { title: "Cake", dueDate: "2027-01-30", time: "25:00" },
      TODAY,
    );
    expect(badTime.ok).toBe(false);
    expect(!badTime.ok && badTime.errors.time).toMatch(/09:30/);
    const badDate = addTask(plan, { title: "Cake", dueDate: "" }, TODAY);
    expect(!badDate.ok && badDate.errors.dueDate).toBeTruthy();
  });

  it("refuses to grow past the task limit", () => {
    const full = { ...plan, timeline: Array.from({ length: 60 }, () => first) };
    expect(addTask(full, { title: "One more", dueDate: "2027-01-10" }, TODAY)).toEqual({
      ok: false,
      errors: { form: expect.stringMatching(/60/) },
    });
  });

  it("edits a task, keeping its id and done state", () => {
    const done = setTaskDone(plan, first.id, true);
    const result = updateTask(
      done,
      first.id,
      { title: "Send invitations", dueDate: "2027-01-30", time: "10:00" },
      TODAY,
    );
    expect(result.ok).toBe(true);
    const task = result.ok
      ? result.plan.timeline.find((t) => t.id === first.id)
      : undefined;
    expect(task).toMatchObject({
      title: "Send invitations",
      phase: "Day of",
      done: true,
      time: "10:00",
    });
    expect(updateTask(plan, "missing", { title: "x", dueDate: TODAY }, TODAY).ok).toBe(
      false,
    );
    expect(updateTask(plan, first.id, { title: "", dueDate: TODAY }, TODAY).ok).toBe(
      false,
    );
  });

  it("deletes a task", () => {
    expect(deleteTask(plan, first.id).timeline.some((t) => t.id === first.id)).toBe(
      false,
    );
  });
});

describe("vendor edits", () => {
  it("updates status, quote and notes, dropping empty notes", () => {
    const quoted = updateVendor(plan, "vendor-venue", {
      status: "quoted",
      quote: 12_000,
      notes: "Call back Monday",
    });
    expect(quoted.vendors[0]).toMatchObject({
      status: "quoted",
      quote: 12_000,
      notes: "Call back Monday",
    });
    const cleared = updateVendor(quoted, "vendor-venue", {
      quote: undefined,
      notes: "  ",
    });
    expect(cleared.vendors[0]).not.toHaveProperty("quote");
    expect(cleared.vendors[0]).not.toHaveProperty("notes");
    expectValid(cleared);
  });

  it("ignores an invalid edit", () => {
    const bad = updateVendor(plan, "vendor-venue", { quote: -1 });
    expect(bad.vendors[0]).toEqual(plan.vendors[0]);
  });
});

describe("idea edits", () => {
  const idea = plan.ideas[0]!;

  it("saves, dismisses and restores", () => {
    const saved = setIdeaSaved(plan, idea.id, true);
    expect(saved.ideas[0]?.saved).toBe(true);
    expect(setIdeaSaved(saved, idea.id, false).ideas[0]).not.toHaveProperty("saved");
    const dismissed = setIdeaDismissed(plan, idea.id, true);
    expect(dismissed.ideas[0]?.dismissed).toBe(true);
    expect(setIdeaDismissed(dismissed, idea.id, false).ideas[0]).not.toHaveProperty(
      "dismissed",
    );
  });

  const fresh = (title: string): Idea => ({
    id: "idea-x",
    category: "food",
    title,
    description: "Something new",
    costTier: 1,
    saved: true,
  });

  it("adds new ideas with unique ids, skipping repeats and invalid ones", () => {
    const { plan: next, added } = addIdeas(plan, [
      fresh("Mango lassi bar"),
      fresh("mango lassi bar"),
      fresh(idea.title),
      { ...fresh("Bad"), costTier: 9 } as unknown as Idea,
    ]);
    expect(added.map((i) => i.title)).toEqual(["Mango lassi bar"]);
    expect(added[0]).not.toHaveProperty("saved");
    expect(next.ideas).toHaveLength(plan.ideas.length + 1);
    expectValid(next);
  });

  it("makes room by dropping dismissed ideas when full", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...idea,
      id: `idea-${i}`,
      title: `Idea ${i}`,
      ...(i < 2 ? { dismissed: true } : {}),
    }));
    const { plan: next, added } = addIdeas({ ...plan, ideas: many }, [
      fresh("New one"),
      fresh("New two"),
      fresh("New three"),
    ]);
    expect(added).toHaveLength(2);
    expect(next.ideas).toHaveLength(40);
    expect(next.ideas.some((i) => i.dismissed)).toBe(false);
  });
});

describe("dashboard tabs", () => {
  it("reads the tab from the hash", () => {
    expect(tabFromHash("#budget")).toBe("budget");
    expect(tabFromHash("#IDEAS")).toBe("ideas");
    expect(tabFromHash("")).toBe("overview");
    expect(tabFromHash("#nope")).toBe("overview");
    expect(DASHBOARD_TABS).toHaveLength(5);
  });
});

describe("budget health label", () => {
  it("says why a plan needs a look", () => {
    expect(budgetHealthLabel({ health: "on-track", overCategories: [] })).toBe(
      "On track",
    );
    expect(budgetHealthLabel({ health: "over", overCategories: ["venue"] })).toBe(
      "Over budget",
    );
    expect(budgetHealthLabel({ health: "at-risk", overCategories: [] })).toBe(
      "Close to the limit",
    );
    expect(budgetHealthLabel({ health: "at-risk", overCategories: ["venue"] })).toBe(
      "One line is over plan",
    );
    expect(
      budgetHealthLabel({ health: "at-risk", overCategories: ["venue", "decor"] }),
    ).toBe("2 lines are over plan");
  });
});

describe("plan summary text", () => {
  it("lists the essentials in plain text", () => {
    const withSaved = setIdeaSaved(plan, plan.ideas[0]!.id, true);
    const text = planSummaryText(withSaved, TODAY);
    expect(text).toContain("Maya turns 7");
    expect(text).toContain("Birthday on Saturday, 30 January 2027 in Pune, 25 guests");
    expect(text).toContain("96 days to go");
    expect(text).toMatch(/Budget: ₹40,000, ₹0 spent so far/);
    expect(text).toContain("Next up:");
    expect(text).toContain(`Saved ideas:\n- ${plan.ideas[0]!.title}`);
    expect(text.endsWith("Planned with Festivo")).toBe(true);
    expect(text).not.toMatch(/[<>]/);
  });

  it("notes a flexible date and skips empty sections", () => {
    const flexible = {
      ...plan,
      dateFlexible: true,
      timeline: plan.timeline.map((t) => ({ ...t, done: true })),
    };
    const text = planSummaryText(flexible, TODAY);
    expect(text).toContain("(date flexible)");
    expect(text).not.toContain("Next up:");
    expect(text).not.toContain("Saved ideas:");
  });
});
