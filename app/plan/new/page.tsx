import type { Metadata } from "next";

export const metadata: Metadata = { title: "Plan a new event" };

// Placeholder route so navigation works end to end; the wizard lands in Phase 4.
export default function NewPlanPage() {
  return (
    <section className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-title font-extrabold">Plan a new event</h1>
      <p className="text-muted-foreground">The planning wizard is on its way.</p>
    </section>
  );
}
