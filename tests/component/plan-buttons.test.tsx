import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArchButton } from "@/components/landing/ArchButton";
import { DiyaButton } from "@/components/landing/DiyaButton";
import { LightsButton } from "@/components/landing/LightsButton";
import { ToranButton } from "@/components/landing/ToranButton";
import { PRESS_MS } from "@/components/landing/usePressToGo";
import { REDUCED_MOTION_QUERY } from "@/lib/prefs/preferences";
import { resetMotionStore } from "@/lib/prefs/store";
import { mockMatchMedia } from "../setup/component";

const push = vi.fn();
const prefetch = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, prefetch }) }));

type PlanButton = ComponentType<{ href: string; children: string }>;

/** [name, component, how long its click animation plays]. */
const BUTTONS: [string, PlanButton, number][] = [
  ["ArchButton", ArchButton, PRESS_MS],
  ["DiyaButton", DiyaButton, PRESS_MS],
  ["LightsButton", LightsButton, PRESS_MS],
  ["ToranButton", ToranButton, 640],
];

beforeEach(() => {
  vi.useFakeTimers();
  push.mockReset();
  prefetch.mockReset();
  resetMotionStore();
  mockMatchMedia();
});

afterEach(() => vi.useRealTimers());

const link = () => screen.getByRole("link", { name: "Start planning" });

describe.each(BUTTONS)("%s", (_, Button, delay) => {
  it("is a plain link whose only accessible name is its words", () => {
    render(<Button href="/plan/new">Start planning</Button>);
    expect(link()).toHaveAttribute("href", "/plan/new");
    expect(link()).toHaveAccessibleName("Start planning");
  });

  it("plays its animation, then opens the page once", () => {
    render(<Button href="/plan/new">Start planning</Button>);
    fireEvent.click(link());
    fireEvent.click(link()); // a second click while pressed is ignored
    expect(link()).toHaveAttribute("data-pressed", "true");
    act(() => {
      vi.advanceTimersByTime(delay - 1);
    });
    expect(push).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(push).toHaveBeenCalledExactlyOnceWith("/plan/new");
  });

  it("opens at once, with no animation, when the device asks for less motion", () => {
    mockMatchMedia({ [REDUCED_MOTION_QUERY]: true });
    render(<Button href="/plan/new">Start planning</Button>);
    expect(fireEvent.click(link())).toBe(true); // the link's own navigation goes ahead
    expect(link()).not.toHaveAttribute("data-pressed");
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves new-tab clicks to the browser", () => {
    render(<Button href="/plan/new">Start planning</Button>);
    expect(fireEvent.click(link(), { ctrlKey: true })).toBe(true);
    expect(fireEvent.click(link(), { metaKey: true })).toBe(true);
    expect(link()).not.toHaveAttribute("data-pressed");
  });
});
