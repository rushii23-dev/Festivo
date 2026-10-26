import { Check } from "lucide-react";
import { STEPS } from "@/lib/wizard/draft";

/** Step indicator. Earlier steps are buttons so people can jump back. */
export function WizardProgress({
  current,
  onJump,
}: {
  current: number;
  onJump: (step: number) => void;
}) {
  const percent = Math.round(((current + 1) / STEPS.length) * 100);
  return (
    <nav aria-label="Wizard steps" className="grid gap-3">
      <p className="font-bold">
        Step {current + 1} of {STEPS.length}
      </p>
      <div
        aria-hidden="true"
        className="h-3 overflow-hidden rounded-pill border-2 border-border bg-card"
      >
        <div
          className="h-full rounded-pill bg-event motion-ok:transition-[width] motion-ok:duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="hidden flex-wrap gap-2 sm:flex">
        {STEPS.map((step, index) => {
          const done = index < current;
          const isCurrent = index === current;
          const content = (
            <>
              <span
                aria-hidden="true"
                className="flex size-6 items-center justify-center rounded-full border-2 border-current text-xs font-bold"
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              {step.label}
              {done ? <span className="sr-only">, completed</span> : null}
            </>
          );
          return (
            <li key={step.id}>
              {done ? (
                <button
                  type="button"
                  onClick={() => onJump(index)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-pill px-3 font-medium underline-offset-4 hover:underline"
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-pill px-3 ${
                    isCurrent
                      ? "bg-foreground font-bold text-background"
                      : "text-muted-foreground"
                  }`}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
