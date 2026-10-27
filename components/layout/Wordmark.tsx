import Link from "next/link";
import { FestiMark } from "@/components/brand/FestiMark";

/** Festi's arch mark beside "Festivo" in widely spaced serif capitals. */
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-sm leading-none"
    >
      <FestiMark className="h-8" />
      <span className="font-display text-[1.4rem] tracking-[0.2em] uppercase sm:text-[1.55rem]">
        Festivo
      </span>
    </Link>
  );
}
