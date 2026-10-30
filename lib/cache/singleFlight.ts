/**
 * One in-flight promise per key. The response cache only helps once a result
 * exists; while the first request for a key is still running, identical requests
 * (a double-click on Generate, a retry from a second tab) wait for that same
 * promise instead of paying for another AI call.
 */

export interface Flight<T> {
  promise: Promise<T>;
  /** True when this caller joined a request someone else started. */
  shared: boolean;
}

export interface SingleFlight<T> {
  run(key: string, task: () => Promise<T>): Flight<T>;
  readonly size: number;
  clear(): void;
}

export function createSingleFlight<T>(): SingleFlight<T> {
  const inflight = new Map<string, Promise<T>>();

  return {
    run(key, task) {
      const existing = inflight.get(key);
      if (existing) return { promise: existing, shared: true };

      const promise = task();
      inflight.set(key, promise);
      // Forget the key once settled, success or failure, so a failure is never reused.
      const forget = () => {
        if (inflight.get(key) === promise) inflight.delete(key);
      };
      promise.then(forget, forget);
      return { promise, shared: false };
    },
    get size() {
      return inflight.size;
    },
    clear() {
      inflight.clear();
    },
  };
}
