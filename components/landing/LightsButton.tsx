"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { usePressToGo } from "./usePressToGo";

const BULBS = 7;
/** Depth of the wire's dip, in px; the wire is drawn as one quadratic curve. */
const SAG = 9;

/** A bulb's place along the wire: x in % of the width, y in px below the ends. */
function bulbAt(index: number) {
  const t = (index + 0.5) / BULBS;
  return { x: t * 100, y: 1 + 4 * SAG * t * (1 - t) };
}

/**
 * A call to action for photographs of evenings under strung lights: a thin
 * parchment frame with a string of bulbs hanging beneath it. Hovering lights
 * the bulbs one by one; a click makes them twinkle, then opens the page.
 */
export function LightsButton({ href, children }: { href: string; children: string }) {
  const { pressed, onClick } = usePressToGo(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      data-pressed={pressed || undefined}
      className="lights-button"
    >
      <span className="lights-label caps">{children}</span>
      <span aria-hidden="true" className="lights-string">
        <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="lights-wire">
          <path d={`M0 1 Q50 ${1 + 2 * SAG} 100 1`} vectorEffect="non-scaling-stroke" />
        </svg>
        {Array.from({ length: BULBS }, (_, index) => {
          const { x, y } = bulbAt(index);
          return (
            <span
              key={index}
              className="lights-bulb"
              style={{ left: `${x}%`, top: `${y}px`, "--i": index } as CSSProperties}
            />
          );
        })}
      </span>
    </Link>
  );
}
