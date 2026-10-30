import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-motion");
});

/** jsdom has no matchMedia; tests opt into specific media results via `mockMatchMedia`. */
export function mockMatchMedia(matches: Record<string, boolean> = {}) {
  const impl = (query: string) =>
    ({
      matches: matches[query] ?? false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
      // The pre-2018 listener API, which GSAP still calls.
      ...{ addListener: vi.fn(), removeListener: vi.fn() },
    }) as unknown as MediaQueryList;
  Object.defineProperty(window, "matchMedia", { configurable: true, value: impl });
}

mockMatchMedia();
