/**
 * The timeline and overview panels on their own, with real state, so editing,
 * the run sheet, overdue notes and the overview's states are tested quickly
 * without the whole dashboard around them. Also the dashboard's API client.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import { postJson } from "@/components/plan/client";
import { OverviewPanel } from "@/components/plan/OverviewPanel";
import { TimelinePanel } from "@/components/plan/TimelinePanel";
import { buildMockPlan } from "@/lib/fixtures/buildMockPlan";
import { EventInputSchema } from "@/lib/schemas/eventInput";
import type { Plan, TimelineTask } from "@/lib/schemas/plan";
import { addDays, todayIso } from "@/lib/timeline/dates";

afterEach(() => vi.unstubAllGlobals());

const today = todayIso(new Date(), "UTC");
const basePlan = buildMockPlan(
  EventInputSchema.parse({
    eventType: "birthday",
    name: "Maya turns 7",
    date: { kind: "fixed", date: addDays(today, 60) },
    location: "Pune",
    guestCount: 25,
    budget: { total: 40_000, currency: "INR" },
  }),
  { id: "plan-panels", today, now: new Date() },
);

/** Renders a panel with real plan state; `latest()` returns the plan after edits. */
function renderWithPlan(
  panel: (props: {
    plan: Plan;
    today: string;
    update: (edit: (p: Plan) => Plan) => void;
  }) => React.ReactNode,
  initial: Plan = basePlan,
) {
  let latest = initial;
  function Harness() {
    const [plan, setPlan] = useState(initial);
    latest = plan;
    return <>{panel({ plan, today, update: (edit) => setPlan((p) => edit(p)) })}</>;
  }
  render(
    <AnnouncerProvider>
      <Harness />
    </AnnouncerProvider>,
  );
  return { user: userEvent.setup(), latest: () => latest };
}

const firstTask = () => {
  const task = basePlan.timeline.find((t) => t.phase !== "Day of" && t.phase !== "After");
  if (!task) throw new Error("The fixture has no prep task.");
  return task;
};

describe("timeline panel", () => {
  it("edits a task in place and returns focus to its edit button", async () => {
    const task = firstTask();
    const { user, latest } = renderWithPlan((props) => <TimelinePanel {...props} />);
    await user.click(screen.getByRole("button", { name: `Edit ${task.title}` }));
    const form = screen.getByRole("form", { name: "Save task" });
    const title = within(form).getByRole("textbox", { name: /^Task/ });
    expect(title).toHaveFocus();
    await user.clear(title);
    await user.click(within(form).getByRole("button", { name: "Save task" }));
    expect(title).toHaveAttribute("aria-invalid", "true");

    await user.paste("Order the birthday cake");
    await user.click(within(form).getByRole("button", { name: "Save task" }));
    expect(screen.queryByRole("form", { name: "Save task" })).toBeNull();
    expect(latest().timeline.find((t) => t.id === task.id)?.title).toBe(
      "Order the birthday cake",
    );
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Edit Order the birthday cake" }),
      ).toHaveFocus(),
    );
  });

  it("cancels an edit without saving and closes the add form when editing starts", async () => {
    const task = firstTask();
    const { user, latest } = renderWithPlan((props) => <TimelinePanel {...props} />);
    await user.click(screen.getByRole("button", { name: "Add a task" }));
    expect(screen.getByRole("form", { name: "Add task" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `Edit ${task.title}` }));
    expect(screen.queryByRole("form", { name: "Add task" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form", { name: "Save task" })).toBeNull();
    expect(latest()).toEqual(basePlan);
  });

  it("marks an unfinished task that is past its date as overdue", () => {
    const task = firstTask();
    const overdue: TimelineTask = { ...task, dueDate: addDays(today, -2), done: false };
    renderWithPlan((props) => <TimelinePanel {...props} />, {
      ...basePlan,
      timeline: basePlan.timeline.map((t) => (t.id === task.id ? overdue : t)),
    });
    const row = screen.getByRole("checkbox", { name: task.title }).closest("li");
    expect(row).toHaveTextContent("Overdue");
  });

  it("lists the day's timed tasks in the run sheet and ticks them off", async () => {
    const dayOf: TimelineTask = {
      ...firstTask(),
      id: "task-cake-cutting",
      title: "Cut the cake",
      phase: "Day of",
      dueDate: basePlan.date,
      time: "17:30",
      done: false,
    };
    const { user, latest } = renderWithPlan((props) => <TimelinePanel {...props} />, {
      ...basePlan,
      timeline: [...basePlan.timeline, dayOf],
    });
    await user.click(screen.getByRole("radio", { name: "Day-of run sheet" }));
    const sheet = screen.getByRole("region", { name: "Run sheet for the day" });
    expect(sheet).toHaveTextContent("17:30");
    await user.click(within(sheet).getByRole("checkbox", { name: "Cut the cake" }));
    expect(latest().timeline.find((t) => t.id === dayOf.id)?.done).toBe(true);
  });
});

describe("overview panel", () => {
  it("shows what is next and sends the planner to the timeline and vendors", async () => {
    const onNavigate = vi.fn();
    const { user } = renderWithPlan((props) => (
      <OverviewPanel {...props} onNavigate={onNavigate} />
    ));
    expect(screen.getByRole("heading", { name: "Up next" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByText(basePlan.summary)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open the full timeline" }));
    await user.click(screen.getByRole("button", { name: "Track vendors" }));
    expect(onNavigate.mock.calls).toEqual([["timeline"], ["vendors"]]);
  });

  it("celebrates a finished timeline and warns when spending passes the budget", () => {
    renderWithPlan((props) => <OverviewPanel {...props} onNavigate={() => {}} />, {
      ...basePlan,
      timeline: basePlan.timeline.map((t) => ({ ...t, done: true })),
      budget: basePlan.budget.map((item, i) =>
        i === 0 ? { ...item, actual: basePlan.totalBudget * 2 } : item,
      ),
    });
    expect(screen.getByText(/Every task is ticked off/)).toBeInTheDocument();
    expect(screen.getByText(/more than planned\./)).toBeInTheDocument();
  });
});

describe("dashboard API client", () => {
  it("returns the data, the server's message, or a network message", async () => {
    const reply = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ideas: [] }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Too many requests." } }), {
          status: 429,
        }),
      )
      .mockResolvedValueOnce(new Response("not json", { status: 500 }))
      .mockRejectedValueOnce(new TypeError("offline"));
    vi.stubGlobal("fetch", reply);
    expect(await postJson("/api/ideas", {})).toEqual({ ok: true, data: { ideas: [] } });
    expect(await postJson("/api/ideas", {})).toEqual({
      ok: false,
      message: "Too many requests.",
    });
    expect(await postJson("/api/ideas", {})).toMatchObject({ ok: false });
    expect(await postJson("/api/ideas", {})).toMatchObject({
      ok: false,
      message: expect.stringMatching(/couldn't reach Festivo/) as unknown,
    });
  });

  it("lets a cancelled request stay cancelled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );
    await expect(postJson("/api/refine", {})).rejects.toThrow("aborted");
  });
});
