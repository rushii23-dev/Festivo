/** Counted phrases for announcements and labels ("1 idea", "3 ideas"). */

/** "1 idea", "3 ideas". Pass `many` when the plural is not `one` + "s". */
export function countOf(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Announced when a form is submitted with problems: "2 answers need attention." */
export function attentionMessage(count: number): string {
  return `${countOf(count, "answer needs", "answers need")} attention.`;
}
