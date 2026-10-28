import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  extractBlock,
  parseHex,
  parseColorTokens,
  relativeLuminance,
} from "@/lib/design/contrast";

describe("parseHex", () => {
  it("reads six-digit and three-digit hex", () => {
    expect(parseHex("#5b2ee8")).toEqual([91, 46, 232]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });

  it("rejects non-hex input", () => {
    expect(() => parseHex("rgb(0,0,0)")).toThrow(/Not a hex color/);
    expect(() => parseHex("#12345")).toThrow();
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#1d1442", "#fff4dc")).toBe(contrastRatio("#fff4dc", "#1d1442"));
  });
});

describe("token parsing", () => {
  const css = `:root {
  --a: #111111;
  --b: var(--a);
  --c: rgb(0 0 0);
}
.x {
  --d: #fff;
}`;

  it("extracts only hex color tokens from a block", () => {
    expect(parseColorTokens(extractBlock(css, ":root"))).toEqual({ a: "#111111" });
    expect(parseColorTokens(extractBlock(css, ".x"))).toEqual({ d: "#fff" });
  });

  it("throws for a missing selector", () => {
    expect(() => extractBlock(css, ".missing")).toThrow(/Selector not found/);
  });
});
