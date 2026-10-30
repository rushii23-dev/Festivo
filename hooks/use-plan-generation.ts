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
const NETWORK_FAILURE: GenerationState = {
  status: "error",
  message: NETWORK_ERROR,
  retryable: true,
};

interface ProgressLike {
  type: "progress";
  step: string;
  message: string;
}

interface StreamEnd {
  type?: string;
  plan?: unknown;
  message?: string;
  retryable?: boolean;
}

function isProgress(value: unknown): value is ProgressLike {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "progress" &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

function requestPlan(input: EventInput, signal: AbortSignal) {
  return fetch("/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    signal,
  });
}

/** A refused request: the server's message, retryable when it was busy or failed. */
async function refusal(response: Response): Promise<GenerationState> {
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return {
    status: "error",
    message: body?.error?.message ?? NETWORK_ERROR,
    retryable: response.status === 429 || response.status >= 500,
  };
}

/** The state a final stream event leads to, or null for events that are not final. */
function endState(event: StreamEnd): GenerationState | null {
  if (event.type === "plan") {
    const plan = PlanSchema.safeParse(event.plan);
    return plan.success
      ? { status: "done", plan: plan.data }
      : {
          status: "error",
          message: "The plan came back incomplete. Please try again.",
          retryable: true,
        };
  }
  if (event.type === "error") {
    return {
      status: "error",
      message: event.message ?? NETWORK_ERROR,
      retryable: event.retryable ?? true,
    };
  }
  return null;
}

/** Reports progress as stages arrive and resolves with the stream's final state. */
async function followStream(
  body: ReadableStream<Uint8Array>,
  onProgress: (state: GenerationState) => void,
): Promise<GenerationState> {
  const reached: GenerationStage[] = [];
  for await (const event of readNdjson(body)) {
    if (isProgress(event)) {
      const stage = GENERATION_STAGES.find((s) => s === event.step);
      if (stage && !reached.includes(stage)) reached.push(stage);
      onProgress({ status: "generating", message: event.message, reached: [...reached] });
      continue;
    }
    const end = endState(event as StreamEnd);
    if (end) return end;
  }
  return NETWORK_FAILURE;
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
      setState({ status: "generating", message: "Reading your answers…", reached: [] });

      try {
        const response = await requestPlan(input, abort.signal);
        const end =
          response.ok && response.body
            ? await followStream(response.body, setState)
            : await refusal(response);
        setState(end);
        if (end.status === "done") onPlan(end.plan);
      } catch (error) {
        if (abort.signal.aborted) return;
        console.error(error);
        setState(NETWORK_FAILURE);
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
