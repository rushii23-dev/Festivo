"use client";

import { useEffect, useSyncExternalStore } from "react";

/** The part of zustand's `persist` middleware API that hydration tracking needs. */
interface PersistedStore {
  persist: {
    hasHydrated(): boolean;
    onFinishHydration(listener: () => void): () => void;
    rehydrate(): Promise<void> | void;
  };
}

const getServerSnapshot = () => false;

/**
 * Builds a hook that loads a persisted store after mount and reports when it
 * is ready, so pages can show a skeleton instead of flashing empty defaults.
 * Created once per store at module level, which keeps `subscribe` stable.
 */
export function createHydrationHook({ persist }: PersistedStore): () => boolean {
  const subscribe = (onChange: () => void) => persist.onFinishHydration(onChange);
  const getSnapshot = () => persist.hasHydrated();

  return function useHydrated() {
    const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    useEffect(() => {
      if (!persist.hasHydrated()) void persist.rehydrate();
    }, []);
    return hydrated;
  };
}
