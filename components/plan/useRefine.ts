"use client";

import { useRef, useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import type { PlanChange } from "@/lib/plan/diff";
import { PlanSchema, type Plan } from "@/lib/schemas/plan";
import { usePlanStore } from "@/lib/store/planStore";
import { postJson, userTimeZone, type ApiResult } from "./client";

export const REFINE_INPUT_ID = "refine-instruction";
export const REFINE_RESULT_ID = "refine-result";

interface RefineResponse {
  explanation: string;
  plan: Plan;
  changes: PlanChange[];
}

type Preview = {
  status: "preview";
  explanation: string;
  plan: Plan;
  changes: PlanChange[];
};

export type RefineState =
  | { status: "idle" }
  | { status: "loading" }
  | Preview
  | { status: "error"; message: string };

const focusLater = (id: string) =>
  requestAnimationFrame(() => document.getElementById(id)?.focus());

/** The suggestion to preview, or an error when the reply is unusable or for another plan. */
function readReply(
  result: ApiResult<RefineResponse>,
  planId: string,
): Preview | { status: "error"; message: string } {
  if (!result.ok) return { status: "error", message: result.message };
  const parsed = PlanSchema.safeParse(result.data.plan);
  if (!parsed.success || parsed.data.id !== planId) {
    return {
      status: "error",
      message: "The suggestion came back incomplete. Please try again.",
    };
  }
  const { explanation, changes } = result.data;
  return { status: "preview", explanation, plan: parsed.data, changes };
}

function previewMessage({ explanation, changes }: Preview) {
  if (changes.length === 0) return `${explanation} Nothing in the plan would change.`;
  const count = `${changes.length} ${changes.length === 1 ? "change" : "changes"}`;
  return `${explanation} ${count} to review.`;
}

/**
 * Asks the server for a suggested change, previews it, and applies it only when
 * the planner accepts. A new request or closing the sheet cancels the last one.
 */
export function useRefine(plan: Plan, close: () => void) {
  const announce = useAnnounce();
  const savePlan = usePlanStore((s) => s.savePlan);
  const [instruction, setInstruction] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [state, setState] = useState<RefineState>({ status: "idle" });
  const abort = useRef<AbortController | null>(null);

  const submit = async () => {
    const text = instruction.trim();
    if (!text) {
      setInputError("Tell Festivo what to change, for example “make it cheaper”.");
      document.getElementById(REFINE_INPUT_ID)?.focus();
      return;
    }
    setInputError(null);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ status: "loading" });
    announce("Festivo is working on your changes.");

    let result: ApiResult<RefineResponse>;
    try {
      result = await postJson<RefineResponse>(
        "/api/refine",
        { plan, instruction: text, timeZone: userTimeZone() },
        controller.signal,
      );
    } catch {
      return; // aborted: the sheet was closed or a new request started
    }
    const next = readReply(result, plan.id);
    setState(next);
    if (next.status === "error") {
      announce(next.message, "assertive");
      return;
    }
    announce(previewMessage(next));
    focusLater(REFINE_RESULT_ID);
  };

  return {
    instruction,
    inputError,
    state,
    submit,
    /** Fills in a suggestion and returns focus to the text box. */
    suggest: (text: string) => {
      setInstruction(text);
      document.getElementById(REFINE_INPUT_ID)?.focus();
    },
    setInstruction,
    accept: () => {
      if (state.status !== "preview") return;
      savePlan(state.plan);
      announce("Changes applied to your plan.");
      setInstruction("");
      setState({ status: "idle" });
      close();
    },
    reject: () => {
      announce("Changes discarded. Your plan is unchanged.");
      setState({ status: "idle" });
      focusLater(REFINE_INPUT_ID);
    },
    reset: () => {
      abort.current?.abort();
      setState({ status: "idle" });
      setInputError(null);
    },
  };
}
