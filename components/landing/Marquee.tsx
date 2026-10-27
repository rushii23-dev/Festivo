import { cn } from "cn";

/**
 * A slow, endless line of idea titles. The list is read once by screen
 * readers; the duplicate that makes the loop seamless is hidden from them.
 */
export function Marquee({
  items,
  reverse = false,
  className,
}: {
  items: string[];
  reverse?: boolean;
  className?: string;
}) {
  const run = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
    >
      {items.map((item) => (
        <li key={item} className="flex items-center gap-10 sm:gap-14">
          <span className="whitespace-nowrap">{item}</span>
          <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3 text-secondary">
            <path d="M6 0 12 6 6 12 0 6Z" fill="currentColor" />
          </svg>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("min-w-0 overflow-hidden", className)}>
      <div
        className="marquee-track flex w-max"
        data-direction={reverse ? "reverse" : undefined}
      >
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}
