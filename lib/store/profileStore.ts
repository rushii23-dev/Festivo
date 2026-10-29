/**
 * The planner's profile, persisted to localStorage on this device only.
 * Kept apart from the plan store so signing out never touches saved plans.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { sanitizePersistedProfile, type Profile } from "@/lib/profile/profile";

export const PROFILE_KEY = "festivo:profile";
export const PROFILE_VERSION = 1;

export interface ProfileStoreState {
  profile: Profile | null;
  signUp: (profile: Profile) => void;
  signOut: () => void;
}

export const useProfileStore = create<ProfileStoreState>()(
  persist(
    (set) => ({
      profile: null,
      signUp: (profile) => set({ profile }),
      signOut: () => set({ profile: null }),
    }),
    {
      name: PROFILE_KEY,
      version: PROFILE_VERSION,
      storage: createJSONStorage(() => window.localStorage),
      // Hydrate after mount so server HTML and the first client render match.
      skipHydration: true,
      partialize: ({ profile }) => ({ profile }),
      merge: (persisted, current) => ({
        ...current,
        profile: sanitizePersistedProfile(persisted),
      }),
    },
  ),
);
