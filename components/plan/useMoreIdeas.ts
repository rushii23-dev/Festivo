"use client";

import { useEffect, useRef, useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { postJson } from "@/lib/http/client";
import { IDEA_CATEGORY_LABELS } from "@/lib/plan/dashboard";
import { addIdeas } from "@/lib/plan/edit";
import type { Idea, IdeaCategory, Plan } from "@/lib/schemas/plan";
import { countOf } from "@/lib/text/count";
import type { UpdatePlan } from "./PlanDashboard";

/**
 * "More like this" for one idea category: asks the server for fresh ideas,
 * adds the new ones to the latest plan and announces the result. Leaving the
 * panel cancels a request still in flight.
 */
export function useMoreIdeas(plan: Plan, category: IdeaCategory, update: UpdatePlan) {
  const announce = useAnnounce();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const label = IDEA_CATEGORY_LABELS[category].toLowerCase();

  const more = async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setNote(null);
    let result;
    try {
      result = await postJson<{ ideas: Idea[] }>(
        "/api/ideas",
        { plan, category },
        controller.signal,
      );
    } catch {
      return; // cancelled: the panel closed
    }
    setLoading(false);
    if (!result.ok) {
      setNote(result.message);
      announce(result.message, "assertive");
      return;
    }
    // Added against the plan as it is now, which may have changed while waiting.
    // The plan store applies edits synchronously, so `added` is known right after.
    let added: Idea[] = [];
    update((latest) => {
      const next = addIdeas(latest, result.data.ideas);
      added = next.added;
      return next.plan;
    });
    if (added.length === 0) {
      const message = `No new ${label} ideas right now. Try again later or ask Refine with AI.`;
      setNote(message);
      announce(message);
      return;
    }
    announce(`Added ${countOf(added.length, `${label} idea`)}.`);
  };

  return { loading, note, more };
}
