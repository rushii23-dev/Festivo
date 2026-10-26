/**
 * Text clean-up for anything a user types before it is stored or sent to the AI.
 * Output is always rendered as plain text by React; this is about removing
 * invisible characters that can hide instructions or break layouts.
 */

/**
 * C0/C1 control characters (except tab and newline), zero-width characters,
 * bidirectional overrides and the BOM.
 */
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

export function stripControlChars(text: string): string {
  return text.replace(INVISIBLE, "");
}

/**
 * NFKC-normalises (folds look-alike characters), strips invisible characters,
 * collapses runs of spaces, keeps at most one blank line, trims, and caps length.
 */
export function cleanText(text: string, maxLength: number): string {
  const cleaned = stripControlChars(text.normalize("NFKC"))
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return [...cleaned].slice(0, maxLength).join("").trim();
}

/** Applies `cleanText` to every string inside a JSON-like value. */
export function cleanDeep<T>(value: T, maxLength = 2000): T {
  if (typeof value === "string") return cleanText(value, maxLength) as T;
  if (Array.isArray(value))
    return value.map((item: unknown) => cleanDeep(item, maxLength)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        cleanDeep(item, maxLength),
      ]),
    ) as T;
  }
  return value;
}
