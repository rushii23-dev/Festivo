"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydratedStore } from "@/hooks/use-hydrated-store";
import { formatMoney } from "@/lib/budget/format";
import { usePlanStore } from "@/lib/store/planStore";
import { formatLongDate } from "@/lib/timeline/dates";

/** Interim plan view until the Phase 5 dashboard: proves the plan was saved. */
export function PlanPreview({ id }: { id: string }) {
  const hydrated = useHydratedStore();
  const plan = usePlanStore((s) => s.plans[id]);

  if (!hydrated) {
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Loading your plan">
        <Skeleton className="h-14 w-2/3" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="grid gap-6">
        <h1 className="font-display text-title">We couldn’t find that plan.</h1>
        <p className="max-w-[60ch] text-muted-foreground">
          Plans are saved in the browser where you made them. Start a new one here.
        </p>
        <div>
          <Button asChild>
            <Link href="/plan/new">Start planning</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-event={plan.eventType} className="grid gap-6">
      <h1 className="font-display text-title">{plan.title}</h1>
      <p className="text-lg">
        {formatLongDate(plan.date)} in {plan.location}, {plan.guestCount} guests,{" "}
        {formatMoney(plan.totalBudget, plan.currency)}
      </p>
      <p className="max-w-[65ch]">{plan.summary}</p>
      <p className="text-muted-foreground">
        {plan.timeline.length} tasks, {plan.vendors.length} vendors and{" "}
        {plan.ideas.length} ideas are ready. The full dashboard is next.
      </p>
    </div>
  );
}
