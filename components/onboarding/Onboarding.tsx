"use client";

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Skeleton } from "@/components/ui/skeleton";
import { Wizard } from "@/components/wizard/Wizard";
import { useHydratedProfile } from "@/hooks/use-hydrated-profile";
import { useHydratedStore } from "@/hooks/use-hydrated-store";
import { firstName, type Profile } from "@/lib/profile/profile";
import { useProfileStore } from "@/lib/store/profileStore";
import { ACCOUNT_PHOTO } from "./stagePhotos";
import { CreateAccount } from "./CreateAccount";
import { Stage } from "./Stage";
import { Welcome } from "./Welcome";

type View = "account" | "welcome" | "wizard";

/**
 * /plan/new: people without a profile create one first, see a short welcome,
 * then answer the wizard. Returning planners go straight to the wizard.
 */
export function Onboarding() {
  // Load saved plans alongside the profile so the wizard opens without a skeleton.
  const plansReady = useHydratedStore();
  const hydrated = useHydratedProfile() && plansReady;
  const announce = useAnnounce();
  const { profile, signUp } = useProfileStore(
    useShallow((s) => ({ profile: s.profile, signUp: s.signUp })),
  );
  const [justJoined, setJustJoined] = useState(false);
  const view: View = !profile ? "account" : justJoined ? "welcome" : "wizard";
  const previousView = useRef<View | null>(null);

  // Each new screen starts at the top with focus on its question.
  useEffect(() => {
    if (!hydrated) return;
    if (previousView.current !== null && previousView.current !== view) {
      window.scrollTo({ top: 0 });
      document
        .querySelector<HTMLElement>("#wizard-step-title, #main h1[tabindex]")
        ?.focus();
    }
    previousView.current = view;
  }, [view, hydrated]);

  if (!hydrated) {
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

  const create = (created: Profile) => {
    signUp(created);
    setJustJoined(true);
    announce(`Welcome, ${firstName(created.name)}. Your account is ready.`);
  };

  if (view === "account") return <CreateAccount onCreate={create} />;
  if (view === "welcome" && profile)
    return <Welcome name={profile.name} onBegin={() => setJustJoined(false)} />;
  return <Wizard name={profile?.name} />;
}
