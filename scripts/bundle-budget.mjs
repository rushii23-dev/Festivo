/**
 * Bundle budget: reads the first-load chunks Next.js records for every route
 * after `next build`, gzips them and fails when a route goes over its budget.
 * Run after a build: `npm run build && npm run bundle:check`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const STATS = ".next/diagnostics/route-bundle-stats.json";

/**
 * First-load JavaScript budgets in gzipped KB. The landing page has the brief's
 * 150 KB. The planner pages are ratchets just above what they measure today: most
 * of their weight is React, Next.js and Zod (the wizard and the saved-plan checks
 * validate in the browser too). The dashboard keeps its main view in the first load
 * on purpose: deferring it would add a round trip before the hero photo can paint.
 * Its hidden tabs, the Refine sheet and the share menu are split out instead.
 */
const BUDGET_KB = {
  "/": 150,
  "/_not-found": 145,
  "/plan/new": 200,
  "/plan/[id]": 230,
};
const DEFAULT_BUDGET_KB = 150;

const stats = JSON.parse(await readFile(STATS, "utf8"));
const sizes = new Map();

async function gzippedSize(file) {
  if (!sizes.has(file)) {
    const source = await readFile(path.normalize(file));
    sizes.set(file, gzipSync(source, { level: 9 }).length);
  }
  return sizes.get(file);
}

let over = 0;
const rows = [];
for (const { route, firstLoadChunkPaths } of stats) {
  const bytes = await Promise.all(firstLoadChunkPaths.map(gzippedSize));
  const kb = bytes.reduce((sum, size) => sum + size, 0) / 1024;
  const budget = BUDGET_KB[route] ?? DEFAULT_BUDGET_KB;
  if (kb > budget) over += 1;
  rows.push({
    route,
    "first load (KB gzip)": Number(kb.toFixed(1)),
    "budget (KB)": budget,
    status: kb > budget ? "OVER" : "ok",
  });
}

console.table(rows);
if (over > 0) {
  console.error(`${over} route(s) over the first-load JavaScript budget.`);
  process.exit(1);
}
