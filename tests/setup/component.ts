import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-motion");
});

/** jsdom has no matchMedia; tests opt into specific media results via `mockMatchMedia`. */
export function mockMatchMedia(matches: Record<string, boolean> = {}) {
  const impl = (query: string): MediaQueryList => ({
    matches: matches[query] ?? false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: impl });
}

mockMatchMedia();
