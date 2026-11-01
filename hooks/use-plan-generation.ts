"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  NETWORK_ERROR,
  errorMessage,
  readJson,
  sendJson,
  userTimeZone,
} from "@/lib/http/client";
import {
  ERROR_MESSAGES,
  PROGRESS_MESSAGES,
  PlanEventSchema,
  isPlanSection,
  type PlanSection,
} from "@/lib/plan/events";
import { readNdjson } from "@/lib/plan/ndjson";
import type { EventInput } from "@/lib/schemas/eventInput";
import type { Plan } from "@/lib/schemas/plan";

export type GenerationState =
  | { status: "idle" }
  | { status: "generating"; message: string; reached: PlanSection[] }
  | { status: "error"; message: string; retryable: boolean }
  | { status: "done"; plan: Plan };

const NETWORK_FAILURE: GenerationState = {
  status: "error",
  message: NETWORK_ERROR,
  retryable: true,
};

/** A line that breaks the stream contract, such as a plan that fails validation. */
const INCOMPLETE: GenerationState = {
  status: "error",
  message: ERROR_MESSAGES["invalid-output"],
  retryable: true,
};

/** A refused request: the server's message, retryable when it was busy or failed. */
async function refusal(response: Response): Promise<GenerationState> {
  return {
    status: "error",
    message: errorMessage(await readJson(response)),
    retryable: response.status === 429 || response.status >= 500,
  };
}

/**
 * Reports progress as sections arrive and resolves with the stream's final
 * state. Every line is checked against the shared event schema, so the plan
 * is validated again here before it is saved.
 */
async function followStream(
  body: ReadableStream<Uint8Array>,
  onProgress: (state: GenerationState) => void,
): Promise<GenerationState> {
  const reached: PlanSection[] = [];
  for await (const line of readNdjson(body)) {
    const parsed = PlanEventSchema.safeParse(line);
    if (!parsed.success) return INCOMPLETE;
    const event = parsed.data;
    switch (event.type) {
      case "progress":
        if (isPlanSection(event.step) && !reached.includes(event.step)) {
          reached.push(event.step);
        }
        onProgress({
          status: "generating",
          message: event.message,
          reached: [...reached],
        });
        break;
      case "plan":
        return { status: "done", plan: event.plan };
      case "error":
        return { status: "error", message: event.message, retryable: event.retryable };
    }
  }
  return NETWORK_FAILURE;
}

/**
 * Starts a streamed generation via POST /api/plan and tracks its progress.
 * A new start, cancel or unmount aborts the request in flight.
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
      setState({ status: "generating", message: PROGRESS_MESSAGES.start, reached: [] });

      try {
        const response = await sendJson(
          "/api/plan",
          { input, timeZone: userTimeZone() },
          abort.signal,
        );
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
