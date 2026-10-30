/**
 * The wizard's adaptive questions: what appears for online, multi-day, ticketed
 * and children's occasions, and how the review summarises those answers.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { StepBasics } from "@/components/wizard/StepBasics";
import { StepBudget } from "@/components/wizard/StepBudget";
import {
  ReviewSummary,
  describeDate,
  describeTickets,
} from "@/components/wizard/StepReview";
import type { StepProps } from "@/components/wizard/types";
import { addDays, todayIso } from "@/lib/timeline/dates";
import { DEFAULT_DRAFT, upcomingMonths, type WizardDraft } from "@/lib/wizard/draft";

const today = todayIso(new Date(), "UTC");

const draftFor = (patch: Partial<WizardDraft>): WizardDraft => ({
  ...DEFAULT_DRAFT,
  name: "Test event",
  location: "Pune",
  guestCount: "80",
  budgetTotal: "100000",
  date: addDays(today, 90),
  ...patch,
});

/** Renders one step with real state, so answers change what the step shows. */
function renderStep(Step: ComponentType<StepProps>, initial: WizardDraft) {
  let latest = initial;
  function Harness() {
    const [draft, setDraft] = useState(initial);
    latest = draft;
    return (
      <Step
        draft={draft}
        errors={{}}
        today={today}
        update={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      />
    );
  }
  render(<Harness />);
  return { user: userEvent.setup(), draft: () => latest };
}

const value = (term: string) =>
  screen.getByText(term, { selector: "dt" }).nextElementSibling?.textContent;

describe("basics step", () => {
  it("asks how people join, and an online meetup needs a time zone, not a venue", async () => {
    const { user, draft } = renderStep(
      StepBasics,
      draftFor({ group: "meetup", occasion: "tech-meetup", eventType: "community" }),
    );
    const formats = screen.getByRole("group", { name: /How will people join/ });
    expect(
      within(formats)
        .getAllByRole("radio")
        .map((r) => r.closest("label")?.textContent),
    ).toEqual(["In person", "Online", "Hybrid"]);
    expect(screen.getByRole("textbox", { name: /Expected attendees/ })).toBeVisible();

    await user.click(within(formats).getByRole("radio", { name: "Online" }));
    expect(draft().format).toBe("online");
    expect(screen.getByRole("textbox", { name: /City or time zone/ })).toBeVisible();
  });

  it("asks for the number of days only for occasions that can run longer", async () => {
    const { user, draft } = renderStep(
      StepBasics,
      draftFor({ group: "life", occasion: "wedding", eventType: "wedding" }),
    );
    const days = screen.getByRole("textbox", { name: /How many days/ });
    await user.clear(days);
    await user.type(days, "3");
    expect(draft().days).toBe("3");
    expect(screen.queryByRole("group", { name: /Will children be there/ })).toBeNull();
  });

  it("asks a birthday for the age, and a family festival whether children are coming", async () => {
    const birthday = renderStep(
      StepBasics,
      draftFor({ group: "life", occasion: "birthday", eventType: "birthday" }),
    );
    await birthday.user.type(
      screen.getByRole("textbox", { name: /Age being celebrated/ }),
      "7",
    );
    expect(birthday.draft().ageTurning).toBe("7");
    expect(screen.queryByRole("group", { name: /Will children be there/ })).toBeNull();
    cleanup();

    const { user, draft } = renderStep(
      StepBasics,
      draftFor({ group: "festival", occasion: "diwali", eventType: "community" }),
    );
    expect(screen.queryByRole("textbox", { name: /Age being celebrated/ })).toBeNull();
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    expect(draft().kids).toBe(true);
    await user.click(screen.getByRole("radio", { name: "No, adults only" }));
    expect(draft().kids).toBe(false);
    expect(screen.queryByRole("textbox", { name: /How many days/ })).toBeNull();
  });

  it("swaps the date for a month when the date is flexible", async () => {
    const { user, draft } = renderStep(
      StepBasics,
      draftFor({ group: "life", occasion: "birthday", eventType: "birthday" }),
    );
    await user.click(screen.getByRole("radio", { name: "My date is flexible" }));
    expect(draft().dateKind).toBe("flexible");
    const month = screen.getByRole("combobox", { name: /Preferred month/ });
    const third = upcomingMonths(today)[2];
    await user.selectOptions(month, third?.value ?? "");
    expect(draft().month).toBe(third?.value);
  });
});

describe("budget step", () => {
  it("asks ticketed occasions about registration, price, spots and approval", async () => {
    const { user, draft } = renderStep(
      StepBudget,
      draftFor({ group: "meetup", occasion: "tech-meetup", eventType: "community" }),
    );
    expect(screen.queryByRole("textbox", { name: /Price per ticket/ })).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Paid tickets" }));
    await user.type(screen.getByRole("textbox", { name: /Price per ticket/ }), "499");
    await user.type(screen.getByRole("textbox", { name: /Spots available/ }), "80");
    await user.click(screen.getByRole("checkbox", { name: "I approve each guest" }));
    expect(draft()).toMatchObject({
      tickets: "paid",
      ticketPrice: "499",
      capacity: "80",
      approval: true,
    });

    await user.click(screen.getByRole("radio", { name: "No registration" }));
    expect(screen.queryByRole("textbox", { name: /Spots available/ })).toBeNull();
  });

  it("never asks a wedding about tickets", () => {
    renderStep(StepBudget, draftFor({ group: "life", occasion: "wedding" }));
    expect(screen.queryByRole("group", { name: /Will guests register/ })).toBeNull();
    expect(screen.getByRole("textbox", { name: /Total budget/ })).toBeVisible();
  });
});

describe("review", () => {
  it("summarises an online, ticketed, multi-day event without venue questions", () => {
    const draft = draftFor({
      group: "meetup",
      occasion: "tech-meetup",
      eventType: "community",
      format: "online",
      tickets: "paid",
      ticketPrice: "499",
      capacity: "80",
      approval: true,
      priorities: { venue: 5 },
    });
    render(<ReviewSummary draft={draft} today={today} onEdit={() => {}} />);
    expect(value("Format")).toBe("Online");
    expect(value("Tickets")).toBe("₹499, 80 spots, you approve each guest");
    expect(screen.queryByText("Dietary", { selector: "dt" })).toBeNull();
    expect(screen.queryByText("Setting", { selector: "dt" })).toBeNull();
  });

  it("shows a wedding's days and functions, a birthday's age and a festival's children", () => {
    const { unmount } = render(
      <ReviewSummary
        draft={draftFor({
          group: "life",
          occasion: "wedding",
          eventType: "wedding",
          days: "3",
          ceremonies: ["mehendi", "sangeet"],
        })}
        today={today}
        onEdit={() => {}}
      />,
    );
    expect(value("Days")).toBe("3");
    expect(value("Functions")).toMatch(/Mehendi/);
    unmount();

    const birthday = render(
      <ReviewSummary
        draft={draftFor({
          group: "life",
          occasion: "birthday",
          eventType: "birthday",
          ageTurning: "7",
        })}
        today={today}
        onEdit={() => {}}
      />,
    );
    expect(value("Turning")).toBe("7");
    birthday.unmount();

    render(
      <ReviewSummary
        draft={draftFor({ group: "festival", occasion: "diwali", kids: true })}
        today={today}
        onEdit={() => {}}
      />,
    );
    expect(value("Children")).toBe("Yes");
  });

  it("describes free and capped registration, and flexible dates", () => {
    const base = draftFor({});
    expect(describeTickets({ ...base, tickets: "none" })).toBe("No registration");
    expect(describeTickets({ ...base, tickets: "free", capacity: "" })).toBe(
      "Free, with registration, no limit",
    );
    expect(describeDate({ ...base, dateKind: "flexible", month: "" }, today)).toBe(
      "Flexible",
    );
    const month = upcomingMonths(today)[1];
    expect(
      describeDate({ ...base, dateKind: "flexible", month: month?.value ?? "" }, today),
    ).toBe(`Flexible, around ${month?.label}`);
    expect(describeDate({ ...base, date: "" }, today)).toBe("Not set");
  });
});
