import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DisplaySettings } from "./DisplaySettings";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  return (
    <header className="border-b-2 border-border bg-background">
      {/* flex-wrap lets the nav drop below the wordmark at 320px or 200% text size */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-3 min-[360px]:px-4 sm:gap-x-3 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-2 sm:gap-3">
          <Button asChild size="sm">
            <Link href="/plan/new">Start planning</Link>
          </Button>
          <DisplaySettings />
        </nav>
      </div>
    </header>
  );
}
