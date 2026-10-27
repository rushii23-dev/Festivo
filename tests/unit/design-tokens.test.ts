import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  extractBlock,
  parseLightDarkTokens,
  type ThemeName,
  type TokenTable,
} from "@/lib/design/contrast";

const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const base = parseLightDarkTokens(extractBlock(css, ":root"));
const themes: ThemeName[] = ["light", "dark"];

const TEXT = 4.5;
const UI = 3;

/** [foreground token, background token, minimum ratio] */
const basePairs: [string, string, number][] = [
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

function color(table: TokenTable, token: string, theme: ThemeName): string {
  const entry = table[token] ?? base[token];
  if (!entry) throw new Error(`Missing token --${token}`);
  return entry[theme];
}

describe("design tokens", () => {
  it("parses the base palette", () => {
    expect(Object.keys(base).length).toBeGreaterThan(20);
  });

  for (const theme of themes) {
    describe(`${theme} theme`, () => {
      it.each(basePairs)("--%s on --%s meets %s:1", (fg, bg, min) => {
        expect(
          contrastRatio(color(base, fg, theme), color(base, bg, theme)),
        ).toBeGreaterThanOrEqual(min);
      });

      for (const event of ["wedding", "birthday", "community"]) {
        it(`${event} accents meet AA`, () => {
          const accents = parseLightDarkTokens(
            extractBlock(css, `[data-event="${event}"]`),
          );
          const pairs: [string, string, number][] = [
            ["event", "background", TEXT],
            ["event", "card", TEXT],
            ["event-foreground", "event", TEXT],
            ["event-2-foreground", "event-2", TEXT],
          ];
          for (const [fg, bg, min] of pairs) {
            const ratio = contrastRatio(
              color(accents, fg, theme),
              color(accents, bg, theme),
            );
            expect(ratio, `${event}: --${fg} on --${bg}`).toBeGreaterThanOrEqual(min);
          }
        });
      }
    });
  }
});
