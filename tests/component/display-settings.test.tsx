import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { DisplaySettings } from "@/components/layout/DisplaySettings";
import { PREFS_STORAGE_KEY } from "@/lib/prefs/preferences";
import { resetPreferencesStore } from "@/lib/prefs/store";
import { mockMatchMedia } from "../setup/component";

const root = document.documentElement;

beforeEach(() => {
  resetPreferencesStore();
  mockMatchMedia();
});

async function openSettings() {
  const user = userEvent.setup();
  render(<DisplaySettings />);
  await user.click(screen.getByRole("button", { name: "Display settings" }));
  return user;
}

describe("DisplaySettings", () => {
  it("opens with keyboard and returns focus to the trigger on Escape", async () => {
    const user = userEvent.setup();
    render(<DisplaySettings />);
    const trigger = screen.getByRole("button", { name: "Display settings" });
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("switches theme and saves the choice", async () => {
    const user = await openSettings();
    expect(screen.getByRole("radio", { name: "Match my device" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem(PREFS_STORAGE_KEY)).toContain('"theme":"dark"');
  });

  it("toggles reduce motion", async () => {
    const user = await openSettings();
    const toggle = screen.getByRole("switch", { name: "Reduce motion" });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(root.dataset.motion).toBe("reduce");
    await user.click(toggle);
    expect(root.dataset.motion).toBe("full");
  });

  it("locks reduce motion on when the device asks for it", async () => {
    mockMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    await openSettings();
    const toggle = screen.getByRole("switch", { name: "Reduce motion" });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAccessibleDescription(
      "On because your device asks for less motion.",
    );
  });
});
