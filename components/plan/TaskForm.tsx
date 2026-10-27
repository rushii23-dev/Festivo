"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorText, Field, controlClass, describedBy } from "@/components/ui/field";
import type { TaskInput } from "@/lib/plan/edit";

type Errors = Partial<Record<string, string>>;
const ORDER = ["title", "dueDate", "time", "description"] as const;

/**
 * Add or edit a task. `onSubmit` returns field errors, or null when saved.
 * The title is focused on open.
 */
export function TaskForm({
  idPrefix,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initial: TaskInput;
  submitLabel: string;
  onSubmit: (input: TaskInput) => Errors | null;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<TaskInput>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const id = (name: string) => `${idPrefix}-${name}`;

  useEffect(() => {
    document.getElementById(`${idPrefix}-title`)?.focus();
  }, [idPrefix]);

  const set = (name: keyof TaskInput) => (value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  return (
    <form
      noValidate
      aria-label={submitLabel}
      onSubmit={(event) => {
        event.preventDefault();
        const result = onSubmit(values) ?? {};
        setErrors(result);
        const first = ORDER.find((name) => result[name]);
        if (first) document.getElementById(id(first))?.focus();
      }}
      className="grid gap-5 border border-hairline bg-card p-5 sm:p-6"
    >
      <Field id={id("title")} name="title" label="Task" required error={errors.title}>
        <input
          id={id("title")}
          value={values.title}
          maxLength={120}
          onChange={(e) => set("title")(e.target.value)}
          aria-invalid={Boolean(errors.title) || undefined}
          aria-describedby={describedBy(id("title"), { error: errors.title })}
          className={controlClass}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={id("dueDate")}
          name="dueDate"
          label="Due date"
          required
          error={errors.dueDate}
        >
          <input
            id={id("dueDate")}
            type="date"
            value={values.dueDate}
            onChange={(e) => set("dueDate")(e.target.value)}
            aria-invalid={Boolean(errors.dueDate) || undefined}
            aria-describedby={describedBy(id("dueDate"), { error: errors.dueDate })}
            className={controlClass}
          />
        </Field>
        <Field
          id={id("time")}
          name="time"
          label="Start time"
          hint="Optional. Timed tasks on the day appear in the run sheet."
          error={errors.time}
        >
          <input
            id={id("time")}
            type="time"
            value={values.time ?? ""}
            onChange={(e) => set("time")(e.target.value)}
            aria-invalid={Boolean(errors.time) || undefined}
            aria-describedby={describedBy(id("time"), {
              hint: true,
              error: errors.time,
            })}
            className={controlClass}
          />
        </Field>
      </div>
      <Field
        id={id("description")}
        name="description"
        label="Notes"
        error={errors.description}
      >
        <textarea
          id={id("description")}
          rows={2}
          maxLength={400}
          value={values.description ?? ""}
          onChange={(e) => set("description")(e.target.value)}
          aria-invalid={Boolean(errors.description) || undefined}
          aria-describedby={describedBy(id("description"), { error: errors.description })}
          className={controlClass}
        />
      </Field>
      {errors.form ? <ErrorText id={id("form-error")}>{errors.form}</ErrorText> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
