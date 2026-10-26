/**
 * localStorage wrapper for Zustand's persist middleware that batches writes:
 * rapid edits (typing, dragging a slider) cost one write per `delayMs`.
 * Pending writes are flushed when the page is hidden so nothing is lost.
 */
import type { StateStorage } from "zustand/middleware";

export interface DebouncedStorage extends StateStorage {
  /** Writes any pending value immediately. */
  flush(): void;
}

export function createDebouncedStorage(
  getStorage: () => Storage | undefined,
  delayMs = 300,
): DebouncedStorage {
  const pending = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const storage = getStorage();
    for (const [key, value] of pending) {
      try {
        storage?.setItem(key, value);
      } catch {
        // Quota exceeded or storage blocked: keep working in memory.
      }
    }
    pending.clear();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return {
    getItem(key) {
      if (pending.has(key)) return pending.get(key) ?? null;
      try {
        return getStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      pending.set(key, value);
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    removeItem(key) {
      pending.delete(key);
      try {
        getStorage()?.removeItem(key);
      } catch {
        // Ignore blocked storage.
      }
    },
    flush,
  };
}
