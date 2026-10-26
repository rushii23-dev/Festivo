import { useMemo } from "react";
import {
  Choice,
  Field,
  Fieldset,
  controlClass,
  describedBy,
} from "@/components/ui/field";
import { LIMITS } from "@/lib/schemas/eventInput";
import { addDays } from "@/lib/timeline/dates";
import { MAX_DAYS_AHEAD } from "@/lib/timeline/resolveDate";
import { upcomingMonths } from "@/lib/wizard/draft";
import type { StepProps } from "./types";

export function StepBasics({ draft, errors, update, today }: StepProps) {
  const months = useMemo(() => upcomingMonths(today), [today]);
  const nameHint =
    draft.eventType === "wedding" ? "For example, Priya & Arjun’s wedding." : undefined;

  return (
    <div className="grid gap-6">
      <Field
        id="event-name"
        name="name"
        label="Event name"
        required
        hint={nameHint}
        error={errors.name}
      >
        <input
          id="event-name"
          type="text"
          autoComplete="off"
          maxLength={LIMITS.nameMax}
          value={draft.name}
          onChange={(e) => update({ name: e.target.value })}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("event-name", {
            hint: nameHint,
            error: errors.name,
          })}
          className={controlClass}
        />
      </Field>

      <Fieldset id="date-kind" name="dateKind" legend="When is it?" required>
        <div className="flex flex-wrap gap-3">
          <Choice
            type="radio"
            name="dateKind"
            value="fixed"
            label="On a set date"
            checked={draft.dateKind === "fixed"}
            onChange={() => update({ dateKind: "fixed" })}
          />
          <Choice
            type="radio"
            name="dateKind"
            value="flexible"
            label="My date is flexible"
            checked={draft.dateKind === "flexible"}
            onChange={() => update({ dateKind: "flexible" })}
          />
        </div>
      </Fieldset>

      {draft.dateKind === "fixed" ? (
        <Field
          id="event-date"
          name="date"
          label="Event date"
          required
          error={errors.date}
        >
          <input
            id="event-date"
            type="date"
            min={today}
            max={addDays(today, MAX_DAYS_AHEAD)}
            value={draft.date}
            onChange={(e) => update({ date: e.target.value })}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={describedBy("event-date", { error: errors.date })}
            className={controlClass}
          />
        </Field>
      ) : (
        <Field
          id="event-month"
          name="month"
          label="Preferred month"
          hint="Optional. We’ll plan around the middle of the month."
          error={errors.month}
        >
          <select
            id="event-month"
            value={draft.month}
            onChange={(e) => update({ month: e.target.value })}
            aria-invalid={errors.month ? true : undefined}
            aria-describedby={describedBy("event-month", {
              hint: true,
              error: errors.month,
            })}
            className={controlClass}
          >
            <option value="">Not sure yet (about three months from now)</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id="event-location"
          name="location"
          label="City or place"
          required
          hint="Helps us suggest local food, vendors and customs."
          error={errors.location}
        >
          <input
            id="event-location"
            type="text"
            autoComplete="address-level2"
            maxLength={LIMITS.locationMax}
            value={draft.location}
            onChange={(e) => update({ location: e.target.value })}
            aria-invalid={errors.location ? true : undefined}
            aria-describedby={describedBy("event-location", {
              hint: true,
              error: errors.location,
            })}
            className={controlClass}
          />
        </Field>
        <Field
          id="event-guests"
          name="guestCount"
          label="Number of guests"
          required
          hint={`A rough number is fine, up to ${LIMITS.guestsMax.toLocaleString("en-IN")}.`}
          error={errors.guestCount}
        >
          <input
            id="event-guests"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft.guestCount}
            onChange={(e) => update({ guestCount: e.target.value })}
            aria-invalid={errors.guestCount ? true : undefined}
            aria-describedby={describedBy("event-guests", {
              hint: true,
              error: errors.guestCount,
            })}
            className={controlClass}
          />
        </Field>
      </div>
    </div>
  );
}
