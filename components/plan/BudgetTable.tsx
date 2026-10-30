"use client";

import { Lock, LockOpen, TriangleAlert } from "lucide-react";
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney } from "@/lib/budget/format";
import type { BudgetSummary, CategoryStatus } from "@/lib/budget/rebalance";
import { setActual, setAllocated } from "@/lib/plan/edit";
import type { BudgetCategory } from "@/lib/schemas/common";
import type { BudgetItem, Plan } from "@/lib/schemas/plan";
import { chartColor } from "./BudgetDonut";
import type { UpdatePlan } from "./PlanDashboard";
import { MoneyInput, StatusNote } from "./parts";

interface BudgetTableProps {
  plan: Plan;
  /** The budget lines with vendor quotes applied. */
  items: BudgetItem[];
  summary: BudgetSummary;
  /** Lines whose spend comes from vendor quotes, so it is shown rather than typed. */
  fromVendors: ReadonlySet<BudgetCategory>;
  locked: ReadonlySet<BudgetCategory>;
  onToggleLock: (category: BudgetCategory) => void;
  update: UpdatePlan;
}

/** Planned and spent amounts per line, editable in place, with totals in the footer. */
export function BudgetTable(props: BudgetTableProps) {
  const { plan, items, summary } = props;
  const money = (n: number) => formatMoney(n, plan.currency);
  return (
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
          {items.map((item, index) => (
            <BudgetRow
              key={item.category}
              {...props}
              item={item}
              index={index}
              status={summary.categories[index]!}
            />
          ))}
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
  );
}

interface BudgetRowProps extends BudgetTableProps {
  item: BudgetItem;
  index: number;
  status: CategoryStatus;
}

function BudgetRow({
  plan,
  item,
  index,
  status,
  summary,
  update,
  ...rest
}: BudgetRowProps) {
  const label = BUDGET_CATEGORY_LABELS[item.category];
  const money = (n: number) => formatMoney(n, plan.currency);
  const share =
    summary.allocated > 0 ? Math.round((item.allocated / summary.allocated) * 100) : 0;
  return (
    <tr className="border-b border-hairline align-top last:border-b-0">
      <th scope="row" className="px-5 py-4 font-normal">
        <span className="flex items-center gap-2.5 font-semibold">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rotate-45 border border-border"
            style={{ background: chartColor(index) }}
          />
          {label}
          <span className="text-sm font-medium text-muted-foreground">{share}%</span>
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
          <LockButton
            label={label}
            locked={rest.locked.has(item.category)}
            onToggle={() => rest.onToggleLock(item.category)}
          />
        </div>
      </td>
      <td className="px-3 py-3">
        {rest.fromVendors.has(item.category) ? (
          <p className="grid min-h-11 content-center text-right">
            <span className="font-bold tabular-nums">{money(status.actual)}</span>
            <span className="text-xs text-muted-foreground">from vendor quotes</span>
          </p>
        ) : (
          <MoneyInput
            id={`actual-${item.category}`}
            label={`Spent on ${label}`}
            labelHidden
            optional
            value={item.actual}
            currency={plan.currency}
            onCommit={(value) => update((p) => setActual(p, item.category, value))}
          />
        )}
      </td>
      <td className="px-5 py-4">
        {status.over ? (
          <StatusNote tone="destructive" icon={<TriangleAlert />} className="text-sm">
            Over by {money(-status.remaining)}
          </StatusNote>
        ) : (
          <p className="text-sm text-muted-foreground">{money(status.remaining)} left</p>
        )}
      </td>
    </tr>
  );
}

/** A pressed lock keeps the line as it is when the rest of the budget rebalances. */
function LockButton({
  label,
  locked,
  onToggle,
}: {
  label: string;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={locked}
      onClick={onToggle}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm border border-transparent hover:border-border aria-pressed:border-border aria-pressed:bg-secondary aria-pressed:text-secondary-foreground print:hidden"
    >
      {locked ? (
        <Lock aria-hidden="true" className="size-5" />
      ) : (
        <LockOpen aria-hidden="true" className="size-5 text-muted-foreground" />
      )}
      <span className="sr-only">Lock {label}</span>
    </button>
  );
}
