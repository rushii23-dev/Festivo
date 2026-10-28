"use client";

import { useMemo, useSyncExternalStore } from "react";
import { isMotionReduced } from "@/lib/prefs/preferences";
import {
  getServerSnapshot,
  getSnapshot,
  setPreferences,
  subscribe,
  type PreferencesSnapshot,
} from "@/lib/prefs/store";

export interface UsePreferences extends PreferencesSnapshot {
  motionReduced: boolean;
  setReduceMotion: (reduce: boolean) => void;
}

export function usePreferences(): UsePreferences {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(
    () => ({
      ...state,
      motionReduced: isMotionReduced(state.prefs, state.systemPrefersReducedMotion),
      setReduceMotion: (reduceMotion) => setPreferences({ reduceMotion }),
    }),
    [state],
  );
}

/** True when animation should be skipped (OS setting or in-site toggle). */
export function useMotionReduced(): boolean {
  return usePreferences().motionReduced;
}
