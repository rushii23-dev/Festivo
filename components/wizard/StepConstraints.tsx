import {
  Choice,
  Field,
  Fieldset,
  controlClass,
  describedBy,
} from "@/components/ui/field";
import {
  ACCESSIBILITY_NEEDS,
  DIETARY_NEEDS,
  SETTINGS,
  type AccessibilityNeed,
  type DietaryNeed,
} from "@/lib/schemas/common";
import { FREE_TEXT_MAX, toggleValue } from "@/lib/wizard/draft";
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
  error?: string;
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
  return (
    <div className="grid gap-8">
      <Fieldset
        id="dietary"
        name="dietary"
        legend="Dietary needs"
        hint="Optional. Pick all that apply."
      >
        <div className="flex flex-wrap gap-3">
          {DIETARY_NEEDS.map((need) => (
            <Choice
              key={need}
              type="checkbox"
              name="dietary"
              value={need}
              label={DIETARY_LABELS[need]}
              checked={draft.dietary.includes(need)}
              onChange={() =>
                update({ dietary: toggleValue<DietaryNeed>(draft.dietary, need) })
              }
            />
          ))}
        </div>
      </Fieldset>

      <Fieldset
        id="accessibility"
        name="accessibility"
        legend="Guest accessibility needs"
        hint="Optional. We’ll add these to venue and vendor questions."
      >
        <div className="flex flex-wrap gap-3">
          {ACCESSIBILITY_NEEDS.map((need) => (
            <Choice
              key={need}
              type="checkbox"
              name="accessibility"
              value={need}
              label={ACCESSIBILITY_LABELS[need]}
              checked={draft.accessibility.includes(need)}
              onChange={() =>
                update({
                  accessibility: toggleValue<AccessibilityNeed>(
                    draft.accessibility,
                    need,
                  ),
                })
              }
            />
          ))}
        </div>
      </Fieldset>

      <Fieldset id="setting" name="setting" legend="Indoors or outdoors?">
        <div className="flex flex-wrap gap-3">
          {SETTINGS.map((setting) => (
            <Choice
              key={setting}
              type="radio"
              name="setting"
              value={setting}
              label={SETTING_LABELS[setting]}
              checked={draft.setting === setting}
              onChange={() => update({ setting })}
            />
          ))}
        </div>
      </Fieldset>

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
