import { CircleAlert } from "lucide-react";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";

/** Shared look for text inputs, selects and textareas. */
export const controlClass =
  "w-full min-h-12 rounded-md border border-input bg-card px-4 py-2 text-[0.9375rem] font-medium text-card-foreground placeholder:text-muted-foreground hover:border-foreground aria-invalid:border-destructive aria-invalid:border-2 disabled:opacity-60";

export function fieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error` };
}

/** Space-separated ids for aria-describedby, skipping the ones not rendered. */
export function describedBy(
  id: string,
  { hint, error }: { hint?: unknown; error?: unknown },
) {
  const ids = fieldIds(id);
  return (
    [hint ? ids.hint : null, error ? ids.error : null].filter(Boolean).join(" ") ||
    undefined
  );
}

export function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm font-bold text-destructive">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="sr-only">Error: </span>
        {children}
      </span>
    </p>
  );
}

export function RequiredMark() {
  return <span className="font-medium text-muted-foreground"> (required)</span>;
}

interface FieldProps {
  id: string;
  /** Draft field name; the wizard uses it to focus the first invalid field. */
  name: string;
  label: ReactNode;
  hint?: ReactNode | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** Label, hint, control and error stacked, with ids wired for aria-describedby. */
export function Field({
  id,
  name,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const ids = fieldIds(id);
  return (
    <div data-field={name} className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="caps">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {hint ? (
        <p id={ids.hint} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? <ErrorText id={ids.error}>{error}</ErrorText> : null}
    </div>
  );
}

type TextFieldProps = Omit<FieldProps, "children"> &
  Omit<ComponentProps<"input">, "id" | "name" | "value" | "onChange" | "className"> & {
    value: string;
    onValueChange: (value: string) => void;
    /** Shows the number keyboard on phones; the value stays text, so drafts keep what was typed. */
    numeric?: boolean;
    /** A short unit shown inside the start of the input, such as a currency symbol. */
    prefix?: string;
  };

/** A Field holding one text input, with aria-invalid and aria-describedby wired. */
export function TextField({
  id,
  name,
  label,
  hint,
  error,
  required,
  className,
  value,
  onValueChange,
  numeric = false,
  prefix,
  ...input
}: TextFieldProps) {
  const control = (
    <input
      id={id}
      type="text"
      autoComplete="off"
      {...(numeric ? { inputMode: "numeric" as const } : {})}
      {...input}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, { hint, error })}
      className={cn(controlClass, prefix && "pl-10")}
    />
  );
  return (
    <Field
      id={id}
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      {prefix ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-muted-foreground"
          >
            {prefix}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
    </Field>
  );
}

interface FieldsetProps {
  id: string;
  name: string;
  legend: ReactNode;
  hint?: ReactNode | undefined;
  error?: string | undefined;
  required?: boolean;
  /** Hide the legend visually when the step heading already asks the question. */
  legendHidden?: boolean;
  className?: string;
  children: ReactNode;
}

/** A labelled group of radios or checkboxes. */
export function Fieldset({
  id,
  name,
  legend,
  hint,
  error,
  required,
  legendHidden,
  className,
  children,
}: FieldsetProps) {
  const ids = fieldIds(id);
  return (
    <fieldset
      data-field={name}
      aria-describedby={describedBy(id, { hint, error })}
      className={cn("grid min-w-0 gap-3", className)}
    >
      <legend className={cn("caps mb-1", legendHidden && "sr-only")}>
        {legend}
        {required ? <RequiredMark /> : null}
      </legend>
      {hint ? (
        <p id={ids.hint} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? <ErrorText id={ids.error}>{error}</ErrorText> : null}
    </fieldset>
  );
}

type ChoiceProps = Omit<ComponentProps<"input">, "type"> & {
  type: "checkbox" | "radio";
  label: ReactNode;
};

/**
 * A chip that wraps a native checkbox or radio, so keyboard, form and screen
 * reader behaviour come for free. Selected state shows a tick, not color alone.
 */
export function Choice({ label, className, ...input }: ChoiceProps) {
  return (
    <label
      className={cn(
        "choice inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-input bg-transparent px-4 py-2 text-[0.75rem] font-medium tracking-[0.14em] uppercase select-none hover:border-foreground has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-disabled:cursor-not-allowed has-disabled:opacity-60",
        className,
      )}
    >
      <input {...input} className="sr-only" />
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="hidden size-4 [.choice:has(:checked)_&]:block"
      >
        <path
          d="M3 8.5 6.5 12 13 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </label>
  );
}
