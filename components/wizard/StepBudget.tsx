import {
  Choice,
  Field,
  Fieldset,
  controlClass,
  describedBy,
} from "@/components/ui/field";
import { allocateBudget } from "@/lib/budget/allocate";
import { BUDGET_CATEGORY_LABELS, categoriesFor } from "@/lib/budget/categories";
import { currencySymbol, formatMoney, parseMoneyInput } from "@/lib/budget/format";
import { CURRENCIES, type BudgetCategory, type Currency } from "@/lib/schemas/common";
import { TICKET_CHOICES, draftKind, draftQuestions } from "@/lib/wizard/draft";
import { CURRENCY_LABELS, PRIORITY_LABELS, TICKET_COPY } from "@/lib/wizard/labels";
import type { StepProps } from "./types";

export function StepBudget({ draft, errors, update }: StepProps) {
  const kind = draftKind(draft);
  const categories = categoriesFor(kind);
  const total = parseMoneyInput(draft.budgetTotal);
  const askTickets = draftQuestions(draft).tickets;

  // Live preview of the split, from the same function that builds the plan
  // (a handful of categories, so it is cheap enough to compute every render).
  const preview =
    total && total > 0
      ? new Map(
          allocateBudget(kind, total, draft.priorities).map((a) => [a.key, a.amount]),
        )
      : null;

  const setPriority = (category: BudgetCategory, value: number) =>
    update({ priorities: { ...draft.priorities, [category]: value } });

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 @md:grid-cols-[2fr_1fr]">
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

      {askTickets ? (
        <Fieldset
          id="tickets"
          name="tickets"
          legend="Will guests register?"
          hint="Luma-style registration: free or paid, with a cap and approval if you want."
        >
          <div className="flex flex-wrap gap-3">
            {TICKET_CHOICES.map((choice) => (
              <Choice
                key={choice}
                type="radio"
                name="tickets"
                value={choice}
                label={TICKET_COPY[choice]}
                checked={draft.tickets === choice}
                onChange={() => update({ tickets: choice })}
              />
            ))}
          </div>
          {draft.tickets !== "none" ? (
            <div className="stage-rise mt-3 grid items-start gap-6 @md:grid-cols-2">
              {draft.tickets === "paid" ? (
                <Field
                  id="ticket-price"
                  name="ticketPrice"
                  label="Price per ticket"
                  required
                  error={errors.ticketPrice}
                >
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-muted-foreground"
                    >
                      {currencySymbol(draft.currency)}
                    </span>
                    <input
                      id="ticket-price"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={draft.ticketPrice}
                      onChange={(e) => update({ ticketPrice: e.target.value })}
                      aria-invalid={errors.ticketPrice ? true : undefined}
                      aria-describedby={describedBy("ticket-price", {
                        error: errors.ticketPrice,
                      })}
                      className={`${controlClass} pl-10`}
                    />
                  </div>
                </Field>
              ) : null}
              <Field
                id="ticket-capacity"
                name="capacity"
                label="Spots available"
                hint="Optional. Leave empty for no limit."
                error={errors.capacity}
              >
                <input
                  id="ticket-capacity"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={draft.capacity}
                  onChange={(e) => update({ capacity: e.target.value })}
                  aria-invalid={errors.capacity ? true : undefined}
                  aria-describedby={describedBy("ticket-capacity", {
                    hint: true,
                    error: errors.capacity,
                  })}
                  className={controlClass}
                />
              </Field>
              <div className="@md:col-span-2">
                <Choice
                  type="checkbox"
                  name="approval"
                  value="approval"
                  label="I approve each guest"
                  checked={draft.approval}
                  onChange={() => update({ approval: !draft.approval })}
                />
              </div>
            </div>
          ) : null}
        </Fieldset>
      ) : null}

      <Fieldset
        id="budget-priorities"
        name="priorities"
        legend="What matters most?"
        hint="Slide towards “Spend more” for the things you care about. Festivo balances the rest."
      >
        <ul className="grid gap-x-10 gap-y-5 @xl:grid-cols-2">
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
