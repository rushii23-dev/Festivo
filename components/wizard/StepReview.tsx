import { Check, LoaderCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoney, parseMoneyInput } from "@/lib/budget/format";
import type { BudgetCategory } from "@/lib/schemas/common";
import { formatLongDate } from "@/lib/timeline/dates";
import { upcomingMonths, type WizardDraft } from "@/lib/wizard/draft";
import {
  ACCESSIBILITY_LABELS,
  CEREMONY_LABELS,
  DIETARY_LABELS,
  EVENT_TYPE_COPY,
  PRIORITY_LABELS,
  SETTING_LABELS,
  VIBE_LABELS,
} from "@/lib/wizard/labels";
import {
  GENERATION_STAGES,
  STAGE_LABELS,
  type GenerationState,
} from "@/hooks/use-plan-generation";

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
      <dl className="grid gap-2 sm:grid-cols-[12rem_1fr]">{children}</dl>
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

const listOr = (values: string[], empty: string) =>
  values.length > 0 ? values.join(", ") : empty;

export function describeDate(draft: WizardDraft, today: string): string {
  if (draft.dateKind === "fixed")
    return draft.date ? formatLongDate(draft.date) : "Not set";
  if (!draft.month) return "Flexible";
  const label =
    upcomingMonths(today).find((m) => m.value === draft.month)?.label ?? draft.month;
  return `Flexible, around ${label}`;
}

export function ReviewSummary({
  draft,
  today,
  onEdit,
}: {
  draft: WizardDraft;
  today: string;
  onEdit: (step: number) => void;
}) {
  const total = parseMoneyInput(draft.budgetTotal);
  const priorities = Object.entries(draft.priorities)
    .filter(([, value]) => value !== 3)
    .map(
      ([key, value]) =>
        `${BUDGET_CATEGORY_LABELS[key as BudgetCategory]}: ${PRIORITY_LABELS[value ?? 3]}`,
    );

  return (
    <div className="grid gap-4">
      <Section title="Event type" step={0} onEdit={onEdit}>
        <Row term="Celebrating">
          {draft.eventType ? EVENT_TYPE_COPY[draft.eventType].title : "Not set"}
        </Row>
      </Section>
      <Section title="Basics" step={1} onEdit={onEdit}>
        <Row term="Name">{draft.name || "Not set"}</Row>
        <Row term="Date">{describeDate(draft, today)}</Row>
        <Row term="Place">{draft.location || "Not set"}</Row>
        <Row term="Guests">{draft.guestCount || "Not set"}</Row>
      </Section>
      <Section title="Budget" step={2} onEdit={onEdit}>
        <Row term="Total">{total ? formatMoney(total, draft.currency) : "Not set"}</Row>
        <Row term="Priorities">
          {listOr(priorities, "Balanced across every category")}
        </Row>
      </Section>
      <Section title="Vibe and style" step={3} onEdit={onEdit}>
        <Row term="Styles">
          {listOr(
            draft.vibes.map((v) => VIBE_LABELS[v]),
            "No preference",
          )}
        </Row>
        {draft.eventType === "wedding" ? (
          <Row term="Functions">
            {listOr(
              draft.ceremonies.map((c) => CEREMONY_LABELS[c]),
              "Not chosen",
            )}
          </Row>
        ) : null}
      </Section>
      <Section title="Needs and limits" step={4} onEdit={onEdit}>
        <Row term="Dietary">
          {listOr(
            draft.dietary.map((d) => DIETARY_LABELS[d]),
            "None",
          )}
        </Row>
        <Row term="Accessibility">
          {listOr(
            draft.accessibility.map((a) => ACCESSIBILITY_LABELS[a]),
            "None",
          )}
        </Row>
        <Row term="Setting">{SETTING_LABELS[draft.setting]}</Row>
        <Row term="Must-haves">{draft.mustHaves || "None"}</Row>
        <Row term="Must-avoids">{draft.mustAvoid || "None"}</Row>
      </Section>
    </div>
  );
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

  const current = GENERATION_STAGES.find((stage) => !state.reached.includes(stage));
  const active = state.reached.at(-1);
  return (
    <div className="sticker grid gap-4 p-5" aria-busy="true">
      <p className="text-lg font-extrabold">{state.message}</p>
      <ol className="grid gap-2">
        {GENERATION_STAGES.map((stage) => {
          const done = state.reached.includes(stage) && stage !== active;
          const working = stage === active || (!active && stage === current);
          return (
            <li key={stage} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-7 items-center justify-center rounded-full border border-border"
              >
                {done ? (
                  <Check className="size-4" />
                ) : working ? (
                  <LoaderCircle className="size-4 motion-ok:animate-spin" />
                ) : null}
              </span>
              <span className={done || working ? "font-bold" : "text-muted-foreground"}>
                {STAGE_LABELS[stage]}
                <span className="sr-only">
                  {done ? ", done" : working ? ", in progress" : ", waiting"}
                </span>
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
