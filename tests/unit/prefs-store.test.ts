// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prefersReducedMotionNow, resetMotionStore } from "@/lib/prefs/store";

type Listener = (event: { matches: boolean }) => void;

/** matchMedia stub whose result can be flipped later to simulate an OS change. */
function installMatchMedia(initial: boolean) {
  const listeners: Listener[] = [];
  window.matchMedia = ((query: string) => ({
    matches: initial,
    media: query,
    addEventListener: (_: string, cb: Listener) => listeners.push(cb),
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  return (matches: boolean) => listeners.forEach((l) => l({ matches }));
}

const root = document.documentElement;

beforeEach(() => resetMotionStore());
afterEach(() => resetMotionStore());

describe("motion store", () => {
  it("animates unless the device asks for reduced motion", () => {
    installMatchMedia(false);
    expect(prefersReducedMotionNow()).toBe(false);
    resetMotionStore();
    installMatchMedia(true);
    expect(prefersReducedMotionNow()).toBe(true);
  });

  it("ignores any choice saved by the old in-site switch", () => {
    installMatchMedia(false);
    localStorage.setItem("festivo:prefs", '{"reduceMotion":true}');
    expect(prefersReducedMotionNow()).toBe(false);
    localStorage.clear();
  });

  it("follows the device setting as it changes and updates <html>", () => {
    const flip = installMatchMedia(false);
    prefersReducedMotionNow();
    flip(true);
    expect(prefersReducedMotionNow()).toBe(true);
    expect(root.dataset.motion).toBe("reduce");
    flip(false);
    expect(root.dataset.motion).toBe("full");
  });
});
