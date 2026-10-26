import { useMemo } from "react";
import { Field, Fieldset, controlClass, describedBy } from "@/components/ui/field";
import { allocateBudget } from "@/lib/budget/allocate";
import { BUDGET_CATEGORY_LABELS, categoriesFor } from "@/lib/budget/categories";
import { currencySymbol, formatMoney, parseMoneyInput } from "@/lib/budget/format";
import { CURRENCIES, type BudgetCategory, type Currency } from "@/lib/schemas/common";
import { CURRENCY_LABELS, PRIORITY_LABELS } from "@/lib/wizard/labels";
import type { StepProps } from "./types";

export function StepBudget({ draft, errors, update }: StepProps) {
  const eventType = draft.eventType || "birthday";
  const categories = categoriesFor(eventType);
  const total = parseMoneyInput(draft.budgetTotal);

  // Live preview of the split, from the same function that builds the plan.
  const preview = useMemo(() => {
    if (!total || total <= 0) return null;
    return new Map(
      allocateBudget(eventType, total, draft.priorities).map((a) => [a.key, a.amount]),
    );
  }, [eventType, total, draft.priorities]);

  const setPriority = (category: BudgetCategory, value: number) =>
    update({ priorities: { ...draft.priorities, [category]: value } });

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
        <Field
          id="budget-total"
          name="budgetTotal"
          label="Total budget"
          required
          hint="Everything included. You can change it later."
          error={errors.budgetTotal}
        >
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-muted-foreground"
            >
              {currencySymbol(draft.currency)}
            </span>
            <input
              id="budget-total"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={draft.budgetTotal}
              onChange={(e) => update({ budgetTotal: e.target.value })}
              aria-invalid={errors.budgetTotal ? true : undefined}
              aria-describedby={describedBy("budget-total", {
                hint: true,
                error: errors.budgetTotal,
              })}
              className={`${controlClass} pl-10`}
            />
          </div>
        </Field>
        <Field id="budget-currency" name="currency" label="Currency">
          <select
            id="budget-currency"
            value={draft.currency}
            onChange={(e) => update({ currency: e.target.value as Currency })}
            className={controlClass}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Fieldset
        id="budget-priorities"
        name="priorities"
        legend="What matters most?"
        hint="Slide towards “Spend more” for the things you care about. Festivo balances the rest."
      >
        <ul className="grid gap-x-10 gap-y-4 md:grid-cols-2">
          {categories.map((category) => {
            const value = draft.priorities[category] ?? 3;
            const id = `priority-${category}`;
            const amount = preview?.get(category);
            return (
              <li key={category} className="grid gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <label htmlFor={id} className="font-bold">
                    {BUDGET_CATEGORY_LABELS[category]}
                  </label>
                  <span className="text-sm text-muted-foreground" aria-hidden="true">
                    {PRIORITY_LABELS[value]}
                    {amount !== undefined
                      ? `, about ${formatMoney(amount, draft.currency)}`
                      : ""}
                  </span>
                </div>
                <input
                  id={id}
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={value}
                  onChange={(e) => setPriority(category, Number(e.target.value))}
                  aria-valuetext={
                    amount !== undefined
                      ? `${PRIORITY_LABELS[value]}, about ${formatMoney(amount, draft.currency)}`
                      : PRIORITY_LABELS[value]
                  }
                  className="h-11 w-full cursor-pointer accent-[var(--event)]"
                />
              </li>
            );
          })}
        </ul>
      </Fieldset>
    </div>
  );
}
