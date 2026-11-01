import { describe, expect, it } from "vitest";
import { readNdjson, toNdjson } from "@/lib/plan/ndjson";

async function* source<T>(items: T[], log: string[] = []): AsyncGenerator<T> {
  try {
    for (const item of items) yield item;
  } finally {
    log.push("closed");
  }
}

describe("readNdjson", () => {
  function streamOf(chunks: string[]) {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
  }

  it("yields one value per line, across chunk boundaries", async () => {
    const values: unknown[] = [];
    for await (const v of readNdjson(
      streamOf(['{"a":', "1}\n\n", '{"b":2}\n{"c"', ":3}"]),
    )) {
      values.push(v);
    }
    expect(values).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
  });

  it("handles multi-byte characters split between chunks", async () => {
    const bytes = new TextEncoder().encode('{"t":"₹"}\n');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 7));
        controller.enqueue(bytes.slice(7));
        controller.close();
      },
    });
    const values: unknown[] = [];
    for await (const v of readNdjson(stream)) values.push(v);
    expect(values).toEqual([{ t: "₹" }]);
  });
});

describe("toNdjson", () => {
  it("writes one JSON line per value that readNdjson reads back", async () => {
    const sent = [
      { type: "progress", step: "start" },
      { type: "plan", t: "₹" },
    ];
    const received: unknown[] = [];
    for await (const value of readNdjson(toNdjson(source(sent)))) received.push(value);
    expect(received).toEqual(sent);
  });

  it("closes the source when the reader cancels", async () => {
    const log: string[] = [];
    const reader = toNdjson(source([1, 2, 3], log)).getReader();
    await reader.read();
    await reader.cancel();
    expect(log).toEqual(["closed"]);
  });
});
