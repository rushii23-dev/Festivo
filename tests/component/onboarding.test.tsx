import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnnouncerProvider } from "@/components/a11y/LiveRegion";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { usePlanStore } from "@/lib/store/planStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { DEFAULT_DRAFT } from "@/lib/wizard/draft";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderOnboarding() {
  const user = userEvent.setup();
  render(
    <AnnouncerProvider>
      <AccountMenu />
      <main id="main">
        <Onboarding />
      </main>
    </AnnouncerProvider>,
  );
  return user;
}

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {}); // jsdom has no scrolling
  localStorage.clear();
  useProfileStore.setState({ profile: null });
  usePlanStore.setState({ draft: { ...DEFAULT_DRAFT }, step: 0, plans: {} });
});

describe("Onboarding", () => {
  it("asks for an account first and explains a missing name", async () => {
    const user = renderOnboarding();
    await screen.findByRole("heading", { level: 1, name: "Create your account" });

    await user.click(screen.getByRole("button", { name: "Create my account" }));
    const name = screen.getByRole("textbox", { name: /Your name/ });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(/Tell us your name/);
    await waitFor(() => expect(name).toHaveFocus());
  });

  it("flags a malformed email without losing the name", async () => {
    const user = renderOnboarding();
    await user.type(await screen.findByRole("textbox", { name: /Your name/ }), "Priya");
    await user.type(screen.getByRole("textbox", { name: /Email/ }), "priya@");
    await user.click(screen.getByRole("button", { name: "Create my account" }));
    const email = screen.getByRole("textbox", { name: /Email/ });
    expect(email).toHaveAccessibleDescription(/Use an email like/);
    await waitFor(() => expect(email).toHaveFocus());
    expect(screen.getByRole("textbox", { name: /Your name/ })).toHaveValue("Priya");
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it("welcomes the new planner by name, then opens a personal first question", async () => {
    const user = renderOnboarding();
    await user.type(
      await screen.findByRole("textbox", { name: /Your name/ }),
      "Priya Sharma",
    );
    await user.click(screen.getByRole("button", { name: "Create my account" }));

    const welcome = await screen.findByRole("heading", {
      level: 1,
      name: "Lovely to meet you, Priya.",
    });
    await waitFor(() => expect(welcome).toHaveFocus());
    expect(useProfileStore.getState().profile?.name).toBe("Priya Sharma");
    expect(screen.getByRole("button", { name: /Priya, your account/ })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Begin planning" }));
    const question = await screen.findByRole("heading", {
      name: "What are you celebrating, Priya?",
    });
    await waitFor(() => expect(question).toHaveFocus());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Plan a new event",
    );
  });

  it("sends returning planners straight to the wizard, and back after signing out", async () => {
    useProfileStore.setState({
      profile: { name: "Meera Iyer", email: "", createdAt: "2026-10-29T10:00:00.000Z" },
    });
    const user = renderOnboarding();
    await screen.findByRole("heading", { name: "What are you celebrating, Meera?" });

    await user.click(screen.getByRole("button", { name: /Meera, your account/ }));
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { level: 1, name: "Create your account" });
    expect(screen.queryByRole("button", { name: /your account/ })).toBeNull();
  });
});
