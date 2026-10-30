"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ErrorText,
  Field,
  TextField,
  controlClass,
  describedBy,
} from "@/components/ui/field";
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
      <TextField
        id={id("title")}
        name="title"
        label="Task"
        required
        error={errors.title}
        maxLength={120}
        value={values.title}
        onValueChange={set("title")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={id("dueDate")}
          name="dueDate"
          label="Due date"
          required
          error={errors.dueDate}
          type="date"
          value={values.dueDate}
          onValueChange={set("dueDate")}
        />
        <TextField
          id={id("time")}
          name="time"
          label="Start time"
          hint="Optional. Timed tasks on the day appear in the run sheet."
          error={errors.time}
          type="time"
          value={values.time ?? ""}
          onValueChange={set("time")}
        />
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
