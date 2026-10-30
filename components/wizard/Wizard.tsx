"use client";

import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { StageHeading } from "@/components/onboarding/StageHeading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { firstName } from "@/lib/profile/profile";
import { STEPS } from "@/lib/wizard/draft";
import { STEP_COPY } from "@/lib/wizard/labels";
import { PlanSoFar } from "./PlanSoFar";
import { StepBasics } from "./StepBasics";
import { StepBudget } from "./StepBudget";
import { StepConstraints } from "./StepConstraints";
import { StepEventType } from "./StepEventType";
import { GenerationProgress, ReviewSummary } from "./StepReview";
import { StepVibes } from "./StepVibes";
import { useStepHeadingFocus, useWizard } from "./useWizard";
import { WizardProgress } from "./WizardProgress";

const STEP_COMPONENTS = [
  StepEventType,
  StepBasics,
  StepBudget,
  StepVibes,
  StepConstraints,
] as const;

type WizardState = ReturnType<typeof useWizard>;

/**
 * The plan card on the left, the question on the right, and plenty of
 * parchment around both. On phones the card shrinks to one line on top.
 */
function WizardLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[84rem] grid-cols-1 items-start gap-10 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[clamp(3rem,7vw,8rem)] lg:py-[clamp(3.5rem,8vh,6.5rem)]">
      {aside}
      <div className="@container min-w-0">
        <div className="grid w-full max-w-[42rem] content-start gap-10">{children}</div>
      </div>
    </div>
  );
}

/** Shown until the saved draft has loaded from this browser. */
function WizardLoading() {
  return (
    <WizardLayout aside={<Skeleton className="h-[28rem]" />}>
      <div
        className="grid gap-6"
        aria-busy="true"
        aria-label="Loading your saved answers"
      >
        <Skeleton className="h-16" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48" />
      </div>
    </WizardLayout>
  );
}

/** The current step's questions, or the review with generation progress. */
function StepBody({ wizard }: { wizard: WizardState }) {
  const { draft, errors, update, today, step, current, generation } = wizard;
  if (current.id !== "review") {
    const StepComponent = STEP_COMPONENTS[step] ?? StepEventType;
    return <StepComponent draft={draft} errors={errors} update={update} today={today} />;
  }
  return (
    <>
      <ReviewSummary draft={draft} today={today} onEdit={wizard.goTo} />
      <GenerationProgress
        state={generation.state}
        onCancel={generation.cancel}
        onRetry={wizard.generate}
      />
    </>
  );
}

/** Back on the left; Next, Review answers or Generate on the right. */
function StepNav({ wizard }: { wizard: WizardState }) {
  const { step, current, generation } = wizard;
  const busy =
    generation.state.status === "generating" || generation.state.status === "done";
  const back =
    step > 0 ? (
      <Button
        type="button"
        variant="link"
        onClick={() => wizard.goTo(step - 1)}
        disabled={busy}
      >
        <ArrowLeft aria-hidden="true" />
        Back
      </Button>
    ) : (
      <span />
    );
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-8">
      {back}
      {current.id === "review" ? (
        <Button type="submit" size="lg" disabled={busy}>
          <Sparkles aria-hidden="true" />
          {generation.state.status === "error"
            ? "Try generating again"
            : "Generate my plan"}
        </Button>
      ) : (
        <Button type="submit" size="lg">
          {step === STEPS.length - 2 ? "Review answers" : "Next"}
          <ArrowRight aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

/** `name` personalises the first question once the planner has an account. */
export function Wizard({ name }: { name?: string | undefined } = {}) {
  const wizard = useWizard();
  const headingRef = useStepHeadingFocus(wizard.step, wizard.hydrated);
  if (!wizard.hydrated) return <WizardLoading />;

  const { draft, step, current, today } = wizard;
  const title =
    current.id === "type" && name
      ? `What are you celebrating, ${firstName(name)}?`
      : current.title;

  return (
    <div data-event={draft.eventType || undefined}>
      <WizardLayout aside={<PlanSoFar draft={draft} today={today} />}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="caps">Plan a new event</h1>
          <p className="text-sm text-muted-foreground">Saved on this device as you go</p>
        </div>
        <WizardProgress current={step} onJump={wizard.goTo} />

        {/* Keyed by step so each question rises into place. */}
        <form
          key={current.id}
          noValidate
          onSubmit={wizard.onSubmit}
          aria-labelledby="wizard-step-title"
          className="grid gap-10"
        >
          <StageHeading
            level={2}
            id="wizard-step-title"
            ref={headingRef}
            eyebrow={`Step ${step + 1} of ${STEPS.length}`}
            title={title}
            intro={STEP_COPY[current.id].intro}
          />
          <div className="stage-rise grid gap-10 [--delay:0.12s]">
            <StepBody wizard={wizard} />
          </div>
          <StepNav wizard={wizard} />
        </form>
      </WizardLayout>
    </div>
  );
}
