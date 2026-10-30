"use client";

import { Suspense, lazy, useEffect, useRef, useState, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Skeleton } from "@/components/ui/skeleton";
import type { Wizard as WizardScreen } from "@/components/wizard/Wizard";
import { useHydratedProfile } from "@/hooks/use-hydrated-profile";
import { firstName, type Profile } from "@/lib/profile/profile";
import { useProfileStore } from "@/lib/store/profileStore";
import { ACCOUNT_PHOTO } from "./stagePhotos";
import { CreateAccount } from "./CreateAccount";
import { Stage } from "./Stage";
import { Welcome } from "./Welcome";

type View = "account" | "welcome" | "wizard";

/**
 * The wizard and the plan store are their own chunk, fetched in the background as
 * soon as this screen mounts (new planners spend their first minute on the account
 * form). Saved plans are loaded with it, so the wizard opens without a skeleton.
 */
let wizardModule: Promise<{ Wizard: typeof WizardScreen }> | undefined;
const loadWizard = () =>
  (wizardModule ??= Promise.all([
    import("@/components/wizard/Wizard"),
    import("@/lib/store/planStore"),
  ]).then(([wizard, { usePlanStore }]) => {
    if (!usePlanStore.persist.hasHydrated()) void usePlanStore.persist.rehydrate();
    return wizard;
  }));
const Wizard = lazy(() => loadWizard().then((module) => ({ default: module.Wizard })));

/** Focuses the screen's question; false when it is not on screen yet. */
function focusQuestion(): boolean {
  const question = document.querySelector<HTMLElement>(
    "#wizard-step-title, #main h1[tabindex]",
  );
  question?.focus();
  return question !== null;
}

/** Inside the wizard's boundary: finishes a focus move that had to wait for its code. */
function FocusWhenShown({ pendingRef }: { pendingRef: RefObject<boolean> }) {
  useEffect(() => {
    if (pendingRef.current && focusQuestion()) pendingRef.current = false;
  }, [pendingRef]);
  return null;
}

function Loading() {
  return (
    <Stage photo={ACCOUNT_PHOTO} eyebrow="Before we begin" caption="One moment.">
      <div className="grid gap-6" aria-busy="true" aria-label="Loading your account">
        <Skeleton className="h-16" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48" />
      </div>
    </Stage>
  );
}

/**
 * /plan/new: people without a profile create one first, see a short welcome,
 * then answer the wizard. Returning planners go straight to the wizard.
 */
export function Onboarding() {
  const hydrated = useHydratedProfile();
  const announce = useAnnounce();
  const { profile, signUp } = useProfileStore(
    useShallow((s) => ({ profile: s.profile, signUp: s.signUp })),
  );
  const [justJoined, setJustJoined] = useState(false);
  const view: View = !profile ? "account" : justJoined ? "welcome" : "wizard";
  const previousView = useRef<View | null>(null);
  const focusPending = useRef(false);

  useEffect(() => {
    void loadWizard();
  }, []);

  // Each new screen starts at the top with focus on its question.
  useEffect(() => {
    if (!hydrated) return;
    if (previousView.current !== null && previousView.current !== view) {
      window.scrollTo({ top: 0 });
      // The wizard may still be loading; FocusWhenShown finishes the move when it is.
      focusPending.current = !focusQuestion();
    }
    previousView.current = view;
  }, [view, hydrated]);

  if (!hydrated) return <Loading />;

  const create = (created: Profile) => {
    signUp(created);
    setJustJoined(true);
    announce(`Welcome, ${firstName(created.name)}. Your account is ready.`);
  };

  if (view === "account") return <CreateAccount onCreate={create} />;
  if (view === "welcome" && profile)
    return <Welcome name={profile.name} onBegin={() => setJustJoined(false)} />;
  return (
    <Suspense fallback={<Loading />}>
      <Wizard name={profile?.name} />
      <FocusWhenShown pendingRef={focusPending} />
    </Suspense>
  );
}
