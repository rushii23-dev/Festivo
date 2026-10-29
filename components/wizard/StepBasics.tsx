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
import { draftQuestions, upcomingMonths } from "@/lib/wizard/draft";
import { FORMAT_COPY } from "@/lib/wizard/labels";
import type { StepProps } from "./types";

const NAME_HINTS: Partial<Record<string, string>> = {
  wedding: "For example, Priya & Arjun’s wedding.",
  birthday: "For example, Maya turns 7.",
  "book-club": "For example, Sunday Readers: March.",
  hackathon: "For example, Build for Pune 2027.",
};

export function StepBasics({ draft, errors, update, today }: StepProps) {
  const months = useMemo(() => upcomingMonths(today), [today]);
  const questions = draftQuestions(draft);
  const online = draft.format === "online";
  const nameHint = NAME_HINTS[draft.occasion];

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

      {questions.multiDay ? (
        <Field
          id="event-days"
          name="days"
          label="How many days?"
          hint="Enter 1 for a single day."
          error={errors.days}
          className="max-w-[14rem]"
        >
          <input
            id="event-days"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft.days}
            onChange={(e) => update({ days: e.target.value })}
            aria-invalid={errors.days ? true : undefined}
            aria-describedby={describedBy("event-days", {
              hint: true,
              error: errors.days,
            })}
            className={controlClass}
          />
        </Field>
      ) : null}

      {questions.formats.length > 1 ? (
        <Fieldset id="event-format" name="format" legend="How will people join?" required>
          <div className="flex flex-wrap gap-3">
            {questions.formats.map((format) => (
              <Choice
                key={format}
                type="radio"
                name="format"
                value={format}
                label={FORMAT_COPY[format].label}
                checked={draft.format === format}
                onChange={() => update({ format })}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {FORMAT_COPY[draft.format].hint}
          </p>
        </Fieldset>
      ) : null}

      <div className="grid gap-6 @md:grid-cols-2">
        <Field
          id="event-location"
          name="location"
          label={online ? "City or time zone" : "City or place"}
          required
          hint={
            online
              ? "Where most guests are, so times suit them."
              : "Helps us suggest local food, vendors and customs."
          }
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
          label={
            draft.group === "work" || draft.group === "meetup"
              ? "Expected attendees"
              : "Number of guests"
          }
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

      {questions.age ? (
        <Field
          id="event-age"
          name="ageTurning"
          label="Age being celebrated"
          hint="Optional. It shapes the ideas, the cake and the activities."
          error={errors.ageTurning}
          className="max-w-[14rem]"
        >
          <input
            id="event-age"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={draft.ageTurning}
            onChange={(e) => update({ ageTurning: e.target.value })}
            aria-invalid={errors.ageTurning ? true : undefined}
            aria-describedby={describedBy("event-age", {
              hint: true,
              error: errors.ageTurning,
            })}
            className={controlClass}
          />
        </Field>
      ) : null}

      {questions.kids ? (
        <Fieldset id="event-kids" name="kids" legend="Will children be there?">
          <div className="flex flex-wrap gap-3">
            <Choice
              type="radio"
              name="kids"
              value="yes"
              label="Yes"
              checked={draft.kids}
              onChange={() => update({ kids: true })}
            />
            <Choice
              type="radio"
              name="kids"
              value="no"
              label="No, adults only"
              checked={!draft.kids}
              onChange={() => update({ kids: false })}
            />
          </div>
        </Fieldset>
      ) : null}
    </div>
  );
}
