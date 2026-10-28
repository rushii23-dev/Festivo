"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePreferences } from "@/hooks/use-preferences";

/**
 * In-site "Reduce motion" switch. When the device already asks for reduced
 * motion the switch is shown on and locked, with the reason in text.
 */
export function MotionToggle() {
  const { prefs, systemPrefersReducedMotion, motionReduced, setReduceMotion } =
    usePreferences();
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor={id}>Reduce motion</Label>
        <p id={hintId} className="text-sm text-muted-foreground">
          {systemPrefersReducedMotion
            ? "On because your device asks for less motion."
            : "Turns off scroll animations and falling petals."}
        </p>
      </div>
      <Switch
        id={id}
        aria-describedby={hintId}
        checked={systemPrefersReducedMotion ? motionReduced : prefs.reduceMotion}
        disabled={systemPrefersReducedMotion}
        onCheckedChange={setReduceMotion}
      />
    </div>
  );
}
