// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREFS_STORAGE_KEY } from "@/lib/prefs/preferences";
import {
  getServerSnapshot,
  getSnapshot,
  prefersReducedMotionNow,
  resetPreferencesStore,
  setPreferences,
  subscribe,
} from "@/lib/prefs/store";

type Listener = (event: { matches: boolean }) => void;

/** matchMedia stub whose queries can be flipped later to simulate OS changes. */
function installMatchMedia(initial: Record<string, boolean>) {
  const listeners: Record<string, Listener[]> = {};
  window.matchMedia = ((query: string) => ({
    matches: initial[query] ?? false,
    media: query,
    addEventListener: (_: string, cb: Listener) => (listeners[query] ??= []).push(cb),
    removeEventListener: (_: string, cb: Listener) => {
      listeners[query] = (listeners[query] ?? []).filter((l) => l !== cb);
    },
  })) as unknown as typeof window.matchMedia;
  return (query: string, matches: boolean) =>
    listeners[query]?.forEach((l) => l({ matches }));
}

const root = document.documentElement;

beforeEach(() => {
  resetPreferencesStore();
  localStorage.clear();
});

afterEach(() => resetPreferencesStore());

describe("preferences store", () => {
  it("serves defaults to the server", () => {
    expect(getServerSnapshot().prefs).toEqual({ theme: "system", reduceMotion: false });
  });

  it("reads saved preferences and OS media on first use", () => {
    installMatchMedia({ "(prefers-color-scheme: dark)": true });
    localStorage.setItem(PREFS_STORAGE_KEY, '{"theme":"light","reduceMotion":true}');
    const snap = getSnapshot();
    expect(snap.prefs).toEqual({ theme: "light", reduceMotion: true });
    expect(snap.systemPrefersDark).toBe(true);
    expect(prefersReducedMotionNow()).toBe(true);
  });

  it("returns a stable snapshot until something changes", () => {
    installMatchMedia({});
    expect(getSnapshot()).toBe(getSnapshot());
  });

  it("persists changes, notifies subscribers and updates <html>", () => {
    installMatchMedia({});
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setPreferences({ theme: "dark" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) ?? "{}")).toEqual({
      theme: "dark",
      reduceMotion: false,
    });
    expect(root.dataset.theme).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
    expect(root.dataset.motion).toBe("full");
    unsubscribe();
    setPreferences({ reduceMotion: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(root.dataset.motion).toBe("reduce");
  });

  it("follows OS changes while the choice is system", () => {
    const flip = installMatchMedia({});
    getSnapshot();
    flip("(prefers-color-scheme: dark)", true);
    expect(root.dataset.theme).toBe("dark");
    flip("(prefers-reduced-motion: reduce)", true);
    expect(root.dataset.motion).toBe("reduce");
  });

  it("syncs when another tab writes preferences", () => {
    installMatchMedia({});
    getSnapshot();
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: PREFS_STORAGE_KEY,
        newValue: '{"theme":"dark"}',
      }),
    );
    expect(getSnapshot().prefs.theme).toBe("dark");
    window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "x" }));
    expect(getSnapshot().prefs.theme).toBe("dark");
  });

  it("keeps working when storage is blocked", () => {
    installMatchMedia({});
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getSnapshot().prefs.theme).toBe("system");
    setPreferences({ theme: "dark" });
    expect(root.dataset.theme).toBe("dark");
    get.mockRestore();
    set.mockRestore();
  });
});
