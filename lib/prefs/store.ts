/**
 * Tracks the device's reduced-motion setting and mirrors it onto
 * <html data-motion>, so CSS and animation code agree on whether to move.
 */
import { REDUCED_MOTION_QUERY, motionAttribute } from "./preferences";

let reduced = false;
let initialized = false;
let teardown: (() => void) | null = null;

function apply(): void {
  document.documentElement.dataset.motion = motionAttribute(reduced);
}

function init(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  reduced = query.matches;
  const onChange = (event: MediaQueryListEvent) => {
    reduced = event.matches;
    apply();
  };
  query.addEventListener("change", onChange);
  teardown = () => query.removeEventListener("change", onChange);
}

/** Synchronous check for imperative animation code (GSAP, Lenis, petals). */
export function prefersReducedMotionNow(): boolean {
  init();
  return reduced;
}

/** Test-only: forget cached state so each test reads the media query afresh. */
export function resetMotionStore(): void {
  teardown?.();
  teardown = null;
  initialized = false;
  reduced = false;
}
