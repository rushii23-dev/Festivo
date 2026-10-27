import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import { PlanDashboard } from "@/components/plan/PlanDashboard";
import { scaleBudget } from "@/lib/budget/rebalance";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { diffPlans } from "@/lib/plan/diff";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import type { Plan } from "@/lib/schemas/plan";
import { STORE_KEY, usePlanStore } from "@/lib/store/planStore";
import { addDays, todayIso } from "@/lib/timeline/dates";
import { DEFAULT_DRAFT } from "@/lib/wizard/draft";

// Every panel stays mounted, so jsdom re-renders a large tree on each keystroke.
vi.setConfig({ testTimeout: 20_000 });

const today = todayIso(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone);
const plan = buildMockPlan(
  EventInputSchema.parse({
    eventType: "birthday",
    name: "Maya turns 7",
    date: { kind: "fixed", date: addDays(today, 90) },
    location: "Pune",
    guestCount: 25,
    budget: { total: 40_000, currency: "INR" },
  }),
  { id: "plan-1", today, now: new Date() },
);

const stored = () => usePlanStore.getState().plans[plan.id]!;

function renderDashboard(hash = "") {
  window.history.replaceState(null, "", `/plan/${plan.id}${hash}`);
  const user = userEvent.setup();
  render(
    <AnnouncerProvider>
      <PlanDashboard id={plan.id} />
    </AnnouncerProvider>,
  );
  return user;
}

/** The value shown next to a label in the budget summary. */
const figure = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;

// jsdom does not load Tailwind; mirror the rule that hides inactive tab panels.
const panelCss = document.createElement("style");
panelCss.textContent = '[role="tabpanel"][data-state="inactive"] { display: none; }';
document.head.append(panelCss);

beforeEach(() => {
  vi.unstubAllGlobals();
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ state: { plans: { [plan.id]: plan } }, version: 1 }),
  );
  usePlanStore.setState({
    draft: { ...DEFAULT_DRAFT },
    step: 0,
    plans: { [plan.id]: plan },
  });
});

describe("Plan dashboard shell", () => {
  it("shows the plan with a countdown and five tabs", async () => {
    renderDashboard();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Maya turns 7" }),
    ).toBeInTheDocument();
    expect(screen.getByText("days to go")).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Overview",
      "Budget",
      "Timeline",
      "Vendors",
      "Ideas",
    ]);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { level: 2, name: "At a glance" })).toBeVisible();
  });

  it("opens the tab named in the URL hash and keeps the hash in sync", async () => {
    const user = renderDashboard("#vendors");
    expect(await screen.findByRole("tab", { name: "Vendors" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(screen.getByRole("tab", { name: "Ideas" }));
    expect(window.location.hash).toBe("#ideas");
    expect(screen.getByRole("heading", { level: 2, name: "Ideas" })).toBeVisible();
  });

  it("explains when a plan is not in this browser", async () => {
    usePlanStore.setState({ plans: {} });
    renderDashboard();
    expect(
      await screen.findByRole("heading", { name: "We couldn’t find that plan." }),
    ).toBeInTheDocument();
  });
});

describe("Budget panel", () => {
  it("updates totals live as amounts are typed, and warns about overspending", async () => {
    const user = renderDashboard("#budget");
    await screen.findByRole("heading", { level: 2, name: "Budget" });
    expect(figure("Planned")).toBe("₹40,000");

    const venue = screen.getByRole("textbox", { name: "Planned for Venue" });
    await user.clear(venue);
    await user.type(venue, "10000");
    const venueBefore = plan.budget.find((b) => b.category === "venue")!.allocated;
    expect(figure("Planned")).toBe(
      `₹${(40_000 - venueBefore + 10_000).toLocaleString("en-IN")}`,
    );
    expect(stored().budget.find((b) => b.category === "venue")?.allocated).toBe(10_000);

    const decorPlanned = plan.budget.find((b) => b.category === "decor")!.allocated;
    await user.type(
      screen.getByRole("textbox", { name: "Spent on Décor" }),
      String(decorPlanned + 500),
    );
    expect(figure("Spent so far")).toBe(
      `₹${(decorPlanned + 500).toLocaleString("en-IN")}`,
    );
    expect(screen.getByText("Over by ₹500")).toBeInTheDocument();
    expect(
      within(screen.getByRole("tabpanel")).getByText(/One line is over plan/),
    ).toBeInTheDocument();
  });

  it("flags text that is not a number without saving it", async () => {
    const user = renderDashboard("#budget");
    const venue = await screen.findByRole("textbox", { name: "Planned for Venue" });
    await user.clear(venue);
    await user.type(venue, "2.5L");
    expect(venue).toHaveAttribute("aria-invalid", "true");
    expect(venue).toHaveAccessibleDescription(/Use digits only/);
  });

  it("rebalances unlocked lines around a locked one", async () => {
    const user = renderDashboard("#budget");
    const venue = await screen.findByRole("textbox", { name: "Planned for Venue" });
    await user.clear(venue);
    await user.type(venue, "20000");
    const lock = screen.getByRole("button", { name: "Lock Venue" });
    await user.click(lock);
    expect(lock).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Rebalance unlocked lines" }));

    const budget = stored().budget;
    expect(budget.find((b) => b.category === "venue")?.allocated).toBe(20_000);
    expect(budget.reduce((sum, b) => sum + b.allocated, 0)).toBe(40_000);
    expect(figure("Planned")).toBe("₹40,000");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/Budget rebalanced/),
    );
  });
});

describe("Vendors panel", () => {
  it("moves a vendor along and feeds its quote into the budget", async () => {
    const user = renderDashboard("#vendors");
    await screen.findByRole("heading", { level: 2, name: "Vendors" });
    const venueCard = screen.getByRole("heading", { name: "Venue" }).closest("li")!;
    const card = within(venueCard as HTMLElement);

    await user.selectOptions(card.getByRole("combobox", { name: "Status" }), "booked");
    expect(stored().vendors[0]?.status).toBe("booked");
    expect(screen.getAllByText(/1 of 7 booked/).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Venue: Booked."),
    );

    await user.type(card.getByRole("textbox", { name: "Quote" }), "9,000");
    expect(stored().vendors[0]?.quote).toBe(9000);

    await user.click(screen.getByRole("tab", { name: "Budget" }));
    expect(figure("Spent so far")).toBe("₹9,000");
    expect(screen.getByText("from vendor quotes")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Spent on Venue" })).toBeNull();
  });
});

describe("Timeline panel", () => {
  it("ticks a task and announces what is left", async () => {
    const user = renderDashboard("#timeline");
    const first = plan.timeline[0]!;
    const box = await screen.findByRole("checkbox", { name: first.title });
    await user.click(box);
    expect(box).toBeChecked();
    expect(stored().timeline.find((t) => t.id === first.id)?.done).toBe(true);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        `Done: ${first.title}. ${plan.timeline.length - 1} tasks to go.`,
      ),
    );
  });

  it("validates, adds, and deletes a task with undo", async () => {
    const user = renderDashboard("#timeline");
    await user.click(await screen.findByRole("button", { name: "Add a task" }));
    const title = screen.getByRole("textbox", { name: /^Task/ });
    expect(title).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveFocus();

    await user.type(title, "Collect the balloons");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(
      screen.getByRole("checkbox", { name: "Collect the balloons" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a task" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Delete Collect the balloons" }));
    expect(screen.queryByRole("checkbox", { name: "Collect the balloons" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen.getByRole("checkbox", { name: "Collect the balloons" }),
    ).toBeInTheDocument();
  });

  it("shows the day-of run sheet", async () => {
    const user = renderDashboard("#timeline");
    await user.click(await screen.findByRole("radio", { name: "Day-of run sheet" }));
    expect(screen.getByRole("heading", { name: "Run sheet for the day" })).toBeVisible();
  });
});

describe("Refine with AI", () => {
  const refined: Plan = {
    ...plan,
    totalBudget: 34_000,
    budget: scaleBudget(plan.budget, 34_000),
  };
  const reply = {
    explanation: "Lowers the total budget by 15% and scales every category to match.",
    plan: refined,
    changes: diffPlans(plan, refined),
  };

  it("previews changes, then discards or applies them", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(reply), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = renderDashboard();
    await user.click(await screen.findByRole("button", { name: "Refine with AI" }));
    const dialog = screen.getByRole("dialog", { name: "Refine with AI" });
    const input = within(dialog).getByRole("textbox", { name: "What should change?" });
    await waitFor(() => expect(input).toHaveFocus());

    await user.click(
      within(dialog).getByRole("button", { name: "Cut the budget by 15%" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Suggest changes" }));
    expect(await within(dialog).findByText(reply.explanation)).toBeInTheDocument();
    expect(
      within(dialog).getByText("Total budget: ₹40,000 to ₹34,000"),
    ).toBeInTheDocument();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as unknown;
    expect(body).toMatchObject({
      instruction: "Cut the budget by 15%",
      plan: { id: plan.id },
    });

    await user.click(within(dialog).getByRole("button", { name: "Discard" }));
    expect(stored().totalBudget).toBe(40_000);
    await waitFor(() => expect(input).toHaveFocus());

    await user.click(within(dialog).getByRole("button", { name: "Suggest changes" }));
    await user.click(
      await within(dialog).findByRole("button", { name: "Apply changes" }),
    );
    expect(stored().totalBudget).toBe(34_000);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Refine with AI" })).toHaveFocus(),
    );
  });

  it("asks for an instruction and shows server errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: "rate-limited", message: "Too many requests." },
            }),
            { status: 429 },
          ),
      ),
    );
    const user = renderDashboard();
    await user.click(await screen.findByRole("button", { name: "Refine with AI" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Suggest changes" }));
    const input = within(dialog).getByRole("textbox", { name: "What should change?" });
    expect(input).toHaveAccessibleDescription(/Tell Festivo what to change/);

    await user.type(input, "make it cheaper");
    await user.click(within(dialog).getByRole("button", { name: "Suggest changes" }));
    expect(await within(dialog).findByText("Too many requests.")).toBeInTheDocument();
    expect(stored()).toEqual(plan);
  });
});

describe("Ideas panel", () => {
  it("saves and dismisses ideas, and adds more for one category", async () => {
    const extra = {
      id: "idea-new",
      category: "food" as const,
      title: "Mango lassi bar",
      description: "Cups of chilled lassi with three flavours.",
      costTier: 1 as const,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ ideas: [extra] }), { status: 200 }),
      ),
    );
    const user = renderDashboard("#ideas");
    const idea = plan.ideas[0]!;
    await screen.findByRole("heading", { level: 2, name: "Ideas" });
    const save = await screen.findByRole("button", { name: `Save ${idea.title}` });
    await user.click(save);
    expect(save).toHaveAttribute("aria-pressed", "true");
    expect(stored().ideas[0]?.saved).toBe(true);

    await user.click(screen.getByRole("button", { name: `Dismiss ${idea.title}` }));
    expect(screen.queryByRole("heading", { name: idea.title })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show dismissed (1)" }));
    expect(
      screen.getByRole("button", { name: `Restore ${idea.title}` }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "More like this for Food & drinks" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Mango lassi bar" }),
    ).toBeInTheDocument();
    expect(stored().ideas.some((i) => i.title === "Mango lassi bar")).toBe(true);
  });
});
