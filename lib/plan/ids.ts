/** Readable, URL-safe IDs derived from titles, made unique within a list. */

export function slugify(text: string, max = 40): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug || "item";
}

/** Returns a function that hands out `${prefix}-${slug}` IDs, never repeating one. */
export function uniqueIdFactory(prefix: string, taken: Iterable<string> = []) {
  const used = new Set(taken);
  return (title: string): string => {
    const base = `${prefix}-${slugify(title)}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  };
}
