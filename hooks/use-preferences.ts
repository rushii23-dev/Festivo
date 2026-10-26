"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  isMotionReduced,
  resolveTheme,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/lib/prefs/preferences";
import {
  getServerSnapshot,
  getSnapshot,
  setPreferences,
  subscribe,
  type PreferencesSnapshot,
} from "@/lib/prefs/store";

export interface UsePreferences extends PreferencesSnapshot {
  resolvedTheme: ResolvedTheme;
  motionReduced: boolean;
  setTheme: (theme: ThemeChoice) => void;
  setReduceMotion: (reduce: boolean) => void;
}

export function usePreferences(): UsePreferences {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(
    () => ({
      ...state,
      resolvedTheme: resolveTheme(state.prefs.theme, state.systemPrefersDark),
      motionReduced: isMotionReduced(state.prefs, state.systemPrefersReducedMotion),
      setTheme: (theme) => setPreferences({ theme }),
      setReduceMotion: (reduceMotion) => setPreferences({ reduceMotion }),
    }),
    [state],
  );
}

/** True when animation should be skipped (OS setting or in-site toggle). */
export function useMotionReduced(): boolean {
  return usePreferences().motionReduced;
}
