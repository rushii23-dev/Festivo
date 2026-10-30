import { describe, expect, it } from "vitest";
import { LruCache, hashKey, stableStringify } from "@/lib/cache/lru";
import { createSingleFlight } from "@/lib/cache/singleFlight";

function setup(maxEntries = 2, ttlMs = 1000) {
  let time = 0;
  const cache = new LruCache<string>({ maxEntries, ttlMs, now: () => time });
  return { cache, advance: (ms: number) => (time += ms) };
}

describe("LruCache", () => {
  it("stores and returns values", () => {
    const { cache } = setup();
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
    expect(cache.has("a")).toBe(true);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts the least recently used entry", () => {
    const { cache } = setup(2);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a"); // a is now most recent
    cache.set("c", "3");
    expect(cache.has("b")).toBe(false);
    expect(cache.has("a")).toBe(true);
    expect(cache.size).toBe(2);
  });

  it("expires entries after the TTL", () => {
    const { cache, advance } = setup(5, 1000);
    cache.set("a", "1");
    advance(999);
    expect(cache.get("a")).toBe("1");
    advance(1);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("refreshes the TTL and position when a key is set again", () => {
    const { cache, advance } = setup(2, 1000);
    cache.set("a", "1");
    advance(800);
    cache.set("a", "2");
    advance(800);
    expect(cache.get("a")).toBe("2");
  });

  it("deletes and clears", () => {
    const { cache } = setup();
    cache.set("a", "1");
    expect(cache.delete("a")).toBe(true);
    cache.set("b", "2");
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("validates options", () => {
    expect(() => new LruCache({ maxEntries: 0, ttlMs: 1 })).toThrow(RangeError);
    expect(() => new LruCache({ maxEntries: 1.5, ttlMs: 1 })).toThrow(RangeError);
    expect(() => new LruCache({ maxEntries: 1, ttlMs: 0 })).toThrow(RangeError);
  });
});

describe("hashing", () => {
  it("serialises objects with sorted keys at every depth", () => {
    expect(stableStringify({ b: 1, a: { d: [3, { z: 1, y: 2 }], c: 2 } })).toBe(
      '{"a":{"c":2,"d":[3,{"y":2,"z":1}]},"b":1}',
    );
  });

  it("gives equal objects the same SHA-256 key regardless of key order", () => {
    const a = hashKey({ eventType: "wedding", guests: 200, vibes: ["boho"] });
    const b = hashKey({ vibes: ["boho"], guests: 200, eventType: "wedding" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashKey({ guests: 201 })).not.toBe(hashKey({ guests: 200 }));
  });
});

describe("single flight", () => {
  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it("runs one task per key while it is in flight, then forgets it", async () => {
    const flights = createSingleFlight<string>();
    const pending = deferred<string>();
    let calls = 0;
    const task = () => {
      calls += 1;
      return pending.promise;
    };

    const first = flights.run("k", task);
    const second = flights.run("k", task);
    expect([first.shared, second.shared]).toEqual([false, true]);
    expect(flights.run("other", () => Promise.resolve("o")).shared).toBe(false);
    pending.resolve("plan");
    await expect(second.promise).resolves.toBe("plan");
    expect(calls).toBe(1);

    await Promise.resolve();
    expect(flights.size).toBe(0);
    expect(flights.run("k", () => Promise.resolve("again")).shared).toBe(false);
  });

  it("never hands out a failure after it settles", async () => {
    const flights = createSingleFlight<string>();
    const failing = flights.run("k", () => Promise.reject(new Error("upstream")));
    await expect(failing.promise).rejects.toThrow("upstream");
    await Promise.resolve();
    const retry = flights.run("k", () => Promise.resolve("ok"));
    expect(retry.shared).toBe(false);
    await expect(retry.promise).resolves.toBe("ok");
    flights.clear();
    expect(flights.size).toBe(0);
  });
});
