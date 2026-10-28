import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./Wordmark";

export function SiteHeader() {
  return (
    <header className="site-header border-b border-hairline bg-background print:hidden">
      {/* flex-wrap lets the nav drop below the wordmark at 320px or 200% text size */}
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-8">
        <Wordmark />
        <nav aria-label="Main">
          <Button asChild size="sm">
            <Link href="/plan/new">Start planning</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
