/**
 * Newline-delimited JSON (one value per line), the format of the plan stream.
 * `toNdjson` writes it on the server; `readNdjson` reads it in the browser.
 */

const encoder = new TextEncoder();

/** Serialises values as NDJSON, pulling the next one only when the reader is ready. */
export function toNdjson<T>(values: AsyncGenerator<T>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await values.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
    },
    async cancel() {
      await values.return(undefined);
    },
  });
}

/** The stream's bytes as text, with characters split across chunks put back together. */
async function* decodeText(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      yield decoder.decode();
      return;
    }
    yield decoder.decode(value, { stream: true });
  }
}

/**
 * Reads a newline-delimited JSON stream, yielding one parsed value per line.
 * Handles lines split across network chunks and a final line with no newline.
 */
export async function* readNdjson(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const reader = stream.getReader();
  let partial = "";
  try {
    for await (const text of decodeText(reader)) {
      const lines = (partial + text).split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines.filter((l) => l.trim())) yield JSON.parse(line);
    }
    if (partial.trim()) yield JSON.parse(partial);
  } finally {
    reader.releaseLock();
  }
}
