import { cn } from "cn";
import type { ReactNode } from "react";

type Tone = "success" | "warning" | "destructive" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

/** Icon + text status line; the icon is decorative, the words carry the meaning. */
export function StatusNote({
  tone,
  icon,
  children,
  className,
}: {
  tone: Tone;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("flex items-start gap-2 font-bold", TONE_CLASS[tone], className)}>
      <span aria-hidden="true" className="mt-0.5 shrink-0 [&_svg]:size-5">
        {icon}
      </span>
      <span>{children}</span>
    </p>
  );
}
