"use client";

import { SlidersHorizontal } from "lucide-react";
import { MotionToggle } from "@/components/a11y/MotionToggle";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Theme and motion controls. Radix moves focus in on open and back on close. */
export function DisplaySettings() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Display settings">
          <SlidersHorizontal aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Display settings" className="grid gap-5">
        <ThemePicker />
        <hr className="border-hairline" />
        <MotionToggle />
      </PopoverContent>
    </Popover>
  );
}
