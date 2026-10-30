"use client";

import { useCallback, useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { setTaskDone } from "@/lib/plan/edit";
import { prefersReducedMotionNow } from "@/lib/prefs/store";
import type { Plan, TimelineTask } from "@/lib/schemas/plan";
import type { UpdatePlan } from "./PlanDashboard";

/**
 * Ticks a task and says so. When motion is allowed, petals pop out of the box;
 * the announcement happens either way. Shared by the overview and the timeline.
 */
export function useTaskToggle(plan: Plan, update: UpdatePlan) {
  const announce = useAnnounce();
  const [cheering, setCheering] = useState<Record<string, number>>({});
  const toggle = useCallback(
    (task: TimelineTask, done: boolean) => {
      update((p) => setTaskDone(p, task.id, done));
      const left =
        plan.timeline.filter((t) => !t.done && t.id !== task.id).length + (done ? 0 : 1);
      if (done) {
        announce(
          left === 0
            ? `Done: ${task.title}. That was the last task. Everything is ready.`
            : `Done: ${task.title}. ${left} ${left === 1 ? "task" : "tasks"} to go.`,
        );
        if (!prefersReducedMotionNow()) {
          setCheering((c) => ({ ...c, [task.id]: (c[task.id] ?? 0) + 1 }));
        }
      } else {
        announce(`${task.title} marked as not done.`);
      }
    },
    [announce, plan.timeline, update],
  );
  return { toggle, cheering };
}
