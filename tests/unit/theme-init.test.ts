import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  DARK_SCHEME_QUERY,
  REDUCED_MOTION_QUERY,
  isMotionReduced,
  parsePreferences,
  resolveTheme,
} from "@/lib/prefs/preferences";

const script = readFileSync(join(process.cwd(), "public/theme-init.js"), "utf8");

/** Runs public/theme-init.js against a fake browser and returns what it set. */
function runInit(stored: string | null, media: { dark: boolean; reduce: boolean }) {
  const attrs: Record<string, string> = {};
  const style: Record<string, string> = {};
  runInNewContext(script, {
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => (attrs[name] = value),
        style,
      },
    },
    localStorage: { getItem: () => stored },
    matchMedia: (query: string) => ({
      matches:
        (query === DARK_SCHEME_QUERY && media.dark) ||
        (query === REDUCED_MOTION_QUERY && media.reduce),
    }),
  });
  return {
    theme: attrs["data-theme"],
    motion: attrs["data-motion"],
    scheme: style.colorScheme,
  };
}

const storedCases = [
  null,
  "garbage",
  '{"theme":"dark"}',
  '{"theme":"light","reduceMotion":true}',
  '{"theme":"system","reduceMotion":false}',
  '{"theme":"neon","reduceMotion":"yes"}',
];

describe("public/theme-init.js", () => {
  for (const stored of storedCases) {
    for (const dark of [false, true]) {
      for (const reduce of [false, true]) {
        it(`matches lib/prefs for stored=${stored} dark=${dark} reduce=${reduce}`, () => {
          const prefs = parsePreferences(stored);
          const expectedTheme = resolveTheme(prefs.theme, dark);
          const result = runInit(stored, { dark, reduce });
          expect(result.theme).toBe(expectedTheme);
          expect(result.scheme).toBe(expectedTheme);
          expect(result.motion).toBe(isMotionReduced(prefs, reduce) ? "reduce" : "full");
        });
      }
    }
  }

  it("falls back to light when storage throws", () => {
    const attrs: Record<string, string> = {};
    runInNewContext(script, {
      document: {
        documentElement: {
          setAttribute: (n: string, v: string) => (attrs[n] = v),
          style: {},
        },
      },
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      matchMedia: () => ({ matches: false }),
    });
    expect(attrs["data-theme"]).toBe("light");
    expect(attrs["data-motion"]).toBe("full");
  });
});
