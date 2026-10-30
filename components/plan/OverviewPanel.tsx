"use client";

import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/budget/format";
import { summarizeBudget, type BudgetHealth } from "@/lib/budget/rebalance";
import { budgetHealthLabel, type DashboardTab } from "@/lib/plan/dashboard";
import { effectiveBudget } from "@/lib/plan/edit";
import { formatShortDate } from "@/lib/timeline/dates";
import { nextTasks } from "@/lib/timeline/generate";
import { bookingProgress } from "@/lib/vendors/catalog";
import type { PanelProps } from "./PlanDashboard";
import { Garland, PanelHeader, StatusNote, TaskCheck } from "./parts";
import { useTaskToggle } from "./useTaskToggle";

export const HEALTH_STYLE: Record<
  BudgetHealth,
  { tone: "success" | "warning" | "destructive"; icon: ReactNode }
> = {
  "on-track": { tone: "success", icon: <CircleCheck /> },
  "at-risk": { tone: "warning", icon: <TriangleAlert /> },
  over: { tone: "destructive", icon: <OctagonAlert /> },
};

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`grid content-start gap-5 border border-hairline bg-card p-6 sm:p-8 ${className}`}
    >
      <h3 className="font-display text-[2rem] leading-[0.95]">{title}</h3>
      {children}
    </section>
  );
}

export function OverviewPanel({
  plan,
  update,
  onNavigate,
}: PanelProps & { onNavigate: (tab: DashboardTab) => void }) {
  const summary = useMemo(
    () => summarizeBudget(effectiveBudget(plan), plan.totalBudget),
    [plan],
  );
  const upcoming = nextTasks(plan.timeline, 3);
  const booking = bookingProgress(plan.vendors);
  const done = plan.timeline.filter((t) => t.done).length;
  const health = HEALTH_STYLE[summary.health];
  const money = (n: number) => formatMoney(n, plan.currency);
  const spentShare = summary.total > 0 ? Math.min(summary.actual / summary.total, 1) : 0;
  const { toggle, cheering } = useTaskToggle(plan, update);

  return (
    <div className="grid grid-cols-1 gap-8">
      <PanelHeader
        title="At a glance"
        intro="What needs you next, how the money is going, and who is booked."
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card
          title="Up next"
          className="content-stretch lg:row-span-2 lg:grid-rows-[auto_1fr_auto]"
        >
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground">
              Every task is ticked off. Enjoy the celebration.
            </p>
          ) : (
            <ul className="grid gap-1">
              {upcoming.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-4 border-b border-hairline py-4 last:border-b-0"
                >
                  <TaskCheck
                    id={`overview-${task.id}`}
                    checked={task.done}
                    onChange={(checked) => toggle(task, checked)}
                    cheer={cheering[task.id]}
                  />
                  <div className="grid min-w-0 gap-0.5">
                    <label
                      htmlFor={`overview-${task.id}`}
                      className="cursor-pointer text-lg leading-snug font-bold"
                    >
                      {task.title}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      By {formatShortDate(task.dueDate)}
                      {task.time ? ` at ${task.time}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 border-t-2 border-hairline pt-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-bold">Timeline progress</p>
              <p className="text-muted-foreground">
                {done} of {plan.timeline.length} tasks done
              </p>
            </div>
            <div aria-hidden="true" className="h-[3px] overflow-hidden bg-hairline">
              <div
                className="h-full bg-secondary"
                style={{
                  width: `${plan.timeline.length ? (done / plan.timeline.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="print:hidden">
              <Button variant="outline" size="sm" onClick={() => onNavigate("timeline")}>
                Open the full timeline
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Budget">
          <StatusNote tone={health.tone} icon={health.icon}>
            {budgetHealthLabel(summary)}
          </StatusNote>
          <p className="text-lg">
            <strong className="figure text-3xl font-normal">
              {money(summary.actual)}
            </strong>{" "}
            spent of {money(summary.total)}
          </p>
          <div aria-hidden="true" className="h-[3px] overflow-hidden bg-hairline">
            <div
              className={
                summary.health === "over"
                  ? "h-full bg-destructive"
                  : "h-full bg-secondary"
              }
              style={{ width: `${spentShare * 100}%` }}
            />
          </div>
          <p className="text-muted-foreground">
            {summary.remaining >= 0
              ? `${money(summary.remaining)} left to spend.`
              : `${money(-summary.remaining)} more than planned.`}
          </p>
        </Card>

        <Card title="Vendors">
          <p className="text-lg">
            <strong className="figure text-3xl font-normal">{booking.booked}</strong> of{" "}
            {booking.total} booked
          </p>
          <Garland filled={booking.booked} total={booking.total} className="h-10" />
          <div className="print:hidden">
            <Button variant="outline" size="sm" onClick={() => onNavigate("vendors")}>
              Track vendors
            </Button>
          </div>
        </Card>
      </div>

      <figure className="relative grid gap-4 border-y border-hairline py-10 sm:px-10">
        <svg
          aria-hidden="true"
          viewBox="0 0 48 32"
          className="absolute -top-4 left-0 h-8 w-12 bg-background px-1 text-secondary sm:left-10"
        >
          <path
            d="M4 28c0-10 4-18 14-22l2 4c-5 3-7 7-7 10h7v8zm24 0c0-10 4-18 14-22l2 4c-5 3-7 7-7 10h7v8z"
            fill="currentColor"
          />
        </svg>
        <blockquote className="max-w-[60ch] font-display text-[clamp(1.35rem,1.05rem+0.9vw,1.8rem)] leading-snug">
          <p>{plan.summary}</p>
        </blockquote>
        <figcaption className="text-sm font-bold text-muted-foreground">
          Festivo’s note on your plan
        </figcaption>
      </figure>
    </div>
  );
}
