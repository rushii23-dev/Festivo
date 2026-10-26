import Link from "next/link";
import { Button } from "@/components/ui/button";

// Interim landing content. Phase 6 replaces the body with the scroll story,
// keeping this server-rendered headline so it reads without JavaScript.
export default function HomePage() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-24"
    >
      <h1 id="hero-title" className="max-w-[12ch] font-display text-display">
        Plan the party, not the panic.
      </h1>
      <p className="max-w-[60ch] text-lg sm:text-xl">
        Tell Festivo about your wedding, birthday or community event. You get a budget
        that adds up, a timeline counted back from the big day, a vendor checklist and
        ideas that fit your style.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button asChild size="lg">
          <Link href="/plan/new">Start planning</Link>
        </Button>
      </div>
    </section>
  );
}
