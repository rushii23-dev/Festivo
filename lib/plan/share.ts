/**
 * Plain-text summary of a plan for "Copy summary": readable in a chat app or
 * an email, with no markup to break.
 */
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney } from "@/lib/budget/format";
import { summarizeBudget } from "@/lib/budget/rebalance";
import { EVENT_TYPE_LABELS } from "@/lib/schemas/common";
import type { Plan } from "@/lib/schemas/plan";
import { countdown, formatLongDate, formatShortDate } from "@/lib/timeline/dates";
import { nextTasks } from "@/lib/timeline/generate";
import { bookingProgress } from "@/lib/vendors/catalog";
import { effectiveBudget } from "./edit";

export function planSummaryText(plan: Plan, today: string): string {
  const money = (n: number) => formatMoney(n, plan.currency);
  const budget = summarizeBudget(effectiveBudget(plan), plan.totalBudget);
  const when = countdown(plan.date, today);
  const upcoming = nextTasks(plan.timeline, 3);
  const booking = bookingProgress(plan.vendors);
  const saved = plan.ideas.filter((idea) => idea.saved && !idea.dismissed);

  const lines = [
    plan.title,
    `${EVENT_TYPE_LABELS[plan.eventType]} on ${formatLongDate(plan.date)}${
      plan.dateFlexible ? " (date flexible)" : ""
    } in ${plan.location}, ${plan.guestCount} guests`,
    when.label,
    "",
    `Budget: ${money(plan.totalBudget)}, ${money(budget.actual)} spent so far`,
    ...plan.budget.map(
      (item) => `- ${BUDGET_CATEGORY_LABELS[item.category]}: ${money(item.allocated)}`,
    ),
    "",
    `Vendors booked: ${booking.booked} of ${booking.total}`,
  ];

  if (upcoming.length > 0) {
    lines.push(
      "",
      "Next up:",
      ...upcoming.map((task) => `- ${task.title} (by ${formatShortDate(task.dueDate)})`),
    );
  }
  if (saved.length > 0) {
    lines.push("", "Saved ideas:", ...saved.map((idea) => `- ${idea.title}`));
  }
  lines.push("", "Planned with Festivo");
  return lines.join("\n");
}
