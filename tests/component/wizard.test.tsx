import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import { Wizard } from "@/components/wizard/Wizard";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { STORE_KEY, storage, usePlanStore } from "@/lib/store/planStore";
import { addDays, todayIso } from "@/lib/timeline/dates";
import { DEFAULT_DRAFT, toEventInput, type WizardDraft } from "@/lib/wizard/draft";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const eventDate = addDays(todayIso(), 120);
const completeDraft: WizardDraft = {
  ...DEFAULT_DRAFT,
  eventType: "birthday",
  name: "Maya turns 7",
  date: eventDate,
  location: "Pune",
  guestCount: "25",
  budgetTotal: "40000",
  vibes: ["kid-friendly"],
};

function renderWizard() {
  const user = userEvent.setup();
  render(
    <AnnouncerProvider>
      <Wizard />
    </AnnouncerProvider>,
  );
  return user;
}

function ndjson(lines: unknown[], status = 200) {
  const body = lines.map((l) => `${JSON.stringify(l)}\n`).join("");
  return new Response(body, {
    status,
    headers: { "content-type": "application/x-ndjson" },
  });
}

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
  usePlanStore.setState({ draft: { ...DEFAULT_DRAFT }, step: 0, plans: {} });
  vi.unstubAllGlobals();
});

describe("Wizard navigation and validation", () => {
  it("blocks Next until an event type is chosen, focusing the first option", async () => {
    const user = renderWizard();
    await screen.findByRole("heading", { name: "What are you celebrating?" });
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    const group = screen.getByRole("group", { name: /Event type/ });
    expect(group).toHaveAccessibleDescription(/Choose the kind of event/);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /Wedding/ })).toHaveFocus(),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("1 answer needs attention."),
    );
  });

  it("is fully operable by keyboard and moves focus to each new step heading", async () => {
    const user = renderWizard();
    await screen.findByRole("heading", { name: "What are you celebrating?" });

    screen.getByRole("radio", { name: /Wedding/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /Birthday/ })).toBeChecked();

    screen.getByRole("button", { name: "Next" }).focus();
    await user.keyboard("{Enter}");
    const heading = await screen.findByRole("heading", { name: "The basics" });
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("links errors to fields and focuses the first invalid one", async () => {
    usePlanStore.setState({ draft: { ...DEFAULT_DRAFT, eventType: "wedding" }, step: 1 });
    const user = renderWizard();
    await screen.findByRole("heading", { name: "The basics" });
    await user.type(screen.getByRole("textbox", { name: /City or place/ }), "Jaipur");
    await user.click(screen.getByRole("button", { name: "Next" }));

    const name = screen.getByRole("textbox", { name: /Event name/ });
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(/Give your event a name/);
    expect(screen.getByLabelText(/Event date/)).toHaveAccessibleDescription(
      /Pick a date/,
    );
    expect(screen.getByRole("textbox", { name: /City or place/ })).not.toHaveAttribute(
      "aria-invalid",
    );
    expect(screen.getByText(/Event name/).closest("label")).toHaveTextContent(
      "(required)",
    );

    // Fixing a field clears its error immediately.
    await user.type(name, "Priya & Arjun");
    expect(name).not.toHaveAttribute("aria-invalid");
  });

  it("switches to a month picker for flexible dates", async () => {
    usePlanStore.setState({ draft: { ...completeDraft, date: "" }, step: 1 });
    const user = renderWizard();
    await screen.findByRole("heading", { name: "The basics" });
    await user.click(screen.getByRole("radio", { name: "My date is flexible" }));
    expect(screen.queryByLabelText(/Event date/)).not.toBeInTheDocument();
    const month = screen.getByRole("combobox", { name: "Preferred month" });
    expect(within(month).getAllByRole("option").length).toBe(25);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { name: "Your budget" });
  });

  it("goes back without losing answers and can jump to completed steps", async () => {
    usePlanStore.setState({ draft: completeDraft, step: 2 });
    const user = renderWizard();
    await screen.findByRole("heading", { name: "Your budget" });
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("textbox", { name: /Event name/ })).toHaveValue(
      "Maya turns 7",
    );
    await user.click(screen.getByRole("button", { name: /Event type, completed/ }));
    expect(await screen.findByRole("radio", { name: /Birthday/ })).toBeChecked();
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent(
      "Event type",
    );
  });

  it("previews the budget split live as priorities change", async () => {
    usePlanStore.setState({ draft: { ...completeDraft, budgetTotal: "" }, step: 2 });
    const user = renderWizard();
    await screen.findByRole("heading", { name: "Your budget" });
    const cake = screen.getByRole("slider", { name: "Cake & desserts" });
    expect(cake).toHaveAttribute("aria-valuetext", "Balanced");

    await user.type(screen.getByRole("textbox", { name: /Total budget/ }), "40000");
    expect(cake).toHaveAttribute("aria-valuetext", "Balanced, about ₹4,000");

    // jsdom has no keyboard support for range inputs; browsers do (covered in e2e).
    fireEvent.change(cake, { target: { value: "5" } });
    expect(cake).toHaveAttribute(
      "aria-valuetext",
      expect.stringMatching(/^Spend more, about ₹/),
    );
    expect(usePlanStore.getState().draft.priorities.cake).toBe(5);
  });

  it("shows wedding functions only for weddings and counts free-text characters", async () => {
    usePlanStore.setState({ draft: { ...completeDraft, eventType: "wedding" }, step: 3 });
    const user = renderWizard();
    await screen.findByRole("heading", { name: "Vibe and style" });
    await user.click(screen.getByRole("checkbox", { name: "Sangeet" }));
    expect(usePlanStore.getState().draft.ceremonies).toEqual(["sangeet"]);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByRole("heading", { name: "Needs and limits" });
    const mustHaves = screen.getByRole("textbox", { name: "Must-haves" });
    await user.type(mustHaves, "Live dhol");
    expect(mustHaves).toHaveAccessibleDescription(/9 of 500 characters/);
    await user.click(screen.getByRole("checkbox", { name: "Jain" }));
    await user.click(screen.getByRole("radio", { name: "Outdoors" }));
    expect(usePlanStore.getState().draft).toMatchObject({
      dietary: ["jain"],
      setting: "outdoor",
    });
  });
});

describe("Wizard persistence", () => {
  it("saves answers to localStorage and restores them after a reload", async () => {
    usePlanStore.setState({
      draft: { ...DEFAULT_DRAFT, eventType: "birthday" },
      step: 1,
    });
    const user = renderWizard();
    await user.type(
      await screen.findByRole("textbox", { name: /Event name/ }),
      "Surprise party",
    );
    act(() => storage.flush());
    expect(localStorage.getItem(STORE_KEY)).toContain("Surprise party");

    // A reload starts from defaults in memory, then rehydrates from storage.
    const saved = localStorage.getItem(STORE_KEY) ?? "";
    act(() => usePlanStore.setState({ draft: { ...DEFAULT_DRAFT }, step: 0 }));
    act(() => storage.flush());
    localStorage.setItem(STORE_KEY, saved);
    await act(() => usePlanStore.persist.rehydrate());
    expect(await screen.findByRole("textbox", { name: /Event name/ })).toHaveValue(
      "Surprise party",
    );
  });
});

describe("Wizard generation", () => {
  const input = toEventInput(completeDraft);
  if (!input.ok) throw new Error("fixture draft must be valid");
  const plan = buildMockPlan(input.input, {
    id: "plan-abc",
    today: todayIso(),
    now: new Date(),
  });

  it("reviews answers, streams progress, saves the plan and navigates", async () => {
    const fetchMock = vi.fn(async () =>
      ndjson([
        { type: "progress", step: "start", message: "Reading your answers…" },
        { type: "progress", step: "budget", message: "Crunching your budget…" },
        { type: "progress", step: "timeline", message: "Drafting your timeline…" },
        { type: "plan", plan, cached: false },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    usePlanStore.setState({ draft: completeDraft, step: 5 });
    const user = renderWizard();

    await screen.findByRole("heading", { name: "Review and generate" });
    expect(screen.getByRole("region", { name: "Basics" })).toHaveTextContent(
      "Maya turns 7",
    );
    expect(screen.getByRole("region", { name: "Budget" })).toHaveTextContent("₹40,000");

    await user.click(screen.getByRole("button", { name: "Generate my plan" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plan/plan-abc"));
    expect(usePlanStore.getState().plans["plan-abc"]?.title).toBe("Maya turns 7");
    expect(usePlanStore.getState().draft).toEqual(DEFAULT_DRAFT);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/plan");
    expect(JSON.parse(String(init.body))).toMatchObject({
      input: { name: "Maya turns 7", guestCount: 25 },
    });
  });

  it("shows a retryable error from the stream and tries again", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        ndjson([
          {
            type: "error",
            code: "provider",
            message: "We couldn't reach the planning service.",
            retryable: true,
          },
        ]),
      )
      .mockResolvedValueOnce(ndjson([{ type: "plan", plan, cached: true }]));
    vi.stubGlobal("fetch", fetchMock);
    usePlanStore.setState({ draft: completeDraft, step: 5 });
    const user = renderWizard();

    await user.click(await screen.findByRole("button", { name: "Generate my plan" }));
    const alert = await screen.findByText("We couldn't reach the planning service.");
    expect(alert.closest("[role=alert]")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/plan/plan-abc"));
  });

  it("explains rate limiting from a 429 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "You're going a little fast." } },
          { status: 429 },
        ),
      ),
    );
    usePlanStore.setState({ draft: completeDraft, step: 5 });
    const user = renderWizard();
    await user.click(await screen.findByRole("button", { name: "Generate my plan" }));
    expect(await screen.findByText("You're going a little fast.")).toBeInTheDocument();
  });

  it("sends people back to the first incomplete step instead of generating", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    usePlanStore.setState({ draft: { ...completeDraft, budgetTotal: "" }, step: 5 });
    const user = renderWizard();
    await user.click(await screen.findByRole("button", { name: "Generate my plan" }));
    expect(
      await screen.findByRole("heading", { name: "Your budget" }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
