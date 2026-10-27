import { BUDGET_CATEGORY_LABELS } from "@/lib/budget/categories";
import { formatMoneyCompact } from "@/lib/budget/format";
import type { Currency } from "@/lib/schemas/common";
import type { BudgetItem } from "@/lib/schemas/plan";

export const CHART_COLORS = 8;
export const chartColor = (index: number) => `var(--chart-${(index % CHART_COLORS) + 1})`;

const SIZE = 220;
const C = SIZE / 2;
const OUTER = 104;
const INNER = 64;

function point(radius: number, angle: number): string {
  return `${(C + radius * Math.sin(angle)).toFixed(2)} ${(C - radius * Math.cos(angle)).toFixed(2)}`;
}

/** Ring segment from angle a to b (radians, clockwise from 12 o'clock). */
function segmentPath(a: number, b: number): string {
  const large = b - a > Math.PI ? 1 : 0;
  return [
    `M${point(OUTER, a)}`,
    `A${OUTER} ${OUTER} 0 ${large} 1 ${point(OUTER, b)}`,
    `L${point(INNER, b)}`,
    `A${INNER} ${INNER} 0 ${large} 0 ${point(INNER, a)}`,
    "Z",
  ].join(" ");
}

interface Segment {
  item: BudgetItem;
  index: number;
  start: number;
  end: number;
  share: number;
}

function layoutSegments(items: readonly BudgetItem[], total: number): Segment[] {
  const segments: Segment[] = [];
  let angle = 0;
  items.forEach((item, index) => {
    const share = total > 0 ? item.allocated / total : 0;
    const start = angle;
    angle += share * Math.PI * 2;
    segments.push({ item, index, start, end: angle, share });
  });
  return segments;
}

/**
 * Planned budget split as a donut. Hand-drawn SVG instead of a chart library:
 * one small component, no extra JavaScript to download. Every segment has an
 * ink outline, so neighbours stay distinct without relying on hue. The table
 * next to it carries the same numbers for screen readers, so this is hidden
 * from assistive technology.
 */
export function BudgetDonut({
  items,
  currency,
}: {
  items: readonly BudgetItem[];
  currency: Currency;
}) {
  const total = items.reduce((sum, item) => sum + item.allocated, 0);
  const segments = layoutSegments(items, total);
  const whole = segments.find((s) => s.share > 0.9999);

  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-72">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible">
        {total === 0 ? (
          <circle
            cx={C}
            cy={C}
            r={(OUTER + INNER) / 2}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={OUTER - INNER}
          />
        ) : whole ? (
          <path
            d={`M${C} ${C - OUTER}a${OUTER} ${OUTER} 0 1 1 0 ${OUTER * 2}a${OUTER} ${OUTER} 0 1 1 0 ${-OUTER * 2}zM${C} ${C - INNER}a${INNER} ${INNER} 0 1 0 0 ${INNER * 2}a${INNER} ${INNER} 0 1 0 0 ${-INNER * 2}z`}
            fill={chartColor(whole.index)}
            fillRule="evenodd"
            stroke="var(--border)"
            strokeWidth="1.25"
          />
        ) : (
          segments
            .filter((s) => s.share > 0)
            .map((s) => (
              <path
                key={s.item.category}
                d={segmentPath(s.start, s.end)}
                fill={chartColor(s.index)}
                stroke="var(--border)"
                strokeWidth="1.25"
                strokeLinejoin="round"
              >
                <title>{BUDGET_CATEGORY_LABELS[s.item.category]}</title>
              </path>
            ))
        )}
        <circle
          cx={C}
          cy={C}
          r={INNER - 9}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.5"
          strokeDasharray="2 5"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="figure text-4xl leading-none">
          {formatMoneyCompact(total, currency)}
        </span>
        <span className="caps mt-1 text-muted-foreground">Planned</span>
      </div>
    </div>
  );
}
