import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { REDUCED_MOTION_QUERY, motionAttribute } from "@/lib/prefs/preferences";

const script = readFileSync(join(process.cwd(), "public/prefs-init.js"), "utf8");

/** Runs public/prefs-init.js against a fake browser and returns what it set. */
function runInit(reduce: boolean, stored: string | null = null) {
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

describe("public/prefs-init.js", () => {
  for (const reduce of [false, true]) {
    it(`matches lib/prefs when the device reduce setting is ${reduce}`, () => {
      expect(runInit(reduce)["data-motion"]).toBe(motionAttribute(reduce));
    });
  }

  it("ignores a choice saved by the old in-site switch", () => {
    expect(runInit(false, '{"reduceMotion":true}')["data-motion"]).toBe("full");
  });

  it("sets nothing but data-motion", () => {
    expect(Object.keys(runInit(false))).toEqual(["data-motion"]);
  });
});
