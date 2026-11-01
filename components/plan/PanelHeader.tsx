import type { ReactNode } from "react";

/** One h2 per panel, with an optional line of context and actions on the right. */
export function PanelHeader({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="grid max-w-[62ch] gap-1">
        <h2 className="font-display text-headline">{title}</h2>
        {intro ? <p className="text-muted-foreground">{intro}</p> : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2 print:hidden">{children}</div>
      ) : null}
    </div>
  );
}
