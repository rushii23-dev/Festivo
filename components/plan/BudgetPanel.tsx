"use client";

import { OctagonAlert, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney } from "@/lib/budget/format";
import { summarizeBudget, type BudgetSummary } from "@/lib/budget/rebalance";
import { budgetHealthLabel } from "@/lib/plan/dashboard";
import {
  effectiveBudget,
  rebalancePlanBudget,
  vendorDrivenCategories,
} from "@/lib/plan/edit";
import type { BudgetCategory } from "@/lib/schemas/common";
import type { Plan } from "@/lib/schemas/plan";
import { BudgetDonut } from "./BudgetDonut";
import { BudgetTable } from "./BudgetTable";
import { HEALTH_STYLE } from "./OverviewPanel";
import type { PanelProps } from "./PlanDashboard";
import { PanelHeader, StatusNote } from "./parts";

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid min-w-0 gap-1 border-t border-hairline pt-3">
      <dt className="caps text-muted-foreground">{label}</dt>
      <dd className="figure text-2xl leading-tight break-words sm:text-3xl">{value}</dd>
      {note ? <dd className="text-sm text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

function plannedNote(summary: BudgetSummary, money: (n: number) => string) {
  if (summary.unallocated > 0) return `${money(summary.unallocated)} not assigned yet`;
  if (summary.unallocated < 0) return `${money(-summary.unallocated)} over your total`;
  return "Fully assigned";
}

/** The health of the budget in words and four headline figures. */
function BudgetFigures({ plan, summary }: { plan: Plan; summary: BudgetSummary }) {
  const money = (n: number) => formatMoney(n, plan.currency);
  const health = HEALTH_STYLE[summary.health];
  return (
    <>
      <StatusNote tone={health.tone} icon={health.icon} className="text-lg">
        {budgetHealthLabel(summary)}
        {summary.health === "over"
          ? `: ${money(summary.actual - summary.total)} more than your total`
          : null}
      </StatusNote>
      <dl className="grid gap-x-6 gap-y-5 min-[440px]:@min-[18rem]:grid-cols-2">
        <Figure label="Total budget" value={money(summary.total)} />
        <Figure
          label="Planned"
          value={money(summary.allocated)}
          note={plannedNote(summary, money)}
        />
        <Figure label="Spent so far" value={money(summary.actual)} />
        <Figure
          label={summary.remaining >= 0 ? "Left to spend" : "Overspent"}
          value={money(Math.abs(summary.remaining))}
        />
      </dl>
    </>
  );
}

/** Lines the planner is sure about stay as they are when the rest rebalances. */
function useBudgetLocks({ plan, update }: PanelProps) {
  const announce = useAnnounce();
  const [locked, setLocked] = useState<ReadonlySet<BudgetCategory>>(new Set());
  const [lockedOver, setLockedOver] = useState(0);
  const money = (n: number) => formatMoney(n, plan.currency);

  const toggleLock = (category: BudgetCategory) => {
    const next = new Set(locked);
    const label = BUDGET_CATEGORY_LABELS[category];
    if (next.delete(category)) {
      announce(`${label} unlocked.`);
    } else {
      next.add(category);
      announce(`${label} locked. Rebalance will leave it as it is.`);
    }
    setLocked(next);
  };

  const rebalance = () => {
    const { overBy } = rebalancePlanBudget(plan, locked);
    update((current) => rebalancePlanBudget(current, locked).plan);
    setLockedOver(overBy);
    announce(
      overBy > 0
        ? `Locked lines are ${money(overBy)} over your total. Unlocked lines were set to zero.`
        : `Budget rebalanced. Planned lines now add up to ${money(plan.totalBudget)}.`,
    );
  };

  return { locked, lockedOver, toggleLock, rebalance };
}

export function BudgetPanel(props: PanelProps) {
  const { plan, update } = props;
  const locks = useBudgetLocks(props);
  const items = useMemo(() => effectiveBudget(plan), [plan]);
  const fromVendors = useMemo(() => vendorDrivenCategories(plan), [plan]);
  const summary = useMemo(
    () => summarizeBudget(items, plan.totalBudget),
    [items, plan.totalBudget],
  );

  return (
    <div className="grid grid-cols-1 gap-8">
      <PanelHeader
        title="Budget"
        intro="Change any planned amount and the totals update as you type. Lock the lines you are sure about, then rebalance the rest."
      >
        <Button variant="secondary" onClick={locks.rebalance}>
          <Scale aria-hidden="true" />
          Rebalance unlocked lines
        </Button>
      </PanelHeader>

      <div className="grid items-center gap-8 border-y border-hairline py-8 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-16 md:py-12">
        <BudgetDonut items={plan.budget} currency={plan.currency} />
        <div className="@container grid min-w-0 gap-6">
          <BudgetFigures plan={plan} summary={summary} />
          {locks.lockedOver > 0 ? (
            <StatusNote tone="destructive" icon={<OctagonAlert />}>
              Locked lines add up to {formatMoney(locks.lockedOver, plan.currency)} more
              than your total. Unlock one or raise the total.
            </StatusNote>
          ) : null}
        </div>
      </div>

      <BudgetTable
        plan={plan}
        items={items}
        summary={summary}
        fromVendors={fromVendors}
        locked={locks.locked}
        onToggleLock={locks.toggleLock}
        update={update}
      />
      <p className="text-sm text-muted-foreground">
        Quotes from vendors marked Quoted, Booked or Paid count as spend for their line
        and replace any amount typed here.
      </p>
    </div>
  );
}
