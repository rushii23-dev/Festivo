"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { useHydratedStore } from "@/hooks/use-hydrated-store";
import { usePlanGeneration, type GenerationState } from "@/hooks/use-plan-generation";
import type { Plan } from "@/lib/schemas/plan";
import { usePlanStore } from "@/lib/store/planStore";
import { todayIso } from "@/lib/timeline/dates";
import {
  STEPS,
  STEP_FIELDS,
  firstInvalidStep,
  toEventInput,
  validateStep,
  type DraftField,
  type FieldErrors,
  type WizardDraft,
} from "@/lib/wizard/draft";

type Announce = ReturnType<typeof useAnnounce>;

/** Focuses the first input/select/textarea inside the container for `field`. */
function focusField(field: DraftField) {
  const container = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
  const control = container?.querySelector<HTMLElement>(
    "input:not([disabled]), select, textarea",
  );
  control?.focus();
}

/** Moves focus to the step's heading on every step change, not on first render. */
export function useStepHeadingFocus(step: number, hydrated: boolean) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (previousStep.current !== null && previousStep.current !== step) {
      headingRef.current?.focus();
    }
    previousStep.current = step;
  }, [step, hydrated]);
  return headingRef;
}

/** Announces generation progress politely and failures assertively. */
function useGenerationAnnouncements(state: GenerationState, announce: Announce) {
  const progress = state.status === "generating" ? state.message : null;
  const error = state.status === "error" ? state.message : null;
  useEffect(() => {
    if (progress) announce(progress);
  }, [progress, announce]);
  useEffect(() => {
    if (error) announce(error, "assertive");
  }, [error, announce]);
}

/** Field errors that clear as soon as the planner edits the field. */
function useFieldErrors(setDraft: (patch: Partial<WizardDraft>) => void) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const update = useCallback(
    (patch: Partial<WizardDraft>) => {
      setDraft(patch);
      setErrors((current) => {
        const next = { ...current };
        for (const key of Object.keys(patch) as DraftField[]) delete next[key];
        return next;
      });
    },
    [setDraft],
  );
  return { errors, setErrors, update };
}

/**
 * Everything the wizard does: the saved draft and step, validation with focus on
 * the first problem, and plan generation that saves the plan and opens it.
 */
export function useWizard() {
  const hydrated = useHydratedStore();
  const router = useRouter();
  const announce = useAnnounce();
  const store = usePlanStore(
    useShallow((s) => ({
      draft: s.draft,
      step: s.step,
      setDraft: s.setDraft,
      setStep: s.setStep,
      resetDraft: s.resetDraft,
      savePlan: s.savePlan,
    })),
  );
  const { draft, step, setStep, resetDraft, savePlan } = store;
  const today = useMemo(
    () => todayIso(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
    [],
  );
  const { errors, setErrors, update } = useFieldErrors(store.setDraft);

  const onPlan = useCallback(
    (plan: Plan) => {
      savePlan(plan);
      resetDraft();
      announce("Your plan is ready.");
      router.push(`/plan/${encodeURIComponent(plan.id)}`);
    },
    [announce, resetDraft, router, savePlan],
  );
  const generation = usePlanGeneration(onPlan);
  useGenerationAnnouncements(generation.state, announce);

  const current = STEPS[step] ?? STEPS[0];

  const goTo = (index: number) => {
    setErrors({});
    setStep(index);
  };

  const showErrors = (found: FieldErrors) => {
    setErrors(found);
    const fields = STEP_FIELDS[current.id].filter((f) => found[f]);
    const count = fields.length;
    announce(
      `${count} ${count === 1 ? "answer needs" : "answers need"} attention.`,
      "assertive",
    );
    const first = fields[0];
    if (first) requestAnimationFrame(() => focusField(first));
  };

  const generate = () => {
    const invalid = firstInvalidStep(draft, today);
    if (invalid && invalid !== "review") {
      goTo(STEPS.findIndex((s) => s.id === invalid));
      announce("Some answers need another look before we can plan.", "assertive");
      return;
    }
    const result = toEventInput(draft);
    if (!result.ok) {
      announce(result.issues[0] ?? "Some answers need another look.", "assertive");
      return;
    }
    void generation.start(result.input);
  };

  const onSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (current.id === "review") return generate();
    const found = validateStep(current.id, draft, today);
    if (Object.keys(found).length > 0) return showErrors(found);
    goTo(step + 1);
  };

  return {
    hydrated,
    draft,
    step,
    current,
    today,
    errors,
    update,
    generation,
    goTo,
    generate,
    onSubmit,
  };
}
