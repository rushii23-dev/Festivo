import { Choice, Field, Fieldset, TextField, controlClass } from "@/components/ui/field";
import { allocateBudget } from "@/lib/budget/allocate";
import { BUDGET_CATEGORY_LABELS, categoriesFor } from "@/lib/budget/categories";
import { currencySymbol, formatMoney, parseMoneyInput } from "@/lib/budget/format";
import { CURRENCIES, type BudgetCategory, type Currency } from "@/lib/schemas/common";
import { TICKET_CHOICES, draftKind, draftQuestions } from "@/lib/wizard/draft";
import { CURRENCY_LABELS, PRIORITY_LABELS, TICKET_COPY } from "@/lib/wizard/labels";
import type { StepProps } from "./types";

/** Step 3: the total and currency, registration for ticketed occasions, and priorities. */
export function StepBudget(props: StepProps) {
  const { draft, errors, update } = props;
  return (
    <div className="grid gap-8">
      <div className="grid gap-6 @md:grid-cols-[2fr_1fr]">
        <TextField
          id="budget-total"
          name="budgetTotal"
          label="Total budget"
          required
          hint="Everything included. You can change it later."
          error={errors.budgetTotal}
          inputMode="decimal"
          prefix={currencySymbol(draft.currency)}
          value={draft.budgetTotal}
          onValueChange={(budgetTotal) => update({ budgetTotal })}
        />
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
      {draftQuestions(draft).tickets ? <TicketQuestions {...props} /> : null}
      <PriorityQuestion {...props} />
    </div>
  );
}

/** Free or paid registration, with an optional cap and guest approval. */
function TicketQuestions({ draft, errors, update }: StepProps) {
  return (
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
            <TextField
              id="ticket-price"
              name="ticketPrice"
              label="Price per ticket"
              required
              error={errors.ticketPrice}
              inputMode="decimal"
              prefix={currencySymbol(draft.currency)}
              value={draft.ticketPrice}
              onValueChange={(ticketPrice) => update({ ticketPrice })}
            />
          ) : null}
          <TextField
            id="ticket-capacity"
            name="capacity"
            label="Spots available"
            hint="Optional. Leave empty for no limit."
            error={errors.capacity}
            numeric
            value={draft.capacity}
            onValueChange={(capacity) => update({ capacity })}
          />
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
  );
}

/** One slider per budget line, each showing the live split it would produce. */
function PriorityQuestion({ draft, update }: StepProps) {
  const kind = draftKind(draft);
  const total = parseMoneyInput(draft.budgetTotal);
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
    <Fieldset
      id="budget-priorities"
      name="priorities"
      legend="What matters most?"
      hint="Slide towards “Spend more” for the things you care about. Festivo balances the rest."
    >
      <ul className="grid gap-x-10 gap-y-5 @xl:grid-cols-2">
        {categoriesFor(kind).map((category) => {
          const value = draft.priorities[category] ?? 3;
          const amount = preview?.get(category);
          const text =
            amount === undefined
              ? PRIORITY_LABELS[value]
              : `${PRIORITY_LABELS[value]}, about ${formatMoney(amount, draft.currency)}`;
          return (
            <li key={category} className="grid gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <label htmlFor={`priority-${category}`} className="font-bold">
                  {BUDGET_CATEGORY_LABELS[category]}
                </label>
                <span className="text-sm text-muted-foreground" aria-hidden="true">
                  {text}
                </span>
              </div>
              <input
                id={`priority-${category}`}
                type="range"
                min={1}
                max={5}
                step={1}
                value={value}
                onChange={(e) => setPriority(category, Number(e.target.value))}
                aria-valuetext={text}
                className="h-11 w-full cursor-pointer accent-[var(--event)]"
              />
            </li>
          );
        })}
      </ul>
    </Fieldset>
  );
}
