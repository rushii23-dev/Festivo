import { Check, LoaderCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  describeDate,
  describePriorities,
  describeTickets,
  describeTotal,
  listOr,
} from "@/lib/wizard/describe";
import { draftOccasion, draftQuestions, type WizardDraft } from "@/lib/wizard/draft";
import {
  ACCESSIBILITY_LABELS,
  CEREMONY_LABELS,
  DIETARY_LABELS,
  FORMAT_COPY,
  SETTING_LABELS,
  VIBE_LABELS,
} from "@/lib/wizard/labels";
import type { GenerationState } from "@/hooks/use-plan-generation";
import { PLAN_SECTIONS, SECTION_LABELS, type PlanSection } from "@/lib/plan/events";

interface ReviewProps {
  draft: WizardDraft;
  today: string;
  onEdit: (step: number) => void;
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-hairline pt-5" aria-label={title}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-[1.9rem] leading-none">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(step)}>
          Edit <span className="sr-only">{title.toLowerCase()}</span>
        </Button>
      </div>
      <dl className="grid gap-2 @md:grid-cols-[11rem_1fr]">{children}</dl>
    </section>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="caps pt-1 text-muted-foreground">{term}</dt>
      <dd className="break-words">{children}</dd>
    </>
  );
}

/** Every answer, grouped by step, each group with a button back to that step. */
export function ReviewSummary(props: ReviewProps) {
  return (
    <div className="grid gap-4">
      <Section title="Occasion" step={0} onEdit={props.onEdit}>
        <Row term="Celebrating">{draftOccasion(props.draft)?.label ?? "Not set"}</Row>
      </Section>
      <BasicsReview {...props} />
      <BudgetReview {...props} />
      <StyleReview {...props} />
      <NeedsReview {...props} />
    </div>
  );
}

function BasicsReview({ draft, today, onEdit }: ReviewProps) {
  const questions = draftQuestions(draft);
  return (
    <Section title="Basics" step={1} onEdit={onEdit}>
      <Row term="Name">{draft.name || "Not set"}</Row>
      <Row term="Date">{describeDate(draft, today)}</Row>
      {questions.multiDay ? <Row term="Days">{draft.days || "1"}</Row> : null}
      {questions.formats.length > 1 ? (
        <Row term="Format">{FORMAT_COPY[draft.format].label}</Row>
      ) : null}
      <Row term="Place">{draft.location || "Not set"}</Row>
      <Row term="Guests">{draft.guestCount || "Not set"}</Row>
      {questions.age && draft.ageTurning ? (
        <Row term="Turning">{draft.ageTurning}</Row>
      ) : null}
      {questions.kids ? <Row term="Children">{draft.kids ? "Yes" : "No"}</Row> : null}
    </Section>
  );
}

function BudgetReview({ draft, onEdit }: ReviewProps) {
  return (
    <Section title="Budget" step={2} onEdit={onEdit}>
      <Row term="Total">{describeTotal(draft) ?? "Not set"}</Row>
      {draftQuestions(draft).tickets ? (
        <Row term="Tickets">{describeTickets(draft)}</Row>
      ) : null}
      <Row term="Priorities">
        {listOr(describePriorities(draft), "Balanced across every category")}
      </Row>
    </Section>
  );
}

function StyleReview({ draft, onEdit }: ReviewProps) {
  return (
    <Section title="Vibe and style" step={3} onEdit={onEdit}>
      <Row term="Styles">
        {listOr(
          draft.vibes.map((v) => VIBE_LABELS[v]),
          "No preference",
        )}
      </Row>
      {draftQuestions(draft).ceremonies ? (
        <Row term="Functions">
          {listOr(
            draft.ceremonies.map((c) => CEREMONY_LABELS[c]),
            "Not chosen",
          )}
        </Row>
      ) : null}
    </Section>
  );
}

/** Dietary needs and setting only apply to events with a venue. */
function NeedsReview({ draft, onEdit }: ReviewProps) {
  const venue = draftQuestions(draft).venue;
  return (
    <Section title="Needs and limits" step={4} onEdit={onEdit}>
      {venue ? (
        <Row term="Dietary">
          {listOr(
            draft.dietary.map((d) => DIETARY_LABELS[d]),
            "None",
          )}
        </Row>
      ) : null}
      <Row term="Accessibility">
        {listOr(
          draft.accessibility.map((a) => ACCESSIBILITY_LABELS[a]),
          "None",
        )}
      </Row>
      {venue ? <Row term="Setting">{SETTING_LABELS[draft.setting]}</Row> : null}
      <Row term="Must-haves">{draft.mustHaves || "None"}</Row>
      <Row term="Must-avoids">{draft.mustAvoid || "None"}</Row>
    </Section>
  );
}

type SectionStatus = "done" | "working" | "waiting";

const STATUS_TEXT: Record<SectionStatus, string> = {
  done: ", done",
  working: ", in progress",
  waiting: ", waiting",
};

/** The section being written is the last one to arrive; before any arrives, the first. */
function sectionStatus(
  section: PlanSection,
  reached: readonly PlanSection[],
): SectionStatus {
  const active = reached.at(-1) ?? PLAN_SECTIONS[0];
  if (section === active) return "working";
  return reached.includes(section) ? "done" : "waiting";
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "done") return <Check className="size-4" />;
  if (status === "working")
    return <LoaderCircle className="size-4 motion-ok:animate-spin" />;
  return null;
}

/** Visual progress of the streamed generation. Screen readers get the same text via the live region. */
export function GenerationProgress({
  state,
  onCancel,
  onRetry,
}: {
  state: GenerationState;
  onCancel: () => void;
  onRetry: () => void;
}) {
  if (state.status === "error") {
    return (
      <div role="alert" className="grid gap-4 border border-destructive bg-card p-5">
        <p className="font-bold text-destructive">{state.message}</p>
        {state.retryable ? (
          <div>
            <Button type="button" onClick={onRetry}>
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  if (state.status !== "generating") return null;

  return (
    <div className="sticker grid gap-4 p-5" aria-busy="true">
      <p className="text-lg font-extrabold">{state.message}</p>
      <ol className="grid gap-2">
        {PLAN_SECTIONS.map((section) => {
          const status = sectionStatus(section, state.reached);
          return (
            <li key={section} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full border border-border"
              >
                <StatusIcon status={status} />
              </span>
              <span
                className={status === "waiting" ? "text-muted-foreground" : "font-bold"}
              >
                {SECTION_LABELS[section]}
                <span className="sr-only">{STATUS_TEXT[status]}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
