"use client";

import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { costTierName, costTierSymbol } from "@/lib/budget/format";
import { fitsBudget } from "@/lib/ideas/fit";
import { IDEA_CATEGORY_LABELS } from "@/lib/plan/dashboard";
import { addIdeas, setIdeaDismissed, setIdeaSaved } from "@/lib/plan/edit";
import {
  IDEA_CATEGORIES,
  type Idea,
  type IdeaCategory,
  type Plan,
} from "@/lib/schemas/plan";
import { postJson } from "./client";
import type { PanelProps } from "./PlanDashboard";
import { PanelHeader, StatusNote } from "./parts";

function IdeaCard({
  idea,
  plan,
  update,
}: {
  idea: Idea;
  plan: Plan;
  update: PanelProps["update"];
}) {
  const announce = useAnnounce();
  const fits = fitsBudget(idea.costTier, plan);
  return (
    <li
      className={`relative grid content-start gap-3 border bg-card p-6 ${
        idea.saved ? "border-foreground" : "border-hairline"
      } ${idea.dismissed ? "opacity-70" : ""}`}
    >
      {idea.saved ? (
        <span
          aria-hidden="true"
          className="absolute -top-px right-6 h-7 w-5 bg-event [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)]"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold tracking-wide text-event">
          <span aria-hidden="true">{costTierSymbol(idea.costTier, plan.currency)}</span>
          <span className="sr-only">{costTierName(idea.costTier)}</span>
        </span>
        {fits ? (
          <span className="caps inline-flex items-center gap-1.5 border border-hairline px-2 py-1 text-success">
            <BadgeCheck aria-hidden="true" className="size-4" />
            Fits your budget
          </span>
        ) : null}
      </div>
      <h4 className="font-display text-[2rem] leading-[0.95]">{idea.title}</h4>
      <p className="text-muted-foreground">{idea.description}</p>
      <div className="mt-1 flex flex-wrap gap-2 print:hidden">
        {idea.dismissed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              update((p) => setIdeaDismissed(p, idea.id, false));
              announce(`Restored ${idea.title}.`);
            }}
          >
            <RotateCcw aria-hidden="true" />
            Restore <span className="sr-only">{idea.title}</span>
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={Boolean(idea.saved)}
              className="aria-pressed:border-border aria-pressed:bg-event aria-pressed:text-event-foreground"
              onClick={() => {
                update((p) => setIdeaSaved(p, idea.id, !idea.saved));
                announce(
                  idea.saved
                    ? `Removed ${idea.title} from saved.`
                    : `Saved ${idea.title}.`,
                );
              }}
            >
              {idea.saved ? (
                <BookmarkCheck aria-hidden="true" />
              ) : (
                <Bookmark aria-hidden="true" />
              )}
              Save <span className="sr-only">{idea.title}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                update((p) => setIdeaDismissed(p, idea.id, true));
                announce(`Dismissed ${idea.title}.`);
              }}
            >
              <X aria-hidden="true" />
              Dismiss <span className="sr-only">{idea.title}</span>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function CategorySection({
  category,
  plan,
  update,
  showDismissed,
}: {
  category: IdeaCategory;
  plan: Plan;
  update: PanelProps["update"];
  showDismissed: boolean;
}) {
  const announce = useAnnounce();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const label = IDEA_CATEGORY_LABELS[category];
  const ideas = plan.ideas.filter(
    (idea) => idea.category === category && (showDismissed || !idea.dismissed),
  );

  const more = async () => {
    setLoading(true);
    setNote(null);
    const result = await postJson<{ ideas: Idea[] }>("/api/ideas", { plan, category });
    setLoading(false);
    if (!result.ok) {
      setNote(result.message);
      announce(result.message, "assertive");
      return;
    }
    let added: Idea[] = [];
    update((p) => {
      const next = addIdeas(p, result.data.ideas);
      added = next.added;
      return next.plan;
    });
    const message =
      added.length === 0
        ? `No new ${label.toLowerCase()} ideas right now. Try again later or ask Refine with AI.`
        : `Added ${added.length} ${label.toLowerCase()} ${added.length === 1 ? "idea" : "ideas"}.`;
    setNote(added.length === 0 ? message : null);
    announce(message);
  };

  return (
    <section aria-labelledby={`ideas-${category}`} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-hairline pb-3">
        <h3 id={`ideas-${category}`} className="font-display text-[2.4rem] leading-none">
          {label}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void more()}
          disabled={loading}
          aria-describedby={note ? `ideas-${category}-note` : undefined}
          className="print:hidden"
        >
          {loading ? (
            <LoaderCircle aria-hidden="true" className="motion-ok:animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {loading ? "Finding ideas…" : "More like this"}{" "}
          <span className="sr-only">for {label}</span>
        </Button>
      </div>
      {note ? (
        <p id={`ideas-${category}-note`} className="text-muted-foreground">
          {note}
        </p>
      ) : null}
      {ideas.length === 0 ? (
        <p className="text-muted-foreground">No {label.toLowerCase()} ideas yet.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} plan={plan} update={update} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function IdeasPanel({ plan, update }: PanelProps) {
  const [showDismissed, setShowDismissed] = useState(false);
  const saved = plan.ideas.filter((i) => i.saved && !i.dismissed).length;
  const dismissed = plan.ideas.filter((i) => i.dismissed).length;

  return (
    <div className="grid grid-cols-1 gap-10">
      <PanelHeader
        title="Ideas"
        intro="Ideas picked for your style and budget. Save the ones you love; dismiss the rest."
      >
        {dismissed > 0 ? (
          <Button variant="ghost" onClick={() => setShowDismissed((v) => !v)}>
            {showDismissed ? "Hide dismissed" : `Show dismissed (${dismissed})`}
          </Button>
        ) : null}
      </PanelHeader>
      {saved > 0 ? (
        <StatusNote tone="muted" icon={<BookmarkCheck />}>
          {saved} saved {saved === 1 ? "idea" : "ideas"}. Saved ideas are included when
          you copy your summary.
        </StatusNote>
      ) : null}
      {IDEA_CATEGORIES.map((category) => (
        <CategorySection
          key={category}
          category={category}
          plan={plan}
          update={update}
          showDismissed={showDismissed}
        />
      ))}
    </div>
  );
}
