"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePlanStore } from "@/lib/store/planStore";

const subscribe = (onChange: () => void) =>
  usePlanStore.persist.onFinishHydration(onChange);
const getSnapshot = () => usePlanStore.persist.hasHydrated();
const getServerSnapshot = () => false;

/**
 * Loads persisted plans after mount and reports when they are ready, so pages
 * can show a skeleton instead of flashing empty defaults.
 */
export function useHydratedStore(): boolean {
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!usePlanStore.persist.hasHydrated()) void usePlanStore.persist.rehydrate();
  }, []);
  return hydrated;
}
