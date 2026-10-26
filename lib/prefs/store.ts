/**
 * External store for display preferences, consumed with useSyncExternalStore.
 * Tracks the saved choice plus the live OS media queries, and mirrors the
 * resolved result onto <html data-theme data-motion>.
 */
import {
  DARK_SCHEME_QUERY,
  DEFAULT_PREFERENCES,
  PREFS_STORAGE_KEY,
  REDUCED_MOTION_QUERY,
  isMotionReduced,
  parsePreferences,
  resolveTheme,
  serializePreferences,
  type Preferences,
} from "./preferences";

export interface PreferencesSnapshot {
  prefs: Preferences;
  systemPrefersDark: boolean;
  systemPrefersReducedMotion: boolean;
}

const SERVER_SNAPSHOT: PreferencesSnapshot = Object.freeze({
  prefs: DEFAULT_PREFERENCES,
  systemPrefersDark: false,
  systemPrefersReducedMotion: false,
});

let snapshot: PreferencesSnapshot = SERVER_SNAPSHOT;
let initialized = false;
let teardown: (() => void) | null = null;
const listeners = new Set<() => void>();

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(PREFS_STORAGE_KEY);
  } catch {
    return null; // Storage can be blocked (private mode, sandboxed iframes).
  }
}

function writeStorage(prefs: Preferences): void {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, serializePreferences(prefs));
  } catch {
    // Preference still applies for this session even if it cannot be saved.
  }
}

export function applyToDocument(
  state: PreferencesSnapshot,
  root = document.documentElement,
) {
  const theme = resolveTheme(state.prefs.theme, state.systemPrefersDark);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.dataset.motion = isMotionReduced(state.prefs, state.systemPrefersReducedMotion)
    ? "reduce"
    : "full";
}

function update(partial: Partial<PreferencesSnapshot>): void {
  snapshot = { ...snapshot, ...partial };
  applyToDocument(snapshot);
  for (const listener of listeners) listener();
}

function init(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const dark = window.matchMedia(DARK_SCHEME_QUERY);
  const motion = window.matchMedia(REDUCED_MOTION_QUERY);
  snapshot = {
    prefs: parsePreferences(readStorage()),
    systemPrefersDark: dark.matches,
    systemPrefersReducedMotion: motion.matches,
  };

  const onDark = (event: MediaQueryListEvent) =>
    update({ systemPrefersDark: event.matches });
  const onMotion = (event: MediaQueryListEvent) =>
    update({ systemPrefersReducedMotion: event.matches });
  // Keep tabs in sync when preferences change in another window.
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFS_STORAGE_KEY)
      update({ prefs: parsePreferences(event.newValue) });
  };

  dark.addEventListener("change", onDark);
  motion.addEventListener("change", onMotion);
  window.addEventListener("storage", onStorage);
  teardown = () => {
    dark.removeEventListener("change", onDark);
    motion.removeEventListener("change", onMotion);
    window.removeEventListener("storage", onStorage);
  };
}

export function subscribe(listener: () => void): () => void {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): PreferencesSnapshot {
  init();
  return snapshot;
}

export function getServerSnapshot(): PreferencesSnapshot {
  return SERVER_SNAPSHOT;
}

export function setPreferences(patch: Partial<Preferences>): void {
  init();
  const prefs = { ...snapshot.prefs, ...patch };
  writeStorage(prefs);
  update({ prefs });
}

/** Synchronous check for imperative animation code (GSAP, Lenis, confetti). */
export function prefersReducedMotionNow(): boolean {
  const state = getSnapshot();
  return isMotionReduced(state.prefs, state.systemPrefersReducedMotion);
}

/** Test-only: forget cached state so each test starts from fresh storage and media. */
export function resetPreferencesStore(): void {
  teardown?.();
  teardown = null;
  initialized = false;
  snapshot = SERVER_SNAPSHOT;
  listeners.clear();
}
