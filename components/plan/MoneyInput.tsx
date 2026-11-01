"use client";

import { cn } from "cn";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { ErrorText, controlClass, describedBy, fieldIds } from "@/components/ui/field";
import { currencySymbol, formatAmount, parseMoneyInput } from "@/lib/budget/format";
import type { Currency } from "@/lib/schemas/common";

interface MoneyInputProps {
  id: string;
  label: ReactNode;
  /** Hide the label visually when a table header already names the column. */
  labelHidden?: boolean;
  value: number | undefined;
  currency: Currency;
  /** Called on every keystroke that parses, so totals update live. */
  onCommit: (value: number | undefined) => void;
  /** Allow clearing the field (commits `undefined`). */
  optional?: boolean;
  hint?: ReactNode | undefined;
  disabled?: boolean;
  className?: string;
}

/**
 * Money field that accepts "1,50,000" or "₹ 2500". While focused it keeps the
 * raw text; on blur it shows the stored amount with digit grouping.
 */
export function MoneyInput({
  id,
  label,
  labelHidden,
  value,
  currency,
  onCommit,
  optional,
  hint,
  disabled,
  className,
}: MoneyInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined ? "" : formatAmount(value, currency));
  const invalid =
    draft !== null && draft.trim() !== "" && parseMoneyInput(draft) === null;
  const error = invalid ? "Use digits only, like 25000." : undefined;
  const ids = fieldIds(id);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setDraft(text);
    if (text.trim() === "") {
      if (optional) onCommit(undefined);
      return;
    }
    const parsed = parseMoneyInput(text);
    if (parsed !== null) onCommit(parsed);
  };

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-sm font-bold", labelHidden && "sr-only")}>
        {label}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
        >
          {currencySymbol(currency)}
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={shown}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy(id, { hint, error })}
          onFocus={() => setDraft(value === undefined ? "" : String(Math.round(value)))}
          onBlur={() => setDraft(null)}
          onChange={onChange}
          className={cn(controlClass, "min-h-11 pl-8 text-right tabular-nums")}
        />
      </div>
      {error ? <ErrorText id={ids.error}>{error}</ErrorText> : null}
    </div>
  );
}
