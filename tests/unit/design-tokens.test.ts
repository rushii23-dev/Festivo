import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, extractBlock, parseColorTokens } from "@/lib/design/contrast";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const tokens = parseColorTokens(extractBlock(css, ":root"));

const TEXT = 4.5;
const UI = 3;

/** [foreground token, background token, minimum ratio] */
const pairs: [string, string, number][] = [
  ["foreground", "background", TEXT],
  ["foreground", "card", TEXT],
  ["foreground", "muted", TEXT],
  ["muted-foreground", "background", TEXT],
  ["muted-foreground", "card", TEXT],
  ["muted-foreground", "muted", TEXT],
  ["primary", "background", TEXT],
  ["primary", "card", TEXT],
  ["primary-foreground", "primary", TEXT],
  ["secondary-foreground", "secondary", TEXT],
  ["accent-foreground", "accent", TEXT],
  ["destructive", "background", TEXT],
  ["destructive", "card", TEXT],
  ["destructive-foreground", "destructive", TEXT],
  ["success", "background", TEXT],
  ["success", "card", TEXT],
  ["success-foreground", "success", TEXT],
  ["warning", "background", TEXT],
  ["warning", "card", TEXT],
  ["warning-foreground", "warning", TEXT],
  ["event", "background", TEXT],
  ["event", "card", TEXT],
  ["event-foreground", "event", TEXT],
  ["event-2-foreground", "event-2", TEXT],
  ["border", "background", UI],
  ["border", "card", UI],
  ["input", "background", UI],
  ["input", "card", UI],
  ["ring", "background", UI],
  ["ring", "card", UI],
  ["ring", "muted", UI],
  ["gold", "background", UI],
  ["gold", "card", UI],
];

function color(token: string): string {
  const value = tokens[token];
  if (!value) throw new Error(`Missing token --${token}`);
  return value;
}

describe("design tokens", () => {
  it("parses the palette", () => {
    expect(Object.keys(tokens).length).toBeGreaterThan(20);
  });

  it("has a single light color scheme", () => {
    expect(extractBlock(css, ":root")).toMatch(/color-scheme:\s*light;/);
    expect(css).not.toMatch(/light-dark\(|data-theme/);
  });

  it.each(pairs)("--%s on --%s meets %s:1", (fg, bg, min) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(min);
  });
});
