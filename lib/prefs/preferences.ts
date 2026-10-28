/**
 * Display preferences, persisted in localStorage. The site has one (light) theme,
 * so the only preference is the in-site "Reduce motion" toggle.
 *
 * public/prefs-init.js applies the same rules before first paint; the parity test
 * in tests/unit/prefs-init.test.ts keeps the two implementations in sync.
 */

export const PREFS_STORAGE_KEY = "festivo:prefs";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface Preferences {
  /** The in-site "Reduce motion" toggle. The OS setting is tracked separately. */
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  reduceMotion: false,
});

/** Reads stored preferences, falling back to defaults for anything missing or malformed. */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return { ...DEFAULT_PREFERENCES };
    return { reduceMotion: (data as Record<string, unknown>).reduceMotion === true };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function serializePreferences(prefs: Preferences): string {
  return JSON.stringify({ reduceMotion: prefs.reduceMotion });
}

/** Motion is reduced if either the OS or the in-site toggle asks for it. */
export function isMotionReduced(
  prefs: Preferences,
  systemPrefersReduced: boolean,
): boolean {
  return systemPrefersReduced || prefs.reduceMotion;
}
