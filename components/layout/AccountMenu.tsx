"use client";

import { LogOut } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useHydratedProfile } from "@/hooks/use-hydrated-profile";
import { firstName, initials } from "@/lib/profile/profile";
import { useProfileStore } from "@/lib/store/profileStore";

/** The planner's initials in a ring; opens their details and Sign out. */
export function AccountMenu() {
  const hydrated = useHydratedProfile();
  const { profile, signOut } = useProfileStore(
    useShallow((s) => ({ profile: s.profile, signOut: s.signOut })),
  );
  if (!hydrated || !profile) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-account
          variant="ghost"
          size="sm"
          className="gap-3 pr-2 pl-2 sm:pr-4"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full border border-current font-display text-base tracking-normal normal-case"
          >
            {initials(profile.name)}
          </span>
          <span className="hidden sm:inline">{firstName(profile.name)}</span>
          <span className="sr-only">, your account</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="grid gap-4">
        <div className="grid gap-1">
          <p className="font-display text-[1.6rem] leading-tight">{profile.name}</p>
          {profile.email ? (
            <p className="text-sm break-all text-muted-foreground">{profile.email}</p>
          ) : null}
        </div>
        <p className="border-t border-hairline pt-4 text-sm text-muted-foreground">
          Your account lives in this browser. Signing out keeps your saved plans here.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="justify-self-start"
        >
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}
