"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { usePressToGo } from "./usePressToGo";

/**
 * The toran: marigolds and mango leaves on threads of different lengths,
 * evenly across the top of the button. [kind, thread length in px, spin on falling].
 */
const DROPS: ["marigold" | "leaf", number, number][] = [
  ["marigold", 7, -120],
  ["leaf", 4, 80],
  ["marigold", 11, 140],
  ["leaf", 5, -90],
  ["marigold", 13, -160],
  ["leaf", 5, 100],
  ["marigold", 11, 130],
  ["leaf", 4, -70],
  ["marigold", 7, 150],
];

/**
 * The finale's call to action: an ink button under a marigold toran, the
 * garland hung over doorways for a celebration. Hovering sets the garland
 * swaying; a click lets the flowers fall, then opens the page.
 */
export function ToranButton({ href, children }: { href: string; children: string }) {
  const { pressed, onClick } = usePressToGo(href, 640);

  return (
    <Link
      href={href}
      onClick={onClick}
      data-pressed={pressed || undefined}
      className="toran-button"
    >
      <span aria-hidden="true" className="toran">
        {DROPS.map(([kind, thread, spin], index) => (
          <span
            key={index}
            className="toran-drop"
            data-kind={kind}
            style={
              {
                left: `${((index + 0.5) / DROPS.length) * 100}%`,
                "--thread": `${thread}px`,
                "--spin": `${spin}deg`,
                "--i": index,
              } as CSSProperties
            }
          />
        ))}
      </span>
      <span className="toran-body caps">{children}</span>
    </Link>
  );
}
