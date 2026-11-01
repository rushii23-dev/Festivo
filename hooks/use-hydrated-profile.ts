"use client";

import { useProfileStore } from "@/lib/store/profileStore";
import { createHydrationHook } from "./use-hydrated";

/** Loads the saved profile after mount and reports when it is ready. */
export const useHydratedProfile = createHydrationHook(useProfileStore);
