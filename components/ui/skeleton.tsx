import { cn } from "cn";
import type { ComponentProps } from "react";

/** Placeholder block shown while content loads. Pulses only when motion is allowed. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-lg bg-muted motion-ok:animate-pulse", className)}
      {...props}
    />
  );
}
