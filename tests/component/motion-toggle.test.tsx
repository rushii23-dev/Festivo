import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MotionToggle } from "@/components/a11y/MotionToggle";
import { PREFS_STORAGE_KEY } from "@/lib/prefs/preferences";
import { resetPreferencesStore } from "@/lib/prefs/store";
import { mockMatchMedia } from "../setup/component";

const root = document.documentElement;

beforeEach(() => {
  resetPreferencesStore();
  mockMatchMedia();
});

describe("MotionToggle", () => {
  it("toggles reduce motion and saves the choice", async () => {
    const user = userEvent.setup();
    render(<MotionToggle />);
    const toggle = screen.getByRole("switch", { name: "Reduce motion" });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(root.dataset.motion).toBe("reduce");
    expect(localStorage.getItem(PREFS_STORAGE_KEY)).toContain('"reduceMotion":true');
    await user.click(toggle);
    expect(root.dataset.motion).toBe("full");
  });

  it("can be operated with the keyboard", async () => {
    const user = userEvent.setup();
    render(<MotionToggle />);
    await user.tab();
    const toggle = screen.getByRole("switch", { name: "Reduce motion" });
    expect(toggle).toHaveFocus();
    await user.keyboard(" ");
    expect(toggle).toBeChecked();
  });

  it("locks reduce motion on when the device asks for it", () => {
    mockMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    render(<MotionToggle />);
    const toggle = screen.getByRole("switch", { name: "Reduce motion" });
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAccessibleDescription(
      "On because your device asks for less motion.",
    );
  });
});
