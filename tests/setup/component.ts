import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// The dashboard loads its tabs, sheets and menus as lazy chunks. Under a full,
// parallel run with coverage, a first chunk load can pass the 1 s default, so
// findBy and waitFor get 5 s. A real failure still fails, just not early.
configure({ asyncUtilTimeout: 5_000 });

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
