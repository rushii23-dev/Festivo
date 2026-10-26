"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydratedStore } from "@/hooks/use-hydrated-store";
import { usePlanGeneration } from "@/hooks/use-plan-generation";
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
import { StepBasics } from "./StepBasics";
import { StepBudget } from "./StepBudget";
import { StepConstraints } from "./StepConstraints";
import { StepEventType } from "./StepEventType";
import { GenerationProgress, ReviewSummary } from "./StepReview";
import { StepVibes } from "./StepVibes";
import { WizardProgress } from "./WizardProgress";
import type { StepProps } from "./types";

const STEP_COMPONENTS = [
  StepEventType,
  StepBasics,
  StepBudget,
  StepVibes,
  StepConstraints,
] as const;

/** Focuses the first input/select/textarea inside the container for `field`. */
function focusField(field: DraftField) {
  const container = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
  const control = container?.querySelector<HTMLElement>(
    "input:not([disabled]), select, textarea",
  );
  control?.focus();
}

export function Wizard() {
  const hydrated = useHydratedStore();
  const router = useRouter();
  const announce = useAnnounce();
  const { draft, step, setDraft, setStep, resetDraft, savePlan } = usePlanStore(
    useShallow((s) => ({
      draft: s.draft,
      step: s.step,
      setDraft: s.setDraft,
      setStep: s.setStep,
      resetDraft: s.resetDraft,
      savePlan: s.savePlan,
    })),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<number | null>(null);
  const today = useMemo(
    () => todayIso(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone),
    [],
  );

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

  // Move focus to the new step's heading on every step change (not on first render).
  useEffect(() => {
    if (!hydrated) return;
    if (previousStep.current !== null && previousStep.current !== step) {
      headingRef.current?.focus();
    }
    previousStep.current = step;
  }, [step, hydrated]);

  // Announce generation progress politely.
  const progressMessage =
    generation.state.status === "generating" ? generation.state.message : null;
  const errorMessage =
    generation.state.status === "error" ? generation.state.message : null;
  useEffect(() => {
    if (progressMessage) announce(progressMessage);
  }, [progressMessage, announce]);
  useEffect(() => {
    if (errorMessage) announce(errorMessage, "assertive");
  }, [errorMessage, announce]);

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

  if (!hydrated) {
    return (
      <div
        className="grid gap-6"
        aria-busy="true"
        aria-label="Loading your saved answers"
      >
        <Skeleton className="h-16" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const current = STEPS[step] ?? STEPS[0];
  const isReview = current.id === "review";
  const busy =
    generation.state.status === "generating" || generation.state.status === "done";

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

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isReview) return generate();
    const found = validateStep(current.id, draft, today);
    if (Object.keys(found).length > 0) return showErrors(found);
    goTo(step + 1);
  };

  const StepComponent = isReview ? null : STEP_COMPONENTS[step];
  const stepProps: StepProps = { draft, errors, update, today };

  return (
    <div data-event={draft.eventType || undefined} className="grid gap-8">
      <WizardProgress current={step} onJump={goTo} />

      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby="wizard-step-title"
        className="grid gap-8"
      >
        <h2
          id="wizard-step-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-title outline-none"
        >
          {current.title}
        </h2>

        {StepComponent ? <StepComponent {...stepProps} /> : null}
        {isReview ? (
          <>
            <ReviewSummary draft={draft} today={today} onEdit={goTo} />
            <GenerationProgress
              state={generation.state}
              onCancel={generation.cancel}
              onRetry={generate}
            />
          </>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-hairline pt-6">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo(step - 1)}
              disabled={busy}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          ) : (
            <span />
          )}
          {isReview ? (
            <Button type="submit" size="lg" disabled={busy}>
              <Sparkles aria-hidden="true" />
              {generation.state.status === "error"
                ? "Try generating again"
                : "Generate my plan"}
            </Button>
          ) : (
            <Button type="submit" size="lg">
              {step === STEPS.length - 2 ? "Review answers" : "Next"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
