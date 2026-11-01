import { describe, expect, it } from "vitest";
import { createChannel } from "@/lib/async/channel";

async function drainAll<T>(drain: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of drain) items.push(item);
  return items;
}

describe("createChannel", () => {
  it("yields items pushed before and while it drains, then ends on close", async () => {
    const channel = createChannel<number>();
    channel.push(1);
    channel.push(2);
    const drained = drainAll(channel.drain());
    await Promise.resolve();
    channel.push(3);
    setTimeout(() => {
      channel.push(4);
      channel.close();
    }, 0);
    expect(await drained).toEqual([1, 2, 3, 4]);
  });

  it("still yields what was buffered when it is closed", async () => {
    const channel = createChannel<string>();
    channel.push("last");
    channel.close();
    expect(await drainAll(channel.drain())).toEqual(["last"]);
  });
});
