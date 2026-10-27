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
    <nav aria-label="Wizard steps" className="grid gap-4">
      <p className="caps text-muted-foreground">
        Step {current + 1} of {STEPS.length}
      </p>
      <div aria-hidden="true" className="h-[3px] overflow-hidden bg-hairline">
        <div
          className="h-full bg-secondary motion-ok:transition-[width] motion-ok:duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="hidden flex-wrap gap-x-6 gap-y-1 sm:flex">
        {STEPS.map((step, index) => {
          const done = index < current;
          const isCurrent = index === current;
          const content = (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
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
                  className="caps inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={`caps inline-flex min-h-11 items-center gap-2 border-b-2 ${
                    isCurrent
                      ? "border-secondary text-foreground"
                      : "border-transparent text-muted-foreground"
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
