import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  REDUCED_MOTION_QUERY,
  isMotionReduced,
  parsePreferences,
} from "@/lib/prefs/preferences";

const script = readFileSync(join(process.cwd(), "public/prefs-init.js"), "utf8");

/** Runs public/prefs-init.js against a fake browser and returns what it set. */
function runInit(stored: string | null, reduce: boolean) {
  const attrs: Record<string, string> = {};
  runInNewContext(script, {
    document: {
      documentElement: {
        setAttribute: (name: string, value: string) => (attrs[name] = value),
      },
    },
    localStorage: { getItem: () => stored },
    matchMedia: (query: string) => ({
      matches: query === REDUCED_MOTION_QUERY && reduce,
    }),
  });
  return attrs;
}

const storedCases = [
  null,
  "garbage",
  '{"theme":"dark"}',
  '{"reduceMotion":true}',
  '{"reduceMotion":false}',
  '{"reduceMotion":"yes"}',
];

describe("public/prefs-init.js", () => {
  for (const stored of storedCases) {
    for (const reduce of [false, true]) {
      it(`matches lib/prefs for stored=${stored} reduce=${reduce}`, () => {
        const prefs = parsePreferences(stored);
        const attrs = runInit(stored, reduce);
        expect(attrs["data-motion"]).toBe(
          isMotionReduced(prefs, reduce) ? "reduce" : "full",
        );
        expect(attrs["data-theme"]).toBeUndefined();
      });
    }
  }

  it("falls back to full motion when storage throws", () => {
    const attrs: Record<string, string> = {};
    runInNewContext(script, {
      document: {
        documentElement: { setAttribute: (n: string, v: string) => (attrs[n] = v) },
      },
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      matchMedia: () => ({ matches: false }),
    });
    expect(attrs["data-motion"]).toBe("full");
  });
});
