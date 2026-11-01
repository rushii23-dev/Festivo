import { cn } from "cn";

const BEAD_SPACING = 26;
const MIN_WIDTH = 60;
/** How far the thread dips at its middle, in viewBox units. */
const SAG = 10;
const THREAD_Y = 8;

/**
 * A marigold garland: one bead per item on a sagging thread, filled for the
 * ones that are done. Decorative; always pair it with the same fact in text.
 */
export function Garland({
  filled,
  total,
  className,
}: {
  filled: number;
  total: number;
  className?: string;
}) {
  const count = Math.max(total, 1);
  const width = Math.max(count * BEAD_SPACING, MIN_WIDTH);
  const threadAt = (x: number) => THREAD_Y + SAG * Math.sin((Math.PI * x) / width);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} 32`}
      className={cn("h-8 w-auto max-w-full overflow-visible", className)}
    >
      <path
        d={`M0 ${THREAD_Y} Q${width / 2} ${THREAD_Y + SAG * 2} ${width} ${THREAD_Y}`}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
      />
      {Array.from({ length: total }, (_, i) => {
        const cx = ((i + 0.5) * width) / count;
        const on = i < filled;
        return (
          <circle
            key={i}
            cx={cx}
            cy={threadAt(cx)}
            r={on ? 8 : 6.5}
            fill={on ? "var(--secondary)" : "var(--card)"}
            stroke="var(--border)"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
}
