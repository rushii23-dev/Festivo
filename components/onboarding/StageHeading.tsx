import type { ReactNode, Ref } from "react";

interface StageHeadingProps {
  eyebrow: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  /** h1 for a page of its own; the wizard's steps use h2 under the page's h1. */
  level?: 1 | 2;
  id?: string;
  ref?: Ref<HTMLHeadingElement>;
}

/** Small capitals, one large question in the display serif, a gold rule, a quiet line. */
export function StageHeading({
  eyebrow,
  title,
  intro,
  level = 1,
  id,
  ref,
}: StageHeadingProps) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="stage-rise grid justify-items-start gap-5">
      <p className="caps text-muted-foreground">{eyebrow}</p>
      <Heading
        id={id}
        ref={ref}
        tabIndex={-1}
        className="font-display text-headline leading-[1.02] text-balance outline-none"
      >
        {title}
      </Heading>
      <span aria-hidden="true" className="ornament-rule" />
      {intro ? (
        <p className="max-w-[44ch] text-[1.0625rem] leading-relaxed text-muted-foreground">
          {intro}
        </p>
      ) : null}
    </div>
  );
}
