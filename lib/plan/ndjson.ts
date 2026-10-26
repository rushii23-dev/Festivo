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
