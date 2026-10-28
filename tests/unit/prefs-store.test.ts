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
    expect(getServerSnapshot().prefs).toEqual({ reduceMotion: false });
  });

  it("reads saved preferences and OS media on first use", () => {
    installMatchMedia({});
    localStorage.setItem(PREFS_STORAGE_KEY, '{"reduceMotion":true}');
    const snap = getSnapshot();
    expect(snap.prefs).toEqual({ reduceMotion: true });
    expect(snap.systemPrefersReducedMotion).toBe(false);
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
    setPreferences({ reduceMotion: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(PREFS_STORAGE_KEY) ?? "{}")).toEqual({
      reduceMotion: true,
    });
    expect(root.dataset.motion).toBe("reduce");
    expect(root.dataset.theme).toBeUndefined();
    unsubscribe();
    setPreferences({ reduceMotion: false });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(root.dataset.motion).toBe("full");
  });

  it("follows the OS reduced-motion setting as it changes", () => {
    const flip = installMatchMedia({});
    getSnapshot();
    flip("(prefers-reduced-motion: reduce)", true);
    expect(root.dataset.motion).toBe("reduce");
    flip("(prefers-reduced-motion: reduce)", false);
    expect(root.dataset.motion).toBe("full");
  });

  it("syncs when another tab writes preferences", () => {
    installMatchMedia({});
    getSnapshot();
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: PREFS_STORAGE_KEY,
        newValue: '{"reduceMotion":true}',
      }),
    );
    expect(getSnapshot().prefs.reduceMotion).toBe(true);
    window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "x" }));
    expect(getSnapshot().prefs.reduceMotion).toBe(true);
  });

  it("keeps working when storage is blocked", () => {
    installMatchMedia({});
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getSnapshot().prefs.reduceMotion).toBe(false);
    setPreferences({ reduceMotion: true });
    expect(root.dataset.motion).toBe("reduce");
    get.mockRestore();
    set.mockRestore();
  });
});
