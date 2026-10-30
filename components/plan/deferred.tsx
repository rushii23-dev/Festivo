"use client";

/**
 * The parts of the dashboard that are not on screen when it opens: the four tabs
 * behind Overview, the Refine sheet and the share menu. Each is its own chunk.
 * They start loading as soon as the dashboard mounts, so they are ready long before
 * anyone reaches them, but they no longer hold up the page's first load.
 *
 * While a chunk loads, its place holds a stand-in marked `data-deferred` (tests
 * wait for these to go). A click on a stand-in trigger is remembered, and the real
 * control opens as soon as it arrives.
 */
import { Suspense, lazy, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Plan } from "@/lib/schemas/plan";
import type { PanelProps } from "./PlanDashboard";
import { RefineButton, ShareButton } from "./triggers";

const BudgetPanel = lazy(() =>
  import("./BudgetPanel").then((module) => ({ default: module.BudgetPanel })),
);
const TimelinePanel = lazy(() =>
  import("./TimelinePanel").then((module) => ({ default: module.TimelinePanel })),
);
const VendorsPanel = lazy(() =>
  import("./VendorsPanel").then((module) => ({ default: module.VendorsPanel })),
);
const IdeasPanel = lazy(() =>
  import("./IdeasPanel").then((module) => ({ default: module.IdeasPanel })),
);
const RefineSheet = lazy(() =>
  import("./RefineSheet").then((module) => ({ default: module.RefineSheet })),
);
const ShareMenu = lazy(() =>
  import("./ShareMenu").then((module) => ({ default: module.ShareMenu })),
);

const PANELS = {
  budget: BudgetPanel,
  timeline: TimelinePanel,
  vendors: VendorsPanel,
  ideas: IdeasPanel,
} as const;

/** One of the tabs behind Overview, with a quiet placeholder until it arrives. */
export function DeferredPanel({
  name,
  ...props
}: PanelProps & { name: keyof typeof PANELS }) {
  const Panel = PANELS[name];
  return (
    <Suspense
      fallback={
        <div data-deferred aria-busy="true" className="grid gap-6">
          <Skeleton className="h-16 max-w-xl" />
          <Skeleton className="h-80" />
        </div>
      }
    >
      <Panel {...props} />
    </Suspense>
  );
}

export function DeferredRefineSheet({ plan }: { plan: Plan }) {
  const [openOnLoad, setOpenOnLoad] = useState(false);
  return (
    <Suspense
      fallback={<RefineButton data-deferred onClick={() => setOpenOnLoad(true)} />}
    >
      <RefineSheet plan={plan} defaultOpen={openOnLoad} />
    </Suspense>
  );
}

export function DeferredShareMenu({ plan, today }: { plan: Plan; today: string }) {
  const [openOnLoad, setOpenOnLoad] = useState(false);
  return (
    <Suspense
      fallback={<ShareButton data-deferred onClick={() => setOpenOnLoad(true)} />}
    >
      <ShareMenu plan={plan} today={today} defaultOpen={openOnLoad} />
    </Suspense>
  );
}
