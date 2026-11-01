"use client";

import { usePlanStore } from "@/lib/store/planStore";
import { createHydrationHook } from "./use-hydrated";

/** Loads persisted plans and the wizard draft after mount and reports when they are ready. */
export const useHydratedStore = createHydrationHook(usePlanStore);
