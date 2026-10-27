/**
 * Content for the landing page's scroll story. Nothing here is invented copy:
 * every number, task and question comes from the same code that builds real
 * plans, so the page shows exactly what Festivo produces.
 */
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney } from "@/lib/budget/format";
import { FIXTURES, buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { PHASE_HEADINGS } from "@/lib/plan/dashboard";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import {
  VENDOR_STATUS_LABELS,
  type Plan,
  type TimelinePhase,
  type VendorCategory,
  type VendorStatus,
} from "@/lib/schemas/plan";
import { addDays, countdown, formatShortDate } from "@/lib/timeline/dates";
import { groupByPhase } from "@/lib/timeline/generate";
import { DEFAULT_QUESTIONS, VENDOR_LABELS } from "@/lib/vendors/catalog";

/** Days between "today" and the sample wedding, so the countdown always reads well. */
export const SAMPLE_LEAD_DAYS = 96;

/** The sample wedding the landing page walks through. */
export function samplePlan(today: string): Plan {
  return buildMockPlan(
    EventInputSchema.parse({
      eventType: "wedding",
      name: "Priya & Arjun",
      date: { kind: "fixed", date: addDays(today, SAMPLE_LEAD_DAYS) },
      location: "Jaipur",
      guestCount: 250,
      budget: { total: 2_500_000, currency: "INR" },
      vibes: ["traditional", "elegant"],
    }),
    { id: "sample-wedding", today, now: new Date(`${today}T00:00:00Z`) },
  );
}

export interface PlanGlimpse {
  title: string;
  days: number;
  budget: string;
  tasks: number;
  vendors: number;
}

export function planGlimpse(plan: Plan, today: string): PlanGlimpse {
  return {
    title: plan.title,
    days: countdown(plan.date, today).days,
    budget: formatMoney(plan.totalBudget, plan.currency),
    tasks: plan.timeline.length,
    vendors: plan.vendors.length,
  };
}

export interface MenuLine {
  label: string;
  amount: string;
  note: string;
}

/** Budget lines, largest first, written like a menu: name, price, one line about it. */
export function budgetMenu(plan: Plan, limit = 6): MenuLine[] {
  return [...plan.budget]
    .sort((a, b) => b.allocated - a.allocated)
    .slice(0, limit)
    .map((item) => ({
      label: BUDGET_CATEGORY_LABELS[item.category],
      amount: formatMoney(item.allocated, plan.currency),
      note: item.rationale,
    }));
}

export interface Chapter {
  phase: TimelinePhase;
  heading: string;
  tasks: { title: string; due: string }[];
}

/** Timeline phases before and on the day, with a few tasks each. */
export function timelineChapters(plan: Plan, perPhase = 3): Chapter[] {
  return groupByPhase(plan.timeline)
    .filter((group) => group.phase !== "After")
    .map((group) => ({
      phase: group.phase,
      heading: PHASE_HEADINGS[group.phase],
      tasks: group.tasks.slice(0, perPhase).map((task) => ({
        title: task.title,
        due: formatShortDate(task.dueDate),
      })),
    }));
}

export interface VendorShowcase {
  category: VendorCategory;
  label: string;
  status: string;
  question: string;
}

/** Vendors at different stages, to show the booking pipeline at a glance. */
const VENDOR_STAGES: [VendorCategory, VendorStatus][] = [
  ["decorator", "booked"],
  ["caterer", "quoted"],
  ["dj-or-band", "contacted"],
];

export function vendorShowcase(): VendorShowcase[] {
  return VENDOR_STAGES.map(([category, status]) => ({
    category,
    label: VENDOR_LABELS[category],
    status: VENDOR_STATUS_LABELS[status],
    question: DEFAULT_QUESTIONS[category][0] ?? "",
  }));
}

/** Idea titles from every event type, interleaved, for the marquee. */
export function ideaTitles(limit = 18): string[] {
  const lists = [FIXTURES.wedding, FIXTURES.birthday, FIXTURES.community].map((f) =>
    f.ideas.map((idea) => idea.title),
  );
  const longest = Math.max(...lists.map((list) => list.length));
  const mixed: string[] = [];
  for (let i = 0; i < longest && mixed.length < limit; i++) {
    for (const list of lists) {
      const title = list[i];
      if (title && mixed.length < limit) mixed.push(title);
    }
  }
  return mixed;
}
