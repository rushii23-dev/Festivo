import Link from "next/link";
import { FestivoSeal } from "@/components/brand/FestivoSeal";

/** The seal beside "Festivo" in the display serif's italic. */
export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-3 rounded-sm leading-none"
    >
      <FestivoSeal className="h-9" />
      <span className="wordmark text-[1.9rem] sm:text-[2.1rem]">Festivo</span>
    </Link>
  );
}
