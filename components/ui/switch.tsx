"use client";

import * as React from "react";
import { cn } from "cn";
import { Switch as SwitchPrimitive } from "radix-ui";

/** Track is 28×48px; checked state is shown by thumb position and a check mark, not color alone. */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-pill border-2 border-border bg-muted p-0.5 after:absolute after:-inset-2 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none flex size-5 items-center justify-center rounded-full border-2 border-border bg-card data-[state=checked]:translate-x-5 motion-ok:transition-transform"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className="hidden size-3 text-foreground group-data-[state=checked]/switch:block"
        >
          <path
            d="M2.5 6.5 5 9l4.5-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
