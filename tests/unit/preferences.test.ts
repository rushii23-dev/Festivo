import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  isMotionReduced,
  parsePreferences,
  serializePreferences,
} from "@/lib/prefs/preferences";

describe("parsePreferences", () => {
  it("returns defaults for missing or malformed data", () => {
    for (const raw of [null, undefined, "", "not json", "null", "42", '"dark"']) {
      expect(parsePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
    }
  });

  it("keeps valid fields and drops invalid or retired ones", () => {
    expect(parsePreferences('{"theme":"dark","reduceMotion":true}')).toEqual({
      reduceMotion: true,
    });
    expect(parsePreferences('{"reduceMotion":"yes"}')).toEqual(DEFAULT_PREFERENCES);
  });

  it("round-trips through serializePreferences", () => {
    const prefs = { reduceMotion: true };
    expect(parsePreferences(serializePreferences(prefs))).toEqual(prefs);
  });

  it("returns a fresh object each time", () => {
    expect(parsePreferences(null)).not.toBe(DEFAULT_PREFERENCES);
  });
});

describe("isMotionReduced", () => {
  it("is reduced when either the device or the toggle asks", () => {
    expect(isMotionReduced({ reduceMotion: false }, false)).toBe(false);
    expect(isMotionReduced({ reduceMotion: true }, false)).toBe(true);
    expect(isMotionReduced({ reduceMotion: false }, true)).toBe(true);
  });
});
