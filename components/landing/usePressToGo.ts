"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { prefersReducedMotionNow } from "@/lib/prefs/store";

/** How long a button's click animation plays before the next page opens. */
export const PRESS_MS = 560;

/**
 * For links that play a short animation before navigating. A plain click sets
 * `pressed` (the button's CSS animates on `data-pressed`), then opens `href`.
 * Modified clicks (new tab, new window) and reduced motion go straight through.
 */
export function usePressToGo(href: string, delay = PRESS_MS) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const modified =
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0;
    if (modified || prefersReducedMotionNow()) return;
    event.preventDefault();
    if (pressed) return;
    setPressed(true);
    router.prefetch(href);
    timer.current = setTimeout(() => router.push(href), delay);
  };

  return { pressed, onClick };
}
