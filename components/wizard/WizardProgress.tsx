import { STEPS } from "@/lib/wizard/draft";

/**
 * Six hairline segments, one per step: filled in gold once answered, in ink
 * for the current step. Answered steps are buttons so people can jump back;
 * the step count and name sit beside the question.
 */
export function WizardProgress({
  current,
  onJump,
}: {
  current: number;
  onJump: (step: number) => void;
}) {
  return (
    <nav aria-label="Wizard steps">
      <ol className="grid grid-cols-6 gap-2">
        {STEPS.map((step, index) => {
          const done = index < current;
          const isCurrent = index === current;
          const bar = (
            <span
              aria-hidden="true"
              className={`block h-[3px] w-full motion-ok:transition-colors motion-ok:duration-500 ${
                done ? "bg-gold" : isCurrent ? "bg-foreground" : "bg-hairline"
              }`}
            />
          );
          const label = (
            <span
              aria-hidden="true"
              className="caps mt-3 hidden text-[0.6875rem] text-muted-foreground md:block"
            >
              {step.label}
            </span>
          );
          return (
            <li key={step.id} className="min-w-0">
              {done ? (
                <button
                  type="button"
                  onClick={() => onJump(index)}
                  className="group grid min-h-11 w-full content-start pt-4 text-left hover:[&>span:first-child]:bg-foreground"
                >
                  {bar}
                  {label}
                  <span className="sr-only">
                    {`Step ${index + 1}, ${step.label}, completed`}
                  </span>
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className="grid min-h-11 content-start pt-4"
                >
                  {bar}
                  {label}
                  <span className="sr-only">{`Step ${index + 1}, ${step.label}`}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
