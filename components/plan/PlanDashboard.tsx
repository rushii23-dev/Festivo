"use client";

import { useCallback, useEffect, useState } from "react";
import { ArchButton } from "@/components/landing/ArchButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHydratedStore } from "@/hooks/use-hydrated-store";
import {
  DASHBOARD_TABS,
  TAB_LABELS,
  tabFromHash,
  type DashboardTab,
} from "@/lib/plan/dashboard";
import type { Plan } from "@/lib/schemas/plan";
import { usePlanStore } from "@/lib/store/planStore";
import { todayIso } from "@/lib/timeline/dates";
import { userTimeZone } from "./client";
import { DeferredPanel, DeferredRefineSheet, DeferredShareMenu } from "./deferred";
import { OverviewPanel } from "./OverviewPanel";
import { PlanHero } from "./PlanHero";

export type UpdatePlan = (edit: (plan: Plan) => Plan) => void;

export interface PanelProps {
  plan: Plan;
  today: string;
  update: UpdatePlan;
}

/** Width and gutters shared by every part of the page below the hero. */
const shell = "mx-auto w-full max-w-[90rem] px-4 sm:px-8";

function DashboardSkeleton() {
  return (
    <div className="grid gap-10" aria-busy="true" aria-label="Loading your plan">
      <Skeleton className="h-[30rem] md:h-[34rem]" />
      <div className={`grid gap-8 ${shell}`}>
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function PlanNotFound() {
  return (
    <div className={`grid gap-6 py-16 ${shell}`}>
      <h1 className="font-display text-headline">We couldn’t find that plan.</h1>
      <p className="max-w-[60ch] text-muted-foreground">
        Plans are saved in the browser where you made them. Start a new one here.
      </p>
      <div>
        <ArchButton href="/plan/new">Start planning</ArchButton>
      </div>
    </div>
  );
}

/** The active tab, kept in the URL hash so reloads and shared links land on it. */
function useHashTab(): [DashboardTab, (tab: DashboardTab) => void] {
  const [tab, setTab] = useState<DashboardTab>(() => tabFromHash(window.location.hash));
  useEffect(() => {
    const sync = () => setTab(tabFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const select = useCallback((next: DashboardTab) => {
    setTab(next);
    window.history.replaceState(window.history.state, "", `#${next}`);
  }, []);
  return [tab, select];
}

function Dashboard({ plan }: { plan: Plan }) {
  const updatePlan = usePlanStore((s) => s.updatePlan);
  const [today] = useState(() => todayIso(new Date(), userTimeZone()));
  const [tab, setTab] = useHashTab();
  const update = useCallback<UpdatePlan>(
    (edit) => updatePlan(plan.id, edit),
    [updatePlan, plan.id],
  );
  const props: PanelProps = { plan, today, update };

  return (
    <div data-event={plan.eventType} className="grid grid-cols-1 gap-10 pb-24">
      <PlanHero
        plan={plan}
        today={today}
        actions={
          <>
            <DeferredRefineSheet plan={plan} />
            <DeferredShareMenu plan={plan} today={today} />
          </>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as DashboardTab)}
        className={`grid grid-cols-1 gap-10 ${shell}`}
      >
        <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 print:hidden">
          <TabsList aria-label="Plan sections">
            {DASHBOARD_TABS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewPanel {...props} onNavigate={setTab} />
        </TabsContent>
        <TabsContent value="budget">
          <DeferredPanel name="budget" {...props} />
        </TabsContent>
        <TabsContent value="timeline">
          <DeferredPanel name="timeline" {...props} />
        </TabsContent>
        <TabsContent value="vendors">
          <DeferredPanel name="vendors" {...props} />
        </TabsContent>
        <TabsContent value="ideas">
          <DeferredPanel name="ideas" {...props} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** The plan dashboard at /plan/[id]. Plans live in this browser's storage. */
export function PlanDashboard({ id }: { id: string }) {
  const hydrated = useHydratedStore();
  const plan = usePlanStore((s) => s.plans[id]);

  if (!hydrated) return <DashboardSkeleton />;
  if (!plan) return <PlanNotFound />;
  return <Dashboard plan={plan} />;
}
