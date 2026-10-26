/**
 * Client-side store for the wizard draft and saved plans, persisted to
 * localStorage (no accounts, no database). Persisted data is re-validated on
 * load, so a corrupted or tampered entry is dropped instead of crashing the UI.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { PlanSchema, type Plan } from "@/lib/schemas/plan";
import {
  DEFAULT_DRAFT,
  STEPS,
  WizardDraftSchema,
  type WizardDraft,
} from "@/lib/wizard/draft";
import { createDebouncedStorage } from "./debouncedStorage";

export const STORE_KEY = "festivo:plans";
export const STORE_VERSION = 1;

export interface PlanStoreState {
  draft: WizardDraft;
  step: number;
  plans: Record<string, Plan>;
  setDraft: (patch: Partial<WizardDraft>) => void;
  replaceDraft: (draft: WizardDraft) => void;
  setStep: (step: number) => void;
  resetDraft: () => void;
  savePlan: (plan: Plan) => void;
  updatePlan: (id: string, update: (plan: Plan) => Plan) => void;
  deletePlan: (id: string) => void;
}

export const storage = createDebouncedStorage(() =>
  typeof window === "undefined" ? undefined : window.localStorage,
);

type Persisted = Pick<PlanStoreState, "draft" | "step" | "plans">;

/** Keeps only valid persisted data; anything malformed falls back to defaults. */
export function sanitizePersisted(value: unknown): Persisted {
  const data = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const draft = WizardDraftSchema.safeParse(data.draft);
  const step =
    typeof data.step === "number" && Number.isInteger(data.step) ? data.step : 0;
  const plans: Record<string, Plan> = {};
  if (data.plans && typeof data.plans === "object") {
    for (const [id, raw] of Object.entries(data.plans as Record<string, unknown>)) {
      const plan = PlanSchema.safeParse(raw);
      if (plan.success && plan.data.id === id) plans[id] = plan.data;
    }
  }
  return {
    draft: draft.success ? draft.data : { ...DEFAULT_DRAFT },
    step: Math.min(Math.max(step, 0), STEPS.length - 1),
    plans,
  };
}

export const usePlanStore = create<PlanStoreState>()(
  persist(
    (set) => ({
      draft: { ...DEFAULT_DRAFT },
      step: 0,
      plans: {},
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      replaceDraft: (draft) => set({ draft }),
      setStep: (step) => set({ step: Math.min(Math.max(step, 0), STEPS.length - 1) }),
      resetDraft: () => set({ draft: { ...DEFAULT_DRAFT }, step: 0 }),
      savePlan: (plan) => set((s) => ({ plans: { ...s.plans, [plan.id]: plan } })),
      updatePlan: (id, update) =>
        set((s) => {
          const current = s.plans[id];
          return current ? { plans: { ...s.plans, [id]: update(current) } } : s;
        }),
      deletePlan: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.plans;
          return { plans: rest };
        }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => storage),
      // Hydrate after mount so server HTML and the first client render match.
      skipHydration: true,
      partialize: ({ draft, step, plans }) => ({ draft, step, plans }),
      merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
    },
  ),
);
