import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-20 sm:px-6">
      <h1 className="font-display text-title">This page isn&apos;t on the guest list.</h1>
      <p className="max-w-[60ch] text-muted-foreground">
        The link may be old, or the plan was saved in a different browser.
      </p>
      <div>
        <Button asChild>
          <Link href="/">Go to the home page</Link>
        </Button>
      </div>
    </section>
  );
}
