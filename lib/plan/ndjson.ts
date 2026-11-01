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

/**
 * Reads a newline-delimited JSON stream, yielding one parsed value per line.
 * Handles lines split across network chunks and a final line with no newline.
 */
export async function* readNdjson(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield JSON.parse(line);
        newline = buffer.indexOf("\n");
      }
      if (done) break;
    }
    if (buffer.trim()) yield JSON.parse(buffer);
  } finally {
    reader.releaseLock();
  }
}
