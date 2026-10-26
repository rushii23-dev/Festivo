/**
 * Display preferences (theme + motion), persisted in localStorage.
 *
 * public/theme-init.js applies the same rules before first paint; the parity test
 * in tests/unit/theme-init.test.ts keeps the two implementations in sync.
 */

export const PREFS_STORAGE_KEY = "festivo:prefs";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ResolvedTheme = "light" | "dark";

export interface Preferences {
  theme: ThemeChoice;
  /** The in-site "Reduce motion" toggle. The OS setting is tracked separately. */
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({
  theme: "system",
  reduceMotion: false,
});

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (
    typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value)
  );
}

/** Reads stored preferences, falling back to defaults for anything missing or malformed. */
export function parsePreferences(raw: string | null | undefined): Preferences {
  if (!raw) return { ...DEFAULT_PREFERENCES };
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return { ...DEFAULT_PREFERENCES };
    const record = data as Record<string, unknown>;
    return {
      theme: isThemeChoice(record.theme) ? record.theme : DEFAULT_PREFERENCES.theme,
      reduceMotion: record.reduceMotion === true,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function serializePreferences(prefs: Preferences): string {
  return JSON.stringify({ theme: prefs.theme, reduceMotion: prefs.reduceMotion });
}

export function resolveTheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

/** Motion is reduced if either the OS or the in-site toggle asks for it. */
export function isMotionReduced(
  prefs: Preferences,
  systemPrefersReduced: boolean,
): boolean {
  return systemPrefersReduced || prefs.reduceMotion;
}
