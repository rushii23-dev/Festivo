/**
 * Motion preference. The site always animates unless the device itself asks
 * for reduced motion (an operating-system accessibility setting); there is no
 * in-site switch.
 *
 * public/prefs-init.js applies the same rule before first paint; the parity test
 * in tests/unit/prefs-init.test.ts keeps the two implementations in sync.
 */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The value written to <html data-motion>. */
export function motionAttribute(systemPrefersReduced: boolean): "reduce" | "full" {
  return systemPrefersReduced ? "reduce" : "full";
}
