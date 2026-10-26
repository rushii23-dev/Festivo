import { Choice, Fieldset } from "@/components/ui/field";
import { CEREMONIES, VIBES, type Ceremony, type Vibe } from "@/lib/schemas/common";
import { LIMITS } from "@/lib/schemas/eventInput";
import { toggleValue } from "@/lib/wizard/draft";
import { CEREMONY_LABELS, VIBE_LABELS } from "@/lib/wizard/labels";
import type { StepProps } from "./types";

export function StepVibes({ draft, errors, update }: StepProps) {
  return (
    <div className="grid gap-8">
      <Fieldset
        id="vibes"
        name="vibes"
        legend="Pick the styles that feel like you"
        hint={`Optional. Choose up to ${LIMITS.vibesMax}; we use them to personalise ideas.`}
        error={errors.vibes}
      >
        <div className="flex flex-wrap gap-3">
          {VIBES.map((vibe) => (
            <Choice
              key={vibe}
              type="checkbox"
              name="vibes"
              value={vibe}
              label={VIBE_LABELS[vibe]}
              checked={draft.vibes.includes(vibe)}
              onChange={() => update({ vibes: toggleValue<Vibe>(draft.vibes, vibe) })}
            />
          ))}
        </div>
      </Fieldset>

      {draft.eventType === "wedding" ? (
        <Fieldset
          id="ceremonies"
          name="ceremonies"
          legend="Which functions are you planning?"
          hint="Optional. Each one gets its own tasks and ideas."
        >
          <div className="flex flex-wrap gap-3">
            {CEREMONIES.map((ceremony) => (
              <Choice
                key={ceremony}
                type="checkbox"
                name="ceremonies"
                value={ceremony}
                label={CEREMONY_LABELS[ceremony]}
                checked={draft.ceremonies.includes(ceremony)}
                onChange={() =>
                  update({
                    ceremonies: toggleValue<Ceremony>(draft.ceremonies, ceremony),
                  })
                }
              />
            ))}
          </div>
        </Fieldset>
      ) : null}
    </div>
  );
}
