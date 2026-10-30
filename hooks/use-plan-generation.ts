"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readNdjson } from "@/lib/plan/ndjson";
import { PlanSchema, type Plan } from "@/lib/schemas/plan";
import type { EventInput } from "@/lib/schemas/eventInput";

/** The stages shown while a plan is generated, in order. */
export const GENERATION_STAGES = [
  "budget",
  "timeline",
  "vendors",
  "ideas",
  "summary",
] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

export const STAGE_LABELS: Record<GenerationStage, string> = {
  budget: "Budget",
  timeline: "Timeline",
  vendors: "Vendors",
  ideas: "Ideas",
  summary: "Summary",
};

export type GenerationState =
  | { status: "idle" }
  | { status: "generating"; message: string; reached: GenerationStage[] }
  | { status: "error"; message: string; retryable: boolean }
  | { status: "done"; plan: Plan };

const NETWORK_ERROR = "We couldn't reach Festivo. Check your connection and try again.";

interface ProgressLike {
  type: "progress";
  step: string;
  message: string;
}

function isProgress(value: unknown): value is ProgressLike {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "progress" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

/**
 * Starts a streamed generation via POST /api/plan and tracks its progress.
 * The final plan is validated again on the client before it is handed back.
 */
export function usePlanGeneration(onPlan: (plan: Plan) => void) {
  const [state, setState] = useState<GenerationState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(
    async (input: EventInput) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const reached: GenerationStage[] = [];
      setState({ status: "generating", message: "Reading your answers…", reached: [] });

      try {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            input,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
          signal: abort.signal,
        });

        if (!response.ok || !response.body) {
          const body = (await response.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          setState({
            status: "error",
            message: body?.error?.message ?? NETWORK_ERROR,
            retryable: response.status === 429 || response.status >= 500,
          });
          return;
        }

        for await (const event of readNdjson(response.body)) {
          if (isProgress(event)) {
            const stage = GENERATION_STAGES.find((s) => s === event.step);
            if (stage && !reached.includes(stage)) reached.push(stage);
            setState({
              status: "generating",
              message: event.message,
              reached: [...reached],
            });
            continue;
          }
          const typed = event as {
            type?: string;
            plan?: unknown;
            message?: string;
            retryable?: boolean;
          };
          if (typed.type === "plan") {
            const plan = PlanSchema.safeParse(typed.plan);
            if (!plan.success) {
              setState({
                status: "error",
                message: "The plan came back incomplete. Please try again.",
                retryable: true,
              });
              return;
            }
            setState({ status: "done", plan: plan.data });
            onPlan(plan.data);
            return;
          }
          if (typed.type === "error") {
            setState({
              status: "error",
              message: typed.message ?? NETWORK_ERROR,
              retryable: typed.retryable ?? true,
            });
            return;
          }
        }
        setState({ status: "error", message: NETWORK_ERROR, retryable: true });
      } catch (error) {
        if (abort.signal.aborted) return;
        console.error(error);
        setState({ status: "error", message: NETWORK_ERROR, retryable: true });
      }
    },
    [onPlan],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, start, cancel };
}
