import { CheckboxGroup } from "@/components/ui/choice-group";
import { CEREMONIES } from "@/lib/schemas/common";
import { LIMITS } from "@/lib/schemas/eventInput";
import { draftQuestions } from "@/lib/wizard/draft";
import { CEREMONY_LABELS, VIBE_LABELS } from "@/lib/wizard/labels";
import type { StepProps } from "./types";

export function StepVibes({ draft, errors, update }: StepProps) {
  const questions = draftQuestions(draft);
  return (
    <div className="grid gap-8">
      <CheckboxGroup
        id="vibes"
        name="vibes"
        legend="Pick the styles that feel like you"
        hint={`Optional. Choose up to ${LIMITS.vibesMax}; we use them to personalise ideas.`}
        error={errors.vibes}
        options={questions.vibes}
        labels={VIBE_LABELS}
        selected={draft.vibes}
        onChange={(vibes) => update({ vibes })}
      />

      {questions.ceremonies ? (
        <CheckboxGroup
          id="ceremonies"
          name="ceremonies"
          legend="Which functions are you planning?"
          hint="Optional. Each one gets its own tasks and ideas."
          options={CEREMONIES}
          labels={CEREMONY_LABELS}
          selected={draft.ceremonies}
          onChange={(ceremonies) => update({ ceremonies })}
        />
      ) : null}
    </div>
  );
}
