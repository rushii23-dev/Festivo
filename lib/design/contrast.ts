/**
 * WCAG 2.x contrast utilities and a tiny parser for Festivo's color tokens.
 * Used by tests to prove every token pairing passes AA.
 */

export type TokenTable = Record<string, string>;

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses #rgb or #rrggbb into 0–255 channels. Throws on anything else. */
export function parseHex(hex: string): [number, number, number] {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match?.[1]) throw new Error(`Not a hex color: ${hex}`);
  const digits =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((d) => d + d)
          .join("")
      : match[1];
  const value = Number.parseInt(digits, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Relative luminance as defined by WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colors, from 1 to 21. Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Extracts `--token: #hex` declarations from one CSS block (the text between a
 * selector's braces). Tokens written any other way (var(), rgb()) are skipped.
 */
export function parseColorTokens(cssBlock: string): TokenTable {
  const tokens: TokenTable = {};
  const pattern = /--([\w-]+)\s*:\s*(#[0-9a-f]{3,6})\s*;/gi;
  for (const [, name, value] of cssBlock.matchAll(pattern)) {
    if (name && value) tokens[name] = value;
  }
  return tokens;
}

/** Returns the body of the first block whose selector exactly matches `selector`. */
export function extractBlock(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}
