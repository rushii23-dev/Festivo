import type { ComponentProps } from "react";

/** Content for screen readers only. Stays in the accessibility tree, hidden visually. */
export function VisuallyHidden({ className, ...props }: ComponentProps<"span">) {
  return <span className={className ? `sr-only ${className}` : "sr-only"} {...props} />;
}
