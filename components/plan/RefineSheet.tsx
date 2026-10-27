"use client";

import {
  Check,
  LoaderCircle,
  Minus,
  Plus,
  Sparkles,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { ErrorText, controlClass, describedBy } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { describeChange, type PlanChange } from "@/lib/plan/diff";
import { PlanSchema, type Plan } from "@/lib/schemas/plan";
import { usePlanStore } from "@/lib/store/planStore";
import { postJson, userTimeZone } from "./client";

interface RefineResponse {
  explanation: string;
  plan: Plan;
  changes: PlanChange[];
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preview"; explanation: string; plan: Plan; changes: PlanChange[] }
  | { status: "error"; message: string };

const SUGGESTIONS = [
  "Cut the budget by 15%",
  "Make it eco-friendly",
  "Make it cheaper",
  "Move the date to March",
];

const CHANGE_ICON = {
  added: <Plus aria-hidden="true" className="size-4" />,
  removed: <Minus aria-hidden="true" className="size-4" />,
  changed: <Check aria-hidden="true" className="size-4" />,
};

function ChangeList({ changes }: { changes: PlanChange[] }) {
  return (
    <ul className="grid gap-2">
      {changes.map((change, index) => (
        <li
          key={`${change.field}-${index}`}
          className="flex items-start gap-3 border-t border-hairline py-3"
        >
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-border">
            {CHANGE_ICON[change.kind]}
          </span>
          <span className="min-w-0 break-words">{describeChange(change)}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Refine with AI": ask for a change, preview what would change, then accept or reject. */
export function RefineSheet({ plan }: { plan: Plan }) {
  const announce = useAnnounce();
  const savePlan = usePlanStore((s) => s.savePlan);
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const abort = useRef<AbortController | null>(null);
  const inputId = "refine-instruction";

  const reset = () => {
    abort.current?.abort();
    setState({ status: "idle" });
    setInputError(null);
  };

  const submit = async () => {
    const text = instruction.trim();
    if (!text) {
      setInputError("Tell Festivo what to change, for example “make it cheaper”.");
      document.getElementById(inputId)?.focus();
      return;
    }
    setInputError(null);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ status: "loading" });
    announce("Festivo is working on your changes.");

    let result;
    try {
      result = await postJson<RefineResponse>(
        "/api/refine",
        { plan, instruction: text, timeZone: userTimeZone() },
        controller.signal,
      );
    } catch {
      return; // aborted: the sheet was closed or a new request started
    }
    const parsed = result.ok ? PlanSchema.safeParse(result.data.plan) : null;
    if (!result.ok || !parsed?.success || parsed.data.id !== plan.id) {
      const message = result.ok
        ? "The suggestion came back incomplete. Please try again."
        : result.message;
      setState({ status: "error", message });
      announce(message, "assertive");
      return;
    }
    const { explanation, changes } = result.data;
    setState({ status: "preview", explanation, plan: parsed.data, changes });
    announce(
      changes.length === 0
        ? `${explanation} Nothing in the plan would change.`
        : `${explanation} ${changes.length} ${changes.length === 1 ? "change" : "changes"} to review.`,
    );
    requestAnimationFrame(() => document.getElementById("refine-result")?.focus());
  };

  const accept = () => {
    if (state.status !== "preview") return;
    savePlan(state.plan);
    announce("Changes applied to your plan.");
    setInstruction("");
    setState({ status: "idle" });
    setOpen(false);
  };

  const reject = () => {
    announce("Changes discarded. Your plan is unchanged.");
    setState({ status: "idle" });
    requestAnimationFrame(() => document.getElementById(inputId)?.focus());
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <SheetTrigger asChild>
        <Button variant="photo">
          <WandSparkles aria-hidden="true" />
          Refine with AI
        </Button>
      </SheetTrigger>
      <SheetContent data-event={plan.eventType} aria-describedby="refine-description">
        <div className="grid gap-6 p-6 pt-8 sm:p-8">
          <div className="grid gap-2 pr-12">
            <SheetTitle>Refine with AI</SheetTitle>
            <SheetDescription id="refine-description">
              Say what you would like to change. You will see every change before anything
              is saved.
            </SheetDescription>
          </div>

          <form
            noValidate
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="grid gap-2">
              <label htmlFor={inputId} className="font-bold">
                What should change?
              </label>
              <textarea
                id={inputId}
                rows={3}
                maxLength={300}
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                aria-invalid={Boolean(inputError) || undefined}
                aria-describedby={describedBy(inputId, { error: inputError })}
                className={controlClass}
              />
              {inputError ? (
                <ErrorText id={`${inputId}-error`}>{inputError}</ErrorText>
              ) : null}
            </div>
            <div className="grid gap-2">
              <p
                id="refine-suggestions"
                className="text-sm font-bold text-muted-foreground"
              >
                Try one of these
              </p>
              <ul aria-labelledby="refine-suggestions" className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((text) => (
                  <li key={text}>
                    <button
                      type="button"
                      onClick={() => {
                        setInstruction(text);
                        document.getElementById(inputId)?.focus();
                      }}
                      className="caps min-h-11 rounded-sm border border-input px-4 hover:border-foreground"
                    >
                      {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Button
                type="submit"
                variant="secondary"
                disabled={state.status === "loading"}
              >
                {state.status === "loading" ? (
                  <LoaderCircle aria-hidden="true" className="motion-ok:animate-spin" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                {state.status === "loading" ? "Working on it…" : "Suggest changes"}
              </Button>
            </div>
          </form>

          {state.status === "error" ? (
            <ErrorText id="refine-error">{state.message}</ErrorText>
          ) : null}

          {state.status === "preview" ? (
            <section
              id="refine-result"
              tabIndex={-1}
              aria-labelledby="refine-result-title"
              className="grid gap-4 border border-hairline bg-card p-5 outline-none"
            >
              <h3
                id="refine-result-title"
                className="font-display text-[2rem] leading-none"
              >
                Suggested changes
              </h3>
              <p>{state.explanation}</p>
              {state.changes.length === 0 ? (
                <p className="text-muted-foreground">Nothing in the plan would change.</p>
              ) : (
                <ChangeList changes={state.changes} />
              )}
              <div className="flex flex-wrap gap-3">
                <Button onClick={accept} disabled={state.changes.length === 0}>
                  <Check aria-hidden="true" />
                  Apply changes
                </Button>
                <Button variant="outline" onClick={reject}>
                  <Undo2 aria-hidden="true" />
                  Discard
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
