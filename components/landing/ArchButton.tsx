"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { usePressToGo } from "./usePressToGo";

/** Where each petal flies on a click: [x, y] in px from the centre, a spin, a colour. */
const PETALS: [number, number, number, string][] = [
  [-160, -70, -150, "#e8962e"],
  [-110, -118, 90, "#f2b13b"],
  [-48, -146, -70, "#9f1d35"],
  [10, -158, 140, "#e8962e"],
  [64, -140, -100, "#d49653"],
  [118, -110, 160, "#f2b13b"],
  [164, -58, -130, "#c2410c"],
  [-142, 26, 70, "#9f1d35"],
  [150, 34, -80, "#e8962e"],
  [-70, 60, 110, "#f2b13b"],
  [80, 64, -60, "#c2410c"],
];

interface ArchButtonProps {
  href: string;
  children: string;
  /** "photo" draws a parchment arch in light gold for dark photographs; "parchment" a dark one in bronze. */
  tone?: "photo" | "parchment";
}

/**
 * A call to action shaped like the palace windows on the landing page.
 * Hovering lights it from within like a lamp in a window; a click sends out a
 * ring of light and a handful of petals, then opens the page.
 */
export function ArchButton({ href, children, tone = "parchment" }: ArchButtonProps) {
  const { pressed, onClick } = usePressToGo(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      data-pressed={pressed || undefined}
      data-tone={tone}
      className="arch-button"
    >
      <span aria-hidden="true" className="arch-frame" />
      <span aria-hidden="true" className="arch-frame arch-frame-lit" />
      <span className="arch-body">
        <span aria-hidden="true" className="arch-glow" />
        <span aria-hidden="true" className="arch-sheen" />
        <span className="arch-label caps">{children}</span>
      </span>
      <span aria-hidden="true" className="arch-burst" />
      <span aria-hidden="true" className="arch-petals">
        {PETALS.map(([x, y, spin, color], index) => (
          <span
            key={index}
            className="arch-petal"
            style={
              {
                "--x": `${x}px`,
                "--y": `${y}px`,
                "--spin": `${spin}deg`,
                "--delay": `${index * 18}ms`,
                background: color,
              } as CSSProperties
            }
          />
        ))}
      </span>
    </Link>
  );
}
