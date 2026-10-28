import { cn } from "cn";

/** A scalloped ring of `lobes` petals around (32, 32), like a marigold rosette. */
function rosette(lobes: number, outer: number, inner: number): string {
  const at = (radius: number, angle: number) =>
    `${(32 + Math.cos(angle) * radius).toFixed(2)} ${(32 + Math.sin(angle) * radius).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < lobes; i++) {
    const a0 = (i / lobes) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / lobes) * Math.PI * 2 - Math.PI / 2;
    if (i === 0) d += `M${at(inner, a0)}`;
    d += `Q${at(outer * 1.07, (a0 + a1) / 2)} ${at(inner, a1)}`;
  }
  return `${d}Z`;
}

const RING = rosette(16, 26.5, 23.5);

/**
 * Festivo's seal: a marigold rosette framing a lit diya, drawn in hairlines
 * (1px at any size) with a saffron flame. Decorative; the wordmark beside it
 * carries the name. Pass `flame` when the seal sits on saffron itself.
 */
export function FestivoSeal({
  className,
  flame = "var(--secondary)",
}: {
  className?: string;
  flame?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      className={cn("h-10 w-auto shrink-0 overflow-visible", className)}
    >
      <g stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
        <circle cx="32" cy="32" r="30.5" vectorEffect="non-scaling-stroke" />
        <path d={RING} vectorEffect="non-scaling-stroke" />
        <circle
          cx="32"
          cy="32"
          r="17.5"
          opacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <path
        d="M32 18.5C37.2 24.6 38.4 29.6 35 34.4c-1 1.3-5 1.3-6 0-3.4-4.8-2.2-9.8 3-15.9Z"
        fill={flame}
      />
      <path d="M23.5 37.5c2.4 5.4 14.6 5.4 17 0Z" fill="currentColor" />
    </svg>
  );
}
