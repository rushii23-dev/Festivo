import Link from "next/link";

/** "Festivo" set in the display face, with a small confetti doodle. */
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md font-display text-2xl leading-none sm:text-3xl"
    >
      Festivo
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 sm:size-6">
        <circle cx="5" cy="6" r="3" fill="var(--secondary)" />
        <rect
          x="11"
          y="2"
          width="5"
          height="9"
          rx="2"
          transform="rotate(24 13.5 6.5)"
          fill="var(--accent)"
        />
        <path
          d="M5 18c3-4 6 2 9-2s5 1 7-2"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}
