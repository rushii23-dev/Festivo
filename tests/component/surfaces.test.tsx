/**
 * Server-rendered surfaces and site chrome, rendered in jsdom: the landing page and
 * its sections, header and footer, the 404 and error screens, focus after
 * navigation, and the share menu's three actions. The browser suite covers how
 * they look and move; these cover what they say and do.
 */
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import { RouteFocus } from "@/components/a11y/RouteFocus";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ShareMenu } from "@/components/plan/ShareMenu";
import RouteError from "@/app/error";
import NotFound from "@/app/not-found";
import HomePage from "@/app/page";
import PlanPage from "@/app/plan/[id]/page";
import NewPlanPage from "@/app/plan/new/page";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import { addDays, todayIso } from "@/lib/timeline/dates";

const navigation = vi.hoisted(() => ({ pathname: "/", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, prefetch: vi.fn() }),
}));
// Scroll-linked motion needs a real browser; the e2e suite covers it.
vi.mock("@/components/landing/LandingMotion", () => ({ LandingMotion: () => null }));

beforeEach(() => {
  // jsdom has no canvas; the petal animation must simply not start.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => vi.restoreAllMocks());

const today = todayIso(new Date(), "UTC");
const plan = buildMockPlan(
  EventInputSchema.parse({
    eventType: "wedding",
    name: "Priya, Arjun; and family",
    date: { kind: "fixed", date: addDays(today, 120) },
    location: "Jaipur",
    guestCount: 250,
    budget: { total: 2_500_000, currency: "INR" },
  }),
  { id: "plan-share", today, now: new Date() },
);

describe("landing page", () => {
  it("tells the whole story in text, with one h1 and a start button in each act", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName(
      "Planned to the last petal.",
    );
    for (const name of [/Counted back/, /Your celebration/]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    // The sample plan's real budget, timeline and vendors appear as text.
    expect(screen.getByRole("region", { name: /Counted back/ })).toHaveTextContent(/By /);
    const starts = screen.getAllByRole("link", { name: /Start (planning|your plan)/ });
    expect(starts.length).toBeGreaterThanOrEqual(3);
    for (const link of starts) expect(link).toHaveAttribute("href", "/plan/new");
    // Every photograph that carries meaning has written alt text.
    for (const img of screen.getAllByRole("img")) {
      expect(img.getAttribute("alt")?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("pausing moving content", () => {
  it("marks the ideas and the finale as paused, and plays them again", async () => {
    render(<HomePage />);
    const user = userEvent.setup();
    for (const [name, selector] of [
      ["Pause ideas", "#ideas"],
      ["Pause petals", "section.finale"],
    ] as const) {
      const button = screen.getByRole("button", { name });
      const region = document.querySelector(selector);
      expect(button).toHaveAttribute("aria-pressed", "false");
      await user.click(button);
      expect(button).toHaveAttribute("aria-pressed", "true");
      expect(region).toHaveAttribute("data-paused");
      await user.click(button);
      expect(region).not.toHaveAttribute("data-paused");
    }
  });
});

describe("site chrome", () => {
  it("the header names the site and leaves the call to action to the page", () => {
    render(<SiteHeader />);
    const banner = screen.getByRole("banner");
    expect(within(banner).getAllByRole("link")).toHaveLength(1);
    expect(within(banner).getByRole("link")).toHaveAttribute("href", "/");
    expect(within(banner).queryByRole("link", { name: "Start planning" })).toBeNull();
  });

  it("the planner page starts with the account screen", async () => {
    render(
      <AnnouncerProvider>
        <NewPlanPage />
      </AnnouncerProvider>,
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Create your account" }),
    ).toBeInTheDocument();
  });

  it("the plan page decodes its id and explains a plan saved elsewhere", async () => {
    render(
      <AnnouncerProvider>
        {await PlanPage({
          params: Promise.resolve({ id: "not%20here" }),
          searchParams: Promise.resolve({}),
        })}
      </AnnouncerProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "We couldn’t find that plan." }),
    ).toBeInTheDocument();
  });

  it("the footer is a labelled landmark that says where plans are kept", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Your plans are saved in this browser only",
    );
  });

  it("the 404 page explains and links back to the planner", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This page isn't on the guest list.",
    );
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("the error screen announces itself, takes focus and can retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    render(<RouteError error={new Error("secret stack")} reset={reset} />);
    const alert = screen.getByRole("alert");
    expect(alert).not.toHaveTextContent("secret stack");
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
    await userEvent
      .setup()
      .click(within(alert).getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("moves focus to main after a client-side navigation, not on first load", () => {
    navigation.pathname = "/";
    const { rerender } = render(
      <>
        <RouteFocus />
        <main id="main" tabIndex={-1} />
      </>,
    );
    expect(document.getElementById("main")).not.toHaveFocus();
    navigation.pathname = "/plan/new";
    rerender(
      <>
        <RouteFocus />
        <main id="main" tabIndex={-1} />
      </>,
    );
    expect(document.getElementById("main")).toHaveFocus();
  });
});

describe("share menu", () => {
  function renderMenu() {
    const user = userEvent.setup();
    render(
      <AnnouncerProvider>
        <ShareMenu plan={plan} today={today} />
      </AnnouncerProvider>,
    );
    const open = () =>
      user.click(screen.getByRole("button", { name: "Export and share" }));
    return { user, open };
  }

  it("downloads the timeline as a calendar file and says so", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const created = vi.fn((_blob: Blob) => "blob:calendar");
    const revoked = vi.fn();
    vi.stubGlobal(
      "URL",
      Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked }),
    );
    const clicked = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const { user, open } = renderMenu();
    await open();
    await user.click(screen.getByRole("button", { name: "Download calendar (.ics)" }));

    expect(clicked).toHaveBeenCalledOnce();
    const ics = await (created.mock.calls[0]?.[0] as Blob).text();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Priya\\, Arjun\\; and family");
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("status")
          .map((s) => s.textContent)
          .join(" "),
      ).toMatch(/Calendar downloaded as .*\.ics/),
    );
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(revoked).toHaveBeenCalledWith("blob:calendar");
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("copies a plain-text summary, and explains when the browser refuses", async () => {
    // After userEvent.setup(), which installs a clipboard stub of its own.
    const { user, open } = renderMenu();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    await open();
    await user.click(screen.getByRole("button", { name: "Copy summary" }));
    expect(String(writeText.mock.calls[0]?.[0])).toContain("Priya, Arjun; and family");
    await waitFor(() =>
      expect(
        screen
          .getAllByRole("status")
          .map((s) => s.textContent)
          .join(" "),
      ).toMatch(/Summary copied/),
    );

    writeText.mockRejectedValueOnce(new Error("denied"));
    await open();
    await user.click(screen.getByRole("button", { name: "Copy summary" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/blocked copying/),
    );
  });

  it("prints once the menu has closed", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const { user, open } = renderMenu();
    await open();
    await user.click(screen.getByRole("button", { name: "Print or save as PDF" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(screen.queryByRole("button", { name: "Print or save as PDF" })).toBeNull();
  });
});
