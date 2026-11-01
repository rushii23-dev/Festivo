import type { WizardDraft } from "@/lib/wizard/draft";
import type { FieldErrors } from "@/lib/wizard/validate";

export interface StepProps {
  draft: WizardDraft;
  errors: FieldErrors;
  /** Updates the draft and clears errors for the changed fields. */
  update: (patch: Partial<WizardDraft>) => void;
  today: string;
}
