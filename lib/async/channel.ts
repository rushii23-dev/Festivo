/**
 * A minimal async queue: callbacks push items in, one consumer drains them as
 * an async generator. Lets code that reports through callbacks (stream
 * progress) feed a generator that yields to an HTTP response.
 */
export interface Channel<T> {
  push(item: T): void;
  /** Ends the drain once the buffered items have been yielded. */
  close(): void;
  drain(): AsyncGenerator<T>;
}

export function createChannel<T>(): Channel<T> {
  const items: T[] = [];
  let wake: (() => void) | null = null;
  let closed = false;
  return {
    push(item) {
      items.push(item);
      wake?.();
    },
    close() {
      closed = true;
      wake?.();
    },
    async *drain() {
      for (;;) {
        if (items.length > 0) {
          yield* items.splice(0);
          continue;
        }
        if (closed) return;
        await new Promise<void>((resolve) => (wake = resolve));
        wake = null;
      }
    },
  };
}
