import { useMemo } from "react";
import { RadioGroup } from "@/components/ui/choice-group";
import { Field, TextField, controlClass, describedBy } from "@/components/ui/field";
import { LIMITS } from "@/lib/schemas/eventInput";
import { addDays } from "@/lib/timeline/dates";
import { MAX_DAYS_AHEAD } from "@/lib/timeline/resolveDate";
import { countsAttendees } from "@/lib/wizard/describe";
import { draftQuestions, upcomingMonths } from "@/lib/wizard/draft";
import {
  DATE_KIND_LABELS,
  FORMAT_HINTS,
  FORMAT_LABELS,
  KIDS_LABELS,
} from "@/lib/wizard/labels";
import type { StepProps } from "./types";

const NAME_HINTS: Partial<Record<string, string>> = {
  wedding: "For example, Priya & Arjun’s wedding.",
  birthday: "For example, Maya turns 7.",
  "book-club": "For example, Sunday Readers: March.",
  hackathon: "For example, Build for Pune 2027.",
};

const DATE_KINDS = ["fixed", "flexible"] as const;
const KIDS_ANSWERS = ["yes", "no"] as const;

/** Step 2: the name, when, how people join, where, how many, and occasion extras. */
export function StepBasics(props: StepProps) {
  const { draft, errors, update } = props;
  const questions = draftQuestions(draft);
  const online = draft.format === "online";
  const audience = countsAttendees(draft);

  return (
    <div className="grid gap-6">
      <TextField
        id="event-name"
        name="name"
        label="Event name"
        required
        hint={NAME_HINTS[draft.occasion]}
        error={errors.name}
        maxLength={LIMITS.nameMax}
        value={draft.name}
        onValueChange={(name) => update({ name })}
      />
      <DateQuestions {...props} />
      {questions.multiDay ? (
        <TextField
          id="event-days"
          name="days"
          label="How many days?"
          hint="Enter 1 for a single day."
          error={errors.days}
          className="max-w-[14rem]"
          numeric
          value={draft.days}
          onValueChange={(days) => update({ days })}
        />
      ) : null}
      {questions.formats.length > 1 ? <FormatQuestion {...props} /> : null}

      <div className="grid gap-6 @md:grid-cols-2">
        <TextField
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
          autoComplete="address-level2"
          maxLength={LIMITS.locationMax}
          value={draft.location}
          onValueChange={(location) => update({ location })}
        />
        <TextField
          id="event-guests"
          name="guestCount"
          label={audience ? "Expected attendees" : "Number of guests"}
          required
          hint={`A rough number is fine, up to ${LIMITS.guestsMax.toLocaleString("en-IN")}.`}
          error={errors.guestCount}
          numeric
          value={draft.guestCount}
          onValueChange={(guestCount) => update({ guestCount })}
        />
      </div>

      {questions.age ? (
        <TextField
          id="event-age"
          name="ageTurning"
          label="Age being celebrated"
          hint="Optional. It shapes the ideas, the cake and the activities."
          error={errors.ageTurning}
          className="max-w-[14rem]"
          numeric
          value={draft.ageTurning}
          onValueChange={(ageTurning) => update({ ageTurning })}
        />
      ) : null}
      {questions.kids ? <KidsQuestion {...props} /> : null}
    </div>
  );
}

/** A set date, or a flexible one with an optional preferred month. */
function DateQuestions({ draft, errors, update, today }: StepProps) {
  const months = useMemo(() => upcomingMonths(today), [today]);
  return (
    <>
      <RadioGroup
        id="date-kind"
        name="dateKind"
        legend="When is it?"
        required
        options={DATE_KINDS}
        labels={DATE_KIND_LABELS}
        value={draft.dateKind}
        onChange={(dateKind) => update({ dateKind })}
      />

      {draft.dateKind === "fixed" ? (
        <TextField
          id="event-date"
          name="date"
          label="Event date"
          required
          error={errors.date}
          type="date"
          min={today}
          max={addDays(today, MAX_DAYS_AHEAD)}
          value={draft.date}
          onValueChange={(date) => update({ date })}
        />
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
    </>
  );
}

/** In person, online or hybrid, for occasions that can run more than one way. */
function FormatQuestion({ draft, update }: StepProps) {
  return (
    <RadioGroup
      id="event-format"
      name="format"
      legend="How will people join?"
      required
      options={draftQuestions(draft).formats}
      labels={FORMAT_LABELS}
      value={draft.format}
      onChange={(format) => update({ format })}
    >
      <p className="text-sm text-muted-foreground">{FORMAT_HINTS[draft.format]}</p>
    </RadioGroup>
  );
}

/** Asked of family occasions, so the plan can add activities and food for children. */
function KidsQuestion({ draft, update }: StepProps) {
  return (
    <RadioGroup
      id="event-kids"
      name="kids"
      legend="Will children be there?"
      options={KIDS_ANSWERS}
      labels={KIDS_LABELS}
      value={draft.kids ? "yes" : "no"}
      onChange={(answer) => update({ kids: answer === "yes" })}
    />
  );
}
