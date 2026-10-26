import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  isMotionReduced,
  isThemeChoice,
  parsePreferences,
  resolveTheme,
  serializePreferences,
} from "@/lib/prefs/preferences";

describe("parsePreferences", () => {
  it("returns defaults for missing or malformed data", () => {
    for (const raw of [null, undefined, "", "not json", "null", "42", '"dark"']) {
      expect(parsePreferences(raw)).toEqual(DEFAULT_PREFERENCES);
    }
  });

  it("keeps valid fields and drops invalid ones", () => {
    expect(parsePreferences('{"theme":"dark","reduceMotion":true}')).toEqual({
      theme: "dark",
      reduceMotion: true,
    });
    expect(parsePreferences('{"theme":"neon","reduceMotion":"yes"}')).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  it("round-trips through serializePreferences", () => {
    const prefs = { theme: "light", reduceMotion: true } as const;
    expect(parsePreferences(serializePreferences(prefs))).toEqual(prefs);
  });

  it("returns a fresh object each time", () => {
    expect(parsePreferences(null)).not.toBe(DEFAULT_PREFERENCES);
  });
});

describe("isThemeChoice", () => {
  it("accepts only the known choices", () => {
    expect(isThemeChoice("system")).toBe(true);
    expect(isThemeChoice("DARK")).toBe(false);
    expect(isThemeChoice(undefined)).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("follows the device for system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("uses an explicit choice regardless of the device", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("isMotionReduced", () => {
  it("is reduced when either the device or the toggle asks", () => {
    expect(isMotionReduced({ theme: "system", reduceMotion: false }, false)).toBe(false);
    expect(isMotionReduced({ theme: "system", reduceMotion: true }, false)).toBe(true);
    expect(isMotionReduced({ theme: "system", reduceMotion: false }, true)).toBe(true);
  });
});
