import type { ReactNode } from "react";
import { FestivoSeal } from "@/components/brand/FestivoSeal";
import { formatMoney, parseMoneyInput } from "@/lib/budget/format";
import { draftOccasion, draftQuestions, type WizardDraft } from "@/lib/wizard/draft";
import { FORMAT_COPY, VIBE_LABELS } from "@/lib/wizard/labels";
import { describeDate, describeTickets } from "./StepReview";

function Line({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-hairline py-4 first:border-t-0">
      <dt className="caps text-[0.6875rem] text-muted-foreground">{term}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

const Empty = () => <span className="text-muted-foreground italic">Not yet</span>;

/** The answers as a list of lines: when, where, who, budget, tickets, style. */
function Details({ draft, today }: { draft: WizardDraft; today: string }) {
  const questions = draftQuestions(draft);
  const total = parseMoneyInput(draft.budgetTotal);
  const dateSet = draft.dateKind === "flexible" || Boolean(draft.date);
  const days = Number(draft.days);
  const where = [
    questions.formats.length > 1 ? FORMAT_COPY[draft.format].label : null,
    draft.location.trim() || null,
  ].filter(Boolean);
  const people =
    draft.group === "work" || draft.group === "meetup" ? "Attendees" : "Guests";

  return (
    <dl className="hidden lg:grid">
      <Line term="When">
        {dateSet ? describeDate(draft, today) : <Empty />}
        {questions.multiDay && days > 1 ? `, ${days} days` : null}
      </Line>
      <Line term="Where">{where.length > 0 ? where.join(", ") : <Empty />}</Line>
      <Line term={people}>
        {draft.guestCount.trim() || <Empty />}
        {questions.kids && draft.kids ? ", with children" : null}
      </Line>
      <Line term="Budget">{total ? formatMoney(total, draft.currency) : <Empty />}</Line>
      {questions.tickets ? <Line term="Tickets">{describeTickets(draft)}</Line> : null}
      <Line term="Style">
        {draft.vibes.length > 0 ? (
          draft.vibes.map((v) => VIBE_LABELS[v]).join(", ")
        ) : (
          <Empty />
        )}
      </Line>
    </dl>
  );
}

/**
 * The answers so far, set like an invitation card beside the questions. It
 * repeats what the form already says, so it is a labelled aside that screen
 * reader users can skip.
 */
export function PlanSoFar({ draft, today }: { draft: WizardDraft; today: string }) {
  const occasion = draftOccasion(draft);
  const short = [occasion?.label, draft.name.trim(), draft.location.trim()]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside
      aria-label="Your plan so far"
      // On phones the card waits until there is something to show.
      className={`relative border border-hairline bg-card p-1.5 lg:sticky lg:top-10 ${
        short ? "" : "hidden lg:block"
      }`}
    >
      <div className="grid gap-6 border border-hairline px-6 py-7 sm:px-8 lg:px-10 lg:py-12">
        <div className="grid justify-items-center gap-4 text-center">
          <FestivoSeal className="hidden h-12 lg:block" />
          <p className="caps text-muted-foreground">Your plan so far</p>
          <div aria-hidden="true" className="hidden lg:block">
            <span className="ornament-center">
              <span />
            </span>
          </div>
        </div>

        <p className="text-center font-display text-[1.6rem] leading-tight lg:hidden">
          {short}
        </p>

        <div className="hidden gap-2 text-center lg:grid">
          <p className="caps text-event">{occasion?.label ?? "An occasion"}</p>
          <p className="font-display text-[2.4rem] leading-[1.05] text-balance break-words">
            {draft.name.trim() || (
              <span className="text-muted-foreground italic">Your celebration</span>
            )}
          </p>
        </div>

        <Details draft={draft} today={today} />
      </div>
    </aside>
  );
}
