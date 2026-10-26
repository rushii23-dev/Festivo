"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePreferences } from "@/hooks/use-preferences";
import { THEME_CHOICES, isThemeChoice, type ThemeChoice } from "@/lib/prefs/preferences";

const LABELS: Record<ThemeChoice, string> = {
  system: "Match my device",
  light: "Light",
  dark: "Dark",
};

export function ThemePicker() {
  const { prefs, setTheme } = usePreferences();
  const id = useId();
  const legendId = `${id}-legend`;

  return (
    <div className="grid gap-3">
      <p id={legendId} className="font-bold">
        Theme
      </p>
      <RadioGroup
        aria-labelledby={legendId}
        value={prefs.theme}
        onValueChange={(value) => {
          if (isThemeChoice(value)) setTheme(value);
        }}
        className="gap-1"
      >
        {THEME_CHOICES.map((choice) => (
          <div key={choice} className="flex min-h-11 items-center gap-3">
            <RadioGroupItem id={`${id}-${choice}`} value={choice} />
            <Label htmlFor={`${id}-${choice}`} className="font-medium">
              {LABELS[choice]}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
