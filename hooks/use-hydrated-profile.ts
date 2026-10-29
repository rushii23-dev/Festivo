"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useProfileStore } from "@/lib/store/profileStore";

const subscribe = (onChange: () => void) =>
  useProfileStore.persist.onFinishHydration(onChange);
const getSnapshot = () => useProfileStore.persist.hasHydrated();
const getServerSnapshot = () => false;

/** Loads the saved profile after mount and reports when it is ready. */
export function useHydratedProfile(): boolean {
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    if (!useProfileStore.persist.hasHydrated()) void useProfileStore.persist.rehydrate();
  }, []);
  return hydrated;
}
