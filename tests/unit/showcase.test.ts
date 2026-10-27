import { describe, expect, it } from "vitest";
import {
  SAMPLE_LEAD_DAYS,
  budgetMenu,
  ideaTitles,
  planGlimpse,
  samplePlan,
  timelineChapters,
  vendorShowcase,
} from "@/lib/landing/showcase";
import { PlanSchema } from "@/lib/schemas/plan";

const TODAY = "2026-10-28";
const plan = samplePlan(TODAY);

describe("landing showcase", () => {
  it("builds a valid sample wedding a fixed number of days out", () => {
    expect(PlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.title).toBe("Priya & Arjun");
    expect(planGlimpse(plan, TODAY)).toEqual({
      title: "Priya & Arjun",
      days: SAMPLE_LEAD_DAYS,
      budget: "₹25,00,000",
      tasks: plan.timeline.length,
      vendors: plan.vendors.length,
    });
  });

  it("lists the biggest budget lines first, priced like a menu", () => {
    const menu = budgetMenu(plan);
    expect(menu).toHaveLength(6);
    expect(menu[0]).toMatchObject({ label: "Food & drinks", amount: "₹7,00,000" });
    const amounts = menu.map((line) => Number(line.amount.replace(/[₹,]/g, "")));
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a));
    expect(menu.every((line) => line.note.length > 0)).toBe(true);
  });

  it("splits the timeline into chapters up to the day itself", () => {
    const chapters = timelineChapters(plan, 2);
    expect(chapters.map((c) => c.phase)).not.toContain("After");
    expect(chapters.at(-1)?.heading).toBe("On the day");
    expect(chapters.every((c) => c.tasks.length > 0 && c.tasks.length <= 2)).toBe(true);
    expect(chapters[0]?.tasks[0]?.due).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });

  it("shows vendors at different stages with a question to ask", () => {
    const vendors = vendorShowcase();
    expect(new Set(vendors.map((v) => v.status)).size).toBe(vendors.length);
    expect(vendors.every((v) => v.question.endsWith("?"))).toBe(true);
  });

  it("interleaves idea titles from every event type", () => {
    const titles = ideaTitles(9);
    expect(titles).toHaveLength(9);
    expect(new Set(titles).size).toBe(9);
    expect(ideaTitles(200).length).toBeGreaterThan(30);
  });
});
