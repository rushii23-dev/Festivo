"use client";

import { useEffect, useRef } from "react";
import { cn } from "cn";
import { prefersReducedMotionNow } from "@/lib/prefs/store";

/** How far (in SVG units) the eyes may drift from rest. */
const REACH = 1.3;

/**
 * Festi, refined: a jharokha arch drawn in one thin line, a diya flame at its
 * foot, and two small eyes that follow the pointer and keyboard focus.
 * Decorative only; the eyes stay still when motion is reduced.
 */
export function FestiMark({ className }: { className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const eyes = useRef<SVGGElement>(null);

  useEffect(() => {
    const mark = svg.current;
    const pupils = eyes.current;
    if (!mark || !pupils) return;
    let frame = 0;

    const lookAt = (x: number, y: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (prefersReducedMotionNow()) {
          pupils.style.transform = "";
          return;
        }
        const box = mark.getBoundingClientRect();
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height * 0.45);
        const length = Math.hypot(dx, dy) || 1;
        const pull = Math.min(length / 240, 1) * REACH;
        pupils.style.transform = `translate(${(dx / length) * pull}px, ${(dy / length) * pull}px)`;
      });
    };

    const onPointer = (event: PointerEvent) => lookAt(event.clientX, event.clientY);
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const box = event.target.getBoundingClientRect();
      lookAt(box.left + box.width / 2, box.top + box.height / 2);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("focusin", onFocus);
    };
  }, []);

  return (
    <svg
      ref={svg}
      aria-hidden="true"
      viewBox="0 0 32 40"
      fill="none"
      className={cn("h-9 w-auto shrink-0 overflow-visible", className)}
    >
      <path
        d="M3.5 39V16.5C3.5 9.3 9.1 3.5 16 3.5s12.5 5.8 12.5 13V39"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M7 39V17c0-5.3 4-9.6 9-9.6s9 4.3 9 9.6v22"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.55"
      />
      <path d="M1.5 39h29" stroke="currentColor" strokeWidth="1.25" />
      <g ref={eyes} className="motion-ok:transition-transform motion-ok:duration-300">
        <circle cx="12.6" cy="19.5" r="1.35" fill="currentColor" />
        <circle cx="19.4" cy="19.5" r="1.35" fill="currentColor" />
      </g>
      <path d="M11 32.5c1.6 2.6 8.4 2.6 10 0Z" fill="currentColor" />
      <path
        d="M16 25.2c1.8 2 2.1 3.5.9 4.6-.6.5-1.2.6-1.8 0-1.2-1.1-.9-2.6.9-4.6Z"
        fill="var(--secondary)"
      />
    </svg>
  );
}
