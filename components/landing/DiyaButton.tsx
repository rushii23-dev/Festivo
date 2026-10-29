"use client";

import Link from "next/link";
import { usePressToGo } from "./usePressToGo";

/**
 * The header's "Start planning": a small lamp beside the words, like the lit
 * diya in the seal. Hovering lights the flame and it flickers; a click makes
 * it flare, then opens the page.
 */
export function DiyaButton({ href, children }: { href: string; children: string }) {
  const { pressed, onClick } = usePressToGo(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      data-pressed={pressed || undefined}
      className="diya-button caps"
    >
      <span aria-hidden="true" className="diya">
        <span className="diya-halo" />
        <svg viewBox="0 0 20 22" className="diya-art">
          <path
            className="diya-flame"
            d="M10 1.5c2.9 3.6 3.6 6.6 0 10.3C6.4 8.1 7.1 5.1 10 1.5Z"
          />
          <path
            className="diya-core"
            d="M10 6.2c1.2 1.6 1.4 3 0 4.6-1.4-1.6-1.2-3 0-4.6Z"
          />
          <path
            className="diya-bowl"
            d="M1.5 13.2h17c-.9 4.6-4.4 7-8.5 7s-7.6-2.4-8.5-7Z"
          />
          <path className="diya-spout" d="M18.5 13.2l1.2-1.6v2.8Z" />
        </svg>
      </span>
      {children}
    </Link>
  );
}
