"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

const TONES = {
  dark: "border-[#e2d6c3]/60 text-[#e2d6c3] hover:border-[#e2d6c3] aria-pressed:bg-[#e2d6c3] aria-pressed:text-[#292622]",
  light:
    "border-input text-foreground hover:border-foreground aria-pressed:bg-foreground aria-pressed:text-background",
};

/**
 * Pauses the movement in the surrounding `[data-motion-region]` (WCAG 2.2.2):
 * it marks the region `data-paused`, which stops the marquee in CSS and the
 * petals on their canvas. Shown only while motion is on.
 */
export function PauseMotion({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof TONES;
}) {
  const [paused, setPaused] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    const next = !paused;
    setPaused(next);
    button.current?.closest("[data-motion-region]")?.toggleAttribute("data-paused", next);
  };

  return (
    <button
      ref={button}
      type="button"
      aria-pressed={paused}
      onClick={toggle}
      className={`caps hidden min-h-11 items-center gap-2 rounded-pill border px-4 print:hidden motion-ok:inline-flex ${TONES[tone]}`}
    >
      {paused ? (
        <Play aria-hidden="true" className="size-4" />
      ) : (
        <Pause aria-hidden="true" className="size-4" />
      )}
      {label}
    </button>
  );
}
