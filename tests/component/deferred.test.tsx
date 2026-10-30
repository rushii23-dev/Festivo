/**
 * The dashboard's deferred parts. This file has its own module registry, so each
 * lazy chunk is still unloaded when its test first renders it: the stand-in shows,
 * and a click on it must not be lost.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import {
  DeferredPanel,
  DeferredRefineSheet,
  DeferredShareMenu,
} from "@/components/plan/deferred";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import { addDays, todayIso } from "@/lib/timeline/dates";

const today = todayIso(new Date(), "UTC");
const plan = buildMockPlan(
  EventInputSchema.parse({
    eventType: "community",
    name: "Green Street Fair",
    date: { kind: "fixed", date: addDays(today, 60) },
    location: "Bengaluru",
    guestCount: 400,
    budget: { total: 150_000, currency: "INR" },
  }),
  { id: "plan-deferred", today, now: new Date() },
);

const renderWithAnnouncer = (ui: ReactNode) =>
  render(<AnnouncerProvider>{ui}</AnnouncerProvider>);

describe("Deferred dashboard parts", () => {
  it("opens the Refine sheet once it loads when its stand-in was clicked", async () => {
    renderWithAnnouncer(<DeferredRefineSheet plan={plan} />);
    const standIn = screen.getByRole("button", { name: "Refine with AI" });
    expect(standIn).toHaveAttribute("data-deferred");

    fireEvent.click(standIn);
    const dialog = await screen.findByRole("dialog", { name: "Refine with AI" });
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "What should change?" })).toHaveFocus(),
    );
    expect(dialog).toBeVisible();
    expect(document.querySelector("[data-deferred]")).toBeNull();
  });

  it("opens the share menu once it loads when its stand-in was clicked", async () => {
    renderWithAnnouncer(<DeferredShareMenu plan={plan} today={today} />);
    const standIn = screen.getByRole("button", { name: "Export and share" });
    expect(standIn).toHaveAttribute("data-deferred");

    fireEvent.click(standIn);
    expect(
      await screen.findByRole("button", { name: "Download calendar (.ics)" }),
    ).toBeVisible();
  });

  it("holds a busy placeholder until a tab's panel arrives", async () => {
    const { container } = renderWithAnnouncer(
      <DeferredPanel name="vendors" plan={plan} today={today} update={() => {}} />,
    );
    expect(container.querySelector('[data-deferred][aria-busy="true"]')).not.toBeNull();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Vendors" }),
    ).toBeVisible();
    expect(container.querySelector("[data-deferred]")).toBeNull();
  });
});
