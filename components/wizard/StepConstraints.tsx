import { CheckboxGroup, RadioGroup } from "@/components/ui/choice-group";
import { Field, controlClass, describedBy } from "@/components/ui/field";
import {
  ACCESSIBILITY_NEEDS,
  DIETARY_NEEDS,
  SETTINGS,
  type AccessibilityNeed,
} from "@/lib/schemas/common";
import { FREE_TEXT_MAX, ONLINE_ACCESSIBILITY, draftQuestions } from "@/lib/wizard/draft";
import {
  ACCESSIBILITY_LABELS,
  DIETARY_LABELS,
  SETTING_LABELS,
} from "@/lib/wizard/labels";
import type { StepProps } from "./types";

function FreeText({
  id,
  name,
  label,
  hint,
  value,
  error,
  onChange,
}: {
  id: string;
  name: "mustHaves" | "mustAvoid";
  label: string;
  hint: string;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}) {
  const countId = `${id}-count`;
  return (
    <Field id={id} name={name} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        rows={3}
        maxLength={FREE_TEXT_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[describedBy(id, { hint: true, error }), countId].join(" ")}
        className={`${controlClass} resize-y`}
      />
      <p id={countId} className="text-right text-sm text-muted-foreground">
        {value.length} of {FREE_TEXT_MAX} characters
      </p>
    </Field>
  );
}

export function StepConstraints({ draft, errors, update }: StepProps) {
  const inPerson = draftQuestions(draft).venue;
  const needs: readonly AccessibilityNeed[] = inPerson
    ? ACCESSIBILITY_NEEDS
    : ONLINE_ACCESSIBILITY;
  return (
    <div className="grid gap-8">
      {inPerson ? (
        <CheckboxGroup
          id="dietary"
          name="dietary"
          legend="Dietary needs"
          hint="Optional. Pick all that apply."
          options={DIETARY_NEEDS}
          labels={DIETARY_LABELS}
          selected={draft.dietary}
          onChange={(dietary) => update({ dietary })}
        />
      ) : null}

      <CheckboxGroup
        id="accessibility"
        name="accessibility"
        legend="Guest accessibility needs"
        hint={
          inPerson
            ? "Optional. We’ll add these to venue and vendor questions."
            : "Optional. We’ll make sure the platform supports them."
        }
        options={needs}
        labels={ACCESSIBILITY_LABELS}
        selected={draft.accessibility}
        onChange={(accessibility) => update({ accessibility })}
      />

      {inPerson ? (
        <RadioGroup
          id="setting"
          name="setting"
          legend="Indoors or outdoors?"
          options={SETTINGS}
          labels={SETTING_LABELS}
          value={draft.setting}
          onChange={(setting) => update({ setting })}
        />
      ) : null}

      <FreeText
        id="must-haves"
        name="mustHaves"
        label="Must-haves"
        hint="Optional. Anything you can’t do without, like a live dhol or a vegan cake."
        value={draft.mustHaves}
        error={errors.mustHaves}
        onChange={(mustHaves) => update({ mustHaves })}
      />
      <FreeText
        id="must-avoid"
        name="mustAvoid"
        label="Must-avoids"
        hint="Optional. Anything to steer clear of, like plastic décor or loud music after 10pm."
        value={draft.mustAvoid}
        error={errors.mustAvoid}
        onChange={(mustAvoid) => update({ mustAvoid })}
      />
    </div>
  );
}
