import { cn } from "cn";
import type { CSSProperties, ElementType } from "react";

interface SplitHeadingProps {
  as?: ElementType;
  /** Each entry is one visual line. */
  lines: string[];
  /** What a screen reader hears; defaults to the lines joined with spaces. */
  label?: string;
  /** "load" fades in with CSS on page load; "scroll" is revealed by LandingMotion. */
  reveal: "load" | "scroll";
  className?: string;
  id?: string;
}

/**
 * A heading whose letters can fade in one at a time. The readable text is
 * kept whole for assistive technology; the per-letter spans are hidden from it.
 */
export function SplitHeading({
  as: Tag = "h2",
  lines,
  label,
  reveal,
  className,
  id,
}: SplitHeadingProps) {
  let index = 0;
  return (
    <Tag id={id} data-split={reveal} className={cn("font-display", className)}>
      <span className="sr-only">{label ?? lines.join(" ")}</span>
      <span aria-hidden="true" className="block">
        {lines.map((line, lineIndex) => (
          <span key={lineIndex} className="block">
            {line.split(" ").map((word, wordIndex, words) => (
              <span key={wordIndex}>
                <span className="inline-block whitespace-nowrap">
                  {[...word].map((char) => (
                    <span
                      key={index}
                      className="split-char"
                      style={{ "--i": index++ } as CSSProperties}
                    >
                      {char}
                    </span>
                  ))}
                </span>
                {wordIndex < words.length - 1 ? " " : null}
              </span>
            ))}
          </span>
        ))}
      </span>
    </Tag>
  );
}
