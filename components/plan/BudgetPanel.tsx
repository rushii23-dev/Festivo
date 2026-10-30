"use client";

import { Lock, LockOpen, OctagonAlert, Scale, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney } from "@/lib/budget/format";
import { summarizeBudget } from "@/lib/budget/rebalance";
import { budgetHealthLabel } from "@/lib/plan/dashboard";
import {
  effectiveBudget,
  rebalancePlanBudget,
  setActual,
  setAllocated,
  vendorDrivenCategories,
} from "@/lib/plan/edit";
import type { BudgetCategory } from "@/lib/schemas/common";
import { BudgetDonut, chartColor } from "./BudgetDonut";
import { HEALTH_STYLE } from "./OverviewPanel";
import type { PanelProps } from "./PlanDashboard";
import { MoneyInput, PanelHeader, StatusNote } from "./parts";

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="grid min-w-0 gap-1 border-t border-hairline pt-3">
      <dt className="caps text-muted-foreground">{label}</dt>
      <dd className="figure text-2xl leading-tight break-words sm:text-3xl">{value}</dd>
      {note ? <dd className="text-sm text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

export function BudgetPanel({ plan, update }: PanelProps) {
  const announce = useAnnounce();
  const [locked, setLocked] = useState<ReadonlySet<BudgetCategory>>(new Set());
  const [lockedOver, setLockedOver] = useState(0);
  const items = useMemo(() => effectiveBudget(plan), [plan]);
  const fromVendors = useMemo(() => vendorDrivenCategories(plan), [plan]);
  const summary = useMemo(
    () => summarizeBudget(items, plan.totalBudget),
    [items, plan.totalBudget],
  );
  const money = (n: number) => formatMoney(n, plan.currency);
  const health = HEALTH_STYLE[summary.health];

  const toggleLock = (category: BudgetCategory) => {
    const next = new Set(locked);
    const label = BUDGET_CATEGORY_LABELS[category];
    if (next.has(category)) {
      next.delete(category);
      announce(`${label} unlocked.`);
    } else {
      next.add(category);
      announce(`${label} locked. Rebalance will leave it as it is.`);
    }
    setLocked(next);
  };

  const rebalanceNow = () => {
    const { overBy } = rebalancePlanBudget(plan, locked);
    update((current) => rebalancePlanBudget(current, locked).plan);
    setLockedOver(overBy);
    announce(
      overBy > 0
        ? `Locked lines are ${money(overBy)} over your total. Unlocked lines were set to zero.`
        : `Budget rebalanced. Planned lines now add up to ${money(plan.totalBudget)}.`,
    );
  };

  return (
    <div className="grid grid-cols-1 gap-8">
      <PanelHeader
        title="Budget"
        intro="Change any planned amount and the totals update as you type. Lock the lines you are sure about, then rebalance the rest."
      >
        <Button variant="secondary" onClick={rebalanceNow}>
          <Scale aria-hidden="true" />
          Rebalance unlocked lines
        </Button>
      </PanelHeader>

      <div className="grid items-center gap-8 border-y border-hairline py-8 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:gap-16 md:py-12">
        <BudgetDonut items={plan.budget} currency={plan.currency} />
        <div className="@container grid min-w-0 gap-6">
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
              note={
                summary.unallocated > 0
                  ? `${money(summary.unallocated)} not assigned yet`
                  : summary.unallocated < 0
                    ? `${money(-summary.unallocated)} over your total`
                    : "Fully assigned"
              }
            />
            <Figure label="Spent so far" value={money(summary.actual)} />
            <Figure
              label={summary.remaining >= 0 ? "Left to spend" : "Overspent"}
              value={money(Math.abs(summary.remaining))}
            />
          </dl>
          {lockedOver > 0 ? (
            <StatusNote tone="destructive" icon={<OctagonAlert />}>
              Locked lines add up to {money(lockedOver)} more than your total. Unlock one
              or raise the total.
            </StatusNote>
          ) : null}
        </div>
      </div>

      <div
        role="region"
        aria-label="Budget lines"
        className="relative overflow-x-auto border-y border-foreground"
      >
        <table className="w-full min-w-[44rem] border-collapse text-left">
          <caption className="sr-only">
            Planned and actual spend for each budget line, in {plan.currency}
          </caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="caps px-5 py-4 font-semibold">
                Line
              </th>
              <th scope="col" className="caps w-48 px-3 py-4 font-semibold">
                Planned
              </th>
              <th scope="col" className="caps w-44 px-3 py-4 font-semibold">
                Spent
              </th>
              <th scope="col" className="caps w-48 px-5 py-4 font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const label = BUDGET_CATEGORY_LABELS[item.category];
              const status = summary.categories[index]!;
              const share =
                summary.allocated > 0
                  ? Math.round((item.allocated / summary.allocated) * 100)
                  : 0;
              const isLocked = locked.has(item.category);
              const vendorSpend = fromVendors.has(item.category);
              return (
                <tr
                  key={item.category}
                  className="border-b border-hairline align-top last:border-b-0"
                >
                  <th scope="row" className="px-5 py-4 font-normal">
                    <span className="flex items-center gap-2.5 font-semibold">
                      <span
                        aria-hidden="true"
                        className="size-3 shrink-0 rotate-45 border border-border"
                        style={{ background: chartColor(index) }}
                      />
                      {label}
                      <span className="text-sm font-medium text-muted-foreground">
                        {share}%
                      </span>
                    </span>
                    {item.rationale ? (
                      <span className="mt-1 block max-w-[38ch] text-sm text-muted-foreground">
                        {item.rationale}
                      </span>
                    ) : null}
                  </th>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-1.5">
                      <MoneyInput
                        id={`allocated-${item.category}`}
                        label={`Planned for ${label}`}
                        labelHidden
                        value={item.allocated}
                        currency={plan.currency}
                        onCommit={(value) =>
                          update((p) => setAllocated(p, item.category, value ?? 0))
                        }
                        className="flex-1"
                      />
                      <button
                        type="button"
                        aria-pressed={isLocked}
                        onClick={() => toggleLock(item.category)}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm border border-transparent hover:border-border aria-pressed:border-border aria-pressed:bg-secondary aria-pressed:text-secondary-foreground print:hidden"
                      >
                        {isLocked ? (
                          <Lock aria-hidden="true" className="size-5" />
                        ) : (
                          <LockOpen
                            aria-hidden="true"
                            className="size-5 text-muted-foreground"
                          />
                        )}
                        <span className="sr-only">Lock {label}</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {vendorSpend ? (
                      <p className="grid min-h-11 content-center text-right">
                        <span className="font-bold tabular-nums">
                          {money(status.actual)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          from vendor quotes
                        </span>
                      </p>
                    ) : (
                      <MoneyInput
                        id={`actual-${item.category}`}
                        label={`Spent on ${label}`}
                        labelHidden
                        optional
                        value={item.actual}
                        currency={plan.currency}
                        onCommit={(value) =>
                          update((p) => setActual(p, item.category, value))
                        }
                      />
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {status.over ? (
                      <StatusNote
                        tone="destructive"
                        icon={<TriangleAlert />}
                        className="text-sm"
                      >
                        Over by {money(-status.remaining)}
                      </StatusNote>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {money(status.remaining)} left
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-foreground">
              <th scope="row" className="caps px-5 py-4 text-left font-semibold">
                Total
              </th>
              <td className="px-3 py-4 pr-16 text-right font-semibold tabular-nums">
                {money(summary.allocated)}
              </td>
              <td className="px-3 py-4 text-right font-semibold tabular-nums">
                {money(summary.actual)}
              </td>
              <td className="px-5 py-4 text-sm font-bold">
                {summary.remaining >= 0
                  ? `${money(summary.remaining)} left of ${money(summary.total)}`
                  : `${money(-summary.remaining)} over ${money(summary.total)}`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Quotes from vendors marked Quoted, Booked or Paid count as spend for their line
        and replace any amount typed here.
      </p>
    </div>
  );
}
