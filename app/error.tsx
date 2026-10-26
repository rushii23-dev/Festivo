"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/** Route-level error boundary. Shows a generic message; details stay in the console. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
    headingRef.current?.focus();
  }, [error]);

  return (
    <section
      role="alert"
      className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-20 sm:px-6"
    >
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-title font-extrabold outline-none"
      >
        Something went wrong on this page.
      </h1>
      <p className="max-w-[60ch] text-muted-foreground">
        Your saved plans are safe. Try loading the page again.
      </p>
      <div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </section>
  );
}
