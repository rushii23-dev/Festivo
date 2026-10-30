"use client";

import { Check, LoaderCircle, Minus, Plus, Sparkles, Undo2 } from "lucide-react";
import { useState } from "react";
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
import type { Plan } from "@/lib/schemas/plan";
import { RefineButton } from "./triggers";
import { REFINE_INPUT_ID, REFINE_RESULT_ID, useRefine } from "./useRefine";

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

type Refine = ReturnType<typeof useRefine>;

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

/** The request box, ready-made suggestions and the submit button. */
function RefineForm({ refine }: { refine: Refine }) {
  const loading = refine.state.status === "loading";
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void refine.submit();
      }}
    >
      <div className="grid gap-2">
        <label htmlFor={REFINE_INPUT_ID} className="font-bold">
          What should change?
        </label>
        <textarea
          id={REFINE_INPUT_ID}
          rows={3}
          maxLength={300}
          value={refine.instruction}
          onChange={(event) => refine.setInstruction(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void refine.submit();
            }
          }}
          aria-invalid={Boolean(refine.inputError) || undefined}
          aria-describedby={describedBy(REFINE_INPUT_ID, { error: refine.inputError })}
          className={controlClass}
        />
        {refine.inputError ? (
          <ErrorText id={`${REFINE_INPUT_ID}-error`}>{refine.inputError}</ErrorText>
        ) : null}
      </div>
      <div className="grid gap-2">
        <p id="refine-suggestions" className="text-sm font-bold text-muted-foreground">
          Try one of these
        </p>
        <ul aria-labelledby="refine-suggestions" className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((text) => (
            <li key={text}>
              <button
                type="button"
                onClick={() => refine.suggest(text)}
                className="caps min-h-11 rounded-sm border border-input px-4 hover:border-foreground"
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Button type="submit" variant="secondary" disabled={loading}>
          {loading ? (
            <LoaderCircle aria-hidden="true" className="motion-ok:animate-spin" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {loading ? "Working on it…" : "Suggest changes"}
        </Button>
      </div>
    </form>
  );
}

/** What would change, with Apply and Discard. Takes focus when it appears. */
function RefinePreview({ refine }: { refine: Refine }) {
  if (refine.state.status !== "preview") return null;
  const { explanation, changes } = refine.state;
  return (
    <section
      id={REFINE_RESULT_ID}
      tabIndex={-1}
      aria-labelledby="refine-result-title"
      className="grid gap-4 border border-hairline bg-card p-5 outline-none"
    >
      <h3 id="refine-result-title" className="font-display text-[2rem] leading-none">
        Suggested changes
      </h3>
      <p>{explanation}</p>
      {changes.length === 0 ? (
        <p className="text-muted-foreground">Nothing in the plan would change.</p>
      ) : (
        <ChangeList changes={changes} />
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={refine.accept} disabled={changes.length === 0}>
          <Check aria-hidden="true" />
          Apply changes
        </Button>
        <Button variant="outline" onClick={refine.reject}>
          <Undo2 aria-hidden="true" />
          Discard
        </Button>
      </div>
    </section>
  );
}

/** "Refine with AI": ask for a change, preview what would change, then accept or reject. */
export function RefineSheet({
  plan,
  defaultOpen = false,
}: {
  plan: Plan;
  /** Opens on mount, when the sheet was asked for while its code was loading. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const refine = useRefine(plan, () => setOpen(false));

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) refine.reset();
      }}
    >
      <SheetTrigger asChild>
        <RefineButton />
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
          <RefineForm refine={refine} />
          {refine.state.status === "error" ? (
            <ErrorText id="refine-error">{refine.state.message}</ErrorText>
          ) : null}
          <RefinePreview refine={refine} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
