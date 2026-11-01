import { describe, expect, it } from "vitest";
import { attentionMessage, countOf } from "@/lib/text/count";

describe("countOf", () => {
  it("uses the singular only for exactly one", () => {
    expect(countOf(1, "idea")).toBe("1 idea");
    expect(countOf(0, "idea")).toBe("0 ideas");
    expect(countOf(3, "saved idea")).toBe("3 saved ideas");
  });

  it("takes an irregular plural", () => {
    expect(countOf(2, "answer needs", "answers need")).toBe("2 answers need");
  });

  it("phrases form problems for announcement", () => {
    expect(attentionMessage(1)).toBe("1 answer needs attention.");
    expect(attentionMessage(4)).toBe("4 answers need attention.");
  });
});
