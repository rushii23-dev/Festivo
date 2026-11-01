import { Check } from "lucide-react";
import type { CSSProperties } from "react";

/** Large, tactile checkbox: the tick mark (not color alone) shows it is done. */
export function TaskCheck({
  id,
  checked,
  onChange,
  cheer,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Bumped when the task is ticked, to play the petal burst once. */
  cheer?: number | undefined;
}) {
  return (
    <span className="relative mt-0.5 inline-flex size-6 shrink-0">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer size-6 cursor-pointer appearance-none rounded-sm border border-foreground bg-transparent checked:bg-foreground"
      />
      <Check
        aria-hidden="true"
        strokeWidth={3.5}
        className="pointer-events-none absolute inset-1 hidden size-4 text-background peer-checked:block"
      />
      {cheer ? <PetalBurst key={cheer} /> : null}
    </span>
  );
}

/** Six petals, evenly spaced around the box. */
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];

/** Marigold and rose petals that pop out of a ticked box. Motion-safe only. */
function PetalBurst() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden motion-ok:block"
    >
      {PETAL_ANGLES.map((angle, i) => (
        <span
          key={angle}
          className="petal absolute top-1/2 left-1/2 size-2 rounded-full"
          style={
            {
              "--angle": `${angle}deg`,
              background: i % 2 ? "var(--accent)" : "var(--secondary)",
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
