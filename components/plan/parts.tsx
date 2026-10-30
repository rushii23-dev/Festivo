"use client";

import { Check } from "lucide-react";
import { cn } from "cn";
import { useState, type ReactNode } from "react";
import { ErrorText, controlClass, describedBy, fieldIds } from "@/components/ui/field";
import { CURRENCY_LOCALES, currencySymbol, parseMoneyInput } from "@/lib/budget/format";
import type { Currency } from "@/lib/schemas/common";

/** One h2 per panel, with an optional line of context and actions on the right. */
export function PanelHeader({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="grid max-w-[62ch] gap-1">
        <h2 className="font-display text-headline">{title}</h2>
        {intro ? <p className="text-muted-foreground">{intro}</p> : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 print:hidden">{children}</div>
      ) : null}
    </div>
  );
}

const grouping = new Map<Currency, Intl.NumberFormat>();
function groupDigits(value: number, currency: Currency): string {
  let fmt = grouping.get(currency);
  if (!fmt) {
    fmt = new Intl.NumberFormat(CURRENCY_LOCALES[currency], { maximumFractionDigits: 0 });
    grouping.set(currency, fmt);
  }
  return fmt.format(Math.round(value));
}

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
  const shown = draft ?? (value === undefined ? "" : groupDigits(value, currency));
  const invalid =
    draft !== null && draft.trim() !== "" && parseMoneyInput(draft) === null;
  const error = invalid ? "Use digits only, like 25000." : undefined;
  const ids = fieldIds(id);

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
          onChange={(event) => {
            const text = event.target.value;
            setDraft(text);
            if (text.trim() === "") {
              if (optional) onCommit(undefined);
              return;
            }
            const parsed = parseMoneyInput(text);
            if (parsed !== null) onCommit(parsed);
          }}
          className={cn(controlClass, "min-h-11 pl-8 text-right tabular-nums")}
        />
      </div>
      {error ? <ErrorText id={ids.error}>{error}</ErrorText> : null}
    </div>
  );
}

/**
 * A marigold garland: one bead per item on a sagging thread, filled for the
 * ones that are done. Decorative; always pair it with the same fact in text.
 */
export function Garland({
  filled,
  total,
  className,
}: {
  filled: number;
  total: number;
  className?: string;
}) {
  const count = Math.max(total, 1);
  const width = Math.max(count * 26, 60);
  const sag = 10;
  const y = (x: number) => 8 + sag * Math.sin((Math.PI * x) / width);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} 32`}
      className={cn("h-8 w-auto max-w-full overflow-visible", className)}
    >
      <path
        d={`M0 8 Q${width / 2} ${8 + sag * 2} ${width} 8`}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
      />
      {Array.from({ length: total }, (_, i) => {
        const cx = ((i + 0.5) * width) / count;
        const on = i < filled;
        return (
          <circle
            key={i}
            cx={cx}
            cy={y(cx)}
            r={on ? 8 : 6.5}
            fill={on ? "var(--secondary)" : "var(--card)"}
            stroke="var(--border)"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
}

/** Large, tactile checkbox: the tick mark (not color alone) shows it is done. */
export function TaskCheck({
  id,
  checked,
  onChange,
  cheer,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Bumped when the task is ticked, to play the petal burst once. */
  cheer?: number | undefined;
}) {
  return (
    <span className="relative mt-0.5 inline-flex size-6 shrink-0">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer size-6 cursor-pointer appearance-none rounded-sm border border-foreground bg-transparent checked:bg-foreground"
      />
      <Check
        aria-hidden="true"
        strokeWidth={3.5}
        className="pointer-events-none absolute inset-1 hidden size-4 text-background peer-checked:block"
      />
      {cheer ? <PetalBurst key={cheer} /> : null}
    </span>
  );
}

const PETALS = [0, 60, 120, 180, 240, 300];

/** Marigold and rose petals that pop out of a ticked box. Motion-safe only. */
function PetalBurst() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden motion-ok:block"
    >
      {PETALS.map((angle, i) => (
        <span
          key={angle}
          className="petal absolute top-1/2 left-1/2 size-2 rounded-full"
          style={
            {
              "--angle": `${angle}deg`,
              background: i % 2 ? "var(--accent)" : "var(--secondary)",
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** Icon + text status line; the icon is decorative, the words carry the meaning. */
export function StatusNote({
  tone,
  icon,
  children,
  className,
}: {
  tone: "success" | "warning" | "destructive" | "muted";
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const color = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <p className={cn("flex items-start gap-2 font-bold", color, className)}>
      <span aria-hidden="true" className="mt-0.5 shrink-0 [&_svg]:size-5">
        {icon}
      </span>
      <span>{children}</span>
    </p>
  );
}
