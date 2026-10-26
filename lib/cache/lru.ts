/**
 * Small in-memory LRU cache with a time-to-live, used to avoid paying for the
 * same AI generation twice. Per server instance; not shared across instances.
 */
import { createHash } from "node:crypto";

export interface LruOptions {
  maxEntries: number;
  ttlMs: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class LruCache<V> {
  readonly #map = new Map<string, Entry<V>>();
  readonly #maxEntries: number;
  readonly #ttlMs: number;
  readonly #now: () => number;

  constructor({ maxEntries, ttlMs, now = Date.now }: LruOptions) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new RangeError("maxEntries must be a positive integer");
    }
    if (!(ttlMs > 0)) throw new RangeError("ttlMs must be positive");
    this.#maxEntries = maxEntries;
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  get size(): number {
    return this.#map.size;
  }

  get(key: string): V | undefined {
    const entry = this.#map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.#now()) {
      this.#map.delete(key);
      return undefined;
    }
    // Re-insert to mark as most recently used (Map keeps insertion order).
    this.#map.delete(key);
    this.#map.set(key, entry);
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  set(key: string, value: V): void {
    this.#map.delete(key);
    this.#map.set(key, { value, expiresAt: this.#now() + this.#ttlMs });
    while (this.#map.size > this.#maxEntries) {
      const oldest = this.#map.keys().next().value;
      if (oldest === undefined) break;
      this.#map.delete(oldest);
    }
  }

  delete(key: string): boolean {
    return this.#map.delete(key);
  }

  clear(): void {
    this.#map.clear();
  }
}

/** JSON with object keys sorted, so equal values always serialise the same way. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      );
    }
    return val;
  });
}

/** SHA-256 hex digest of the normalised value: the cache key for an AI request. */
export function hashKey(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}
