import { useMemo } from "react";
import {
  Choice,
  Field,
  Fieldset,
  TextField,
  controlClass,
  describedBy,
} from "@/components/ui/field";
import { LIMITS } from "@/lib/schemas/eventInput";
import { addDays } from "@/lib/timeline/dates";
import { MAX_DAYS_AHEAD } from "@/lib/timeline/resolveDate";
import { countsAttendees } from "@/lib/wizard/describe";
import { draftQuestions, upcomingMonths } from "@/lib/wizard/draft";
import { FORMAT_COPY } from "@/lib/wizard/labels";
import type { StepProps } from "./types";

const NAME_HINTS: Partial<Record<string, string>> = {
  wedding: "For example, Priya & Arjun’s wedding.",
  birthday: "For example, Maya turns 7.",
  "book-club": "For example, Sunday Readers: March.",
  hackathon: "For example, Build for Pune 2027.",
};

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
    <Fieldset id="event-format" name="format" legend="How will people join?" required>
      <div className="flex flex-wrap gap-3">
        {draftQuestions(draft).formats.map((format) => (
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
      <p className="text-sm text-muted-foreground">{FORMAT_COPY[draft.format].hint}</p>
    </Fieldset>
  );
}

/** Asked of family occasions, so the plan can add activities and food for children. */
function KidsQuestion({ draft, update }: StepProps) {
  return (
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
  );
}
