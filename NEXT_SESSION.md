# Festivo: handoff for the next session

Last updated: 2026-10-26, after Phase 4 (commit `414a201`).

Read this first, then `docs/BRIEF.md` (the full original brief) and `docs/design/research.md`
(design references). The brief is the spec; this file says where we are against it.

## Status at a glance

| Phase | What                                                                                        | Status              |
| ----- | ------------------------------------------------------------------------------------------- | ------------------- |
| 1     | Foundation: scaffold, tooling, tokens, fonts, theme + motion toggles, a11y base, CI         | ✅ Done (`596d171`) |
| —     | Design research (twomuch.studio, Refero Styles)                                             | ✅ Done (`362c19f`) |
| 2     | Domain logic: schemas, budget, timeline, .ics, cache, rate limit, sanitize, fixtures        | ✅ Done (`d1fde50`) |
| 3     | AI layer: providers, prompts, parse + repair, `/api/plan`, `/api/refine`, `/api/ideas`, CSP | ✅ Done (`72175bd`) |
| 4     | Wizard: 6 steps, validation, focus, persistence, streamed generation                        | ✅ Done (`414a201`) |
| 5     | **Dashboard** at `/plan/[id]`                                                               | ⏭️ **Next**         |
| 6     | **Landing page** (scroll story, mascot, confetti)                                           | ❌ Not started      |
| 7     | Hardening: full e2e per brief, Lighthouse, bundle analysis, audits                          | ❌ Not started      |
| 8     | Docs + deployment: README, ARCHITECTURE/SECURITY/ACCESSIBILITY.md, Dockerfile               | ❌ Not started      |

**The landing page is not done.** `app/page.tsx` is an interim, server-rendered hero (the
headline "Plan the party, not the panic." plus a Start planning button). The brief's scroll
story, Festi mascot, scenes and confetti are all Phase 6.

**`/plan/[id]` is interim too.** `components/plan/PlanPreview.tsx` only proves the plan was
saved (title, date, summary, counts). Phase 5 replaces it with the dashboard.

Checks at the end of Phase 4: lint clean, typecheck clean, **407 tests** (unit, API,
component), `lib/` coverage **99.6% lines / 94.3% branches**, build passes, **45 Playwright
tests** (+3 skipped by design), `npm audit` 0 vulnerabilities. Nothing has been pushed
anywhere; the repo is local on `main`.

## How to run

```bash
npm install
cp .env.example .env.local   # AI_PROVIDER=mock works with no key
npm run dev                  # http://localhost:3000
```

| Script                  | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `npm run lint`          | ESLint, zero warnings allowed                                                    |
| `npm run format:check`  | Prettier                                                                         |
| `npm run typecheck`     | `next typegen && tsc --noEmit` (typegen is needed for `LayoutProps`/`PageProps`) |
| `npm test`              | Vitest projects: `unit` (node), `api` (node + MSW), `component` (jsdom)          |
| `npm run test:coverage` | Same with coverage; fails under 80% on `lib/`                                    |
| `npm run test:e2e`      | Playwright + axe against a production build on port 3100 (mock AI)               |

Environment variables (see `.env.example`): `AI_PROVIDER` (`mock`/`gemini`; falls back to
mock without a key), `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-flash-latest`),
`MOCK_STREAM_DELAY_MS` (default 1200), `API_RATE_LIMIT_PER_MINUTE` (default 8),
`NEXT_PUBLIC_SITE_URL` (https enables HSTS + upgrade-insecure-requests).

## Working rules we follow (from the brief, plus what we agreed)

- At the end of every phase: `npm run lint`, `npm run typecheck`, `npm test` (we also run
  coverage, build, Playwright and `npm audit`), fix everything, summarise, then commit with a
  clear message (no co-author or tool attribution lines).
- The user approves each phase before the next one starts.
- Business logic in `lib/` as small pure functions with tests; components stay thin.
- No `any`, no `dangerouslySetInnerHTML` (lint enforces `react/no-danger`).
- Design must be original (see "What we deliberately do not take" in the research doc).
- Before touching Next.js APIs, check the bundled docs in `node_modules/next/dist/docs/`:
  this is Next 16.4, which differs from older versions (see `AGENTS.md`).
- Windows dev machine: use absolute paths; the repo is LF via `.gitattributes`.

## Decisions that differ from (or refine) the brief, and why

1. **CSP uses per-request nonces, so Cache Components is off.** A strict `script-src 'self'`
   with build-time SRI broke hydration (Next's inline bootstrap scripts cannot be hashed in
   advance). `proxy.ts` (Next 16's name for middleware) now sets
   `script-src 'self' 'nonce-…' 'strict-dynamic'`; the root layout passes the nonce to
   `public/theme-init.js`. Next's docs say PPR cannot carry nonces, so `cacheComponents` is
   disabled and every page renders per request. Re-check the cost in the Phase 7 Lighthouse pass.
2. **The AI returns a lean draft, not a full Plan.** Tasks come back as `daysBefore`; code
   computes every date, ID and exact budget sum (`lib/plan/fromDraft.ts`). Models are bad at
   date math, and this makes the brief's "re-validate in code" structural.
3. **Default Gemini model is the alias `gemini-flash-latest`** (what the SDK README uses),
   overridable with `GEMINI_MODEL`. **Gemini has never been called with a real key**; all
   Gemini tests use MSW. Verify with a real key before claiming the Definition of Done item.
4. **Added `/api/ideas`** for "More like this" (one category only), beyond the two routes the
   brief lists.
5. **Plan schema additions:** `dateFlexible`, `vibes`, `createdAt`, idea `dismissed`, task
   `time` (for the run sheet).
6. **Budget math in whole currency units** with largest-remainder rounding.
7. **PDF export planned as a print stylesheet** (not `@react-pdf/renderer`) to keep bundles small.
8. **3D (R3F) skipped by recommendation**; the SVG mascot carries the hero. Optional per the brief.
9. **Rate limit is configurable**; Playwright raises it because all tests share one IP.
10. **Lint:** `jsx-a11y/control-has-associated-label` ignores native inputs/selects/textareas
    (labels come from `<label htmlFor>` in shared components, which the rule can't follow).
    Labels are verified by axe and by `getByRole(..., { name })` in tests.
11. **Playwright** runs 4 workers locally (2 in CI) with a 60s timeout: per-request SSR
    overloaded a single test server with more.

## Design system (Phase 1) and research

- Tokens in `app/globals.css`, each color written once as `light-dark(light, dark)`.
  `tests/unit/design-tokens.test.ts` parses that file and enforces WCAG AA for every pairing in
  both themes. **Add any new color pairing to that test.**
- Palette: cream `#FFF4DC`, violet-ink `#1D1442`, marigold `#FFB627`, coral `#F2667A`,
  electric violet `#5B2EE8`. Event accents via `data-event="wedding|birthday|community"`
  (`--event`, `--event-foreground`, `--event-2`, `--event-2-foreground`).
- Fonts: Shrikhand (display, headlines only, `font-display`) + Mukta (UI).
- Shapes: `.sticker` cards (ink border + solid offset shadow), `rounded-pill` buttons, 44px targets.
- Motion: `motion-ok:` Tailwind variant = OS allows motion AND in-site toggle is off.
  JS animation code must check `prefersReducedMotionNow()` from `lib/prefs/store.ts`.
- Research conclusions to apply in Phase 6 (`docs/design/research.md`): Festi's eyes live inside
  the header pill and follow cursor + focus; faint oversized doodle behind the hero; one
  headline, one visual, one action per scene; each scene is a coloured "room"; the mascot
  replaces one word in one headline (word kept as screen-reader text); sticker shadows only on
  the primary action per view.

## Code map

```
app/
  layout.tsx            fonts, nonce, theme-init script, SkipLink, header/footer, RouteFocus
  page.tsx              INTERIM hero (Phase 6 replaces)
  plan/new/page.tsx     wizard page
  plan/[id]/page.tsx    INTERIM plan view (Phase 5 replaces)
  api/plan|refine|ideas route handlers (guard → body limit → Zod → service)
proxy.ts                per-request nonce CSP
components/
  a11y/                 SkipLink, LiveRegion (AnnouncerProvider/useAnnounce), RouteFocus,
                        MotionToggle, VisuallyHidden
  layout/               SiteHeader, SiteFooter, Wordmark, DisplaySettings (theme + motion popover)
  theme/ThemePicker     system/light/dark radios
  ui/                   button, field (Field/Fieldset/Choice/ErrorText), label, popover,
                        radio-group, switch, skeleton  (shadcn on Radix, restyled)
  wizard/               Wizard, WizardProgress, Step* components, StepReview (+GenerationProgress)
  plan/PlanPreview      INTERIM
  icons/EventIcons      original line icons per event type
hooks/                  use-preferences, use-hydrated-store, use-plan-generation
lib/
  schemas/              common (vocabularies), eventInput, plan (PlanSchema etc.)
  budget/               categories, allocate, rebalance (rebalance, scaleBudget, summarizeBudget), format
  timeline/             dates, templates, generate (normalize, groupByPhase, nextTasks, runSheet),
                        resolveDate, ics (buildIcs, icsFileName)
  vendors/catalog       labels, default questions, budgetCategoryFor, applyVendorSpend, bookingProgress
  ideas/fit             budgetLevel, fitsBudget
  fixtures/             per-event content + buildMockPlan, selectIdeas
  ai/                   provider (interface, errors), config, gemini, mock (incl. mockRefine),
                        schemas (draft + PlanPatchSchema), prompts, parse (repair), getProvider
  plan/                 fromDraft, patch (applyPatch), diff (diffPlans, describeChange), ids,
                        ndjson (client stream reader), service (streamPlan, refinePlan, moreIdeas)
  http/                 api (guard, rate limiter, body limits, errors), requests (body schemas)
  security/             sanitize, promptGuard, rateLimit, headers (CSP + static headers)
  cache/lru             LRU + TTL, stableStringify, hashKey (SHA-256)
  prefs/                preferences (pure), store (theme/motion external store)
  store/                planStore (zustand persist, sanitizePersisted), debouncedStorage
  wizard/               draft (model, validateStep, toEventInput), labels
  design/contrast       WCAG contrast helpers
tests/  unit/ api/ component/ e2e/ setup/
```

## Phase 5 plan: the dashboard (`/plan/[id]`)

Replace `components/plan/PlanPreview.tsx` with a client dashboard. Reuse what exists; most of
the logic is already written and tested.

1. **Shell**: load the plan from `usePlanStore` after `useHydratedStore()`; skeleton while
   loading; friendly not-found (the current one). Wrap in `data-event={plan.eventType}`.
   `h1` = plan title; Radix Tabs (`npx shadcn@latest add tabs`, then restyle like the other
   primitives): Overview · Budget · Timeline · Vendors · Ideas. Keep the active tab in the URL
   hash or search param so it survives reload. One `h2` per panel.
2. **Overview**: `countdown()` (lib/timeline/dates), budget health from `summarizeBudget()`
   (text + icon, never color alone), `nextTasks(plan.timeline, 3)` with checkboxes,
   `bookingProgress(plan.vendors)`, the plan summary.
3. **Budget**: Recharts donut (dynamic import, `ssr: false`) **plus an always-present data
   table** (the accessible alternative). Editable allocated and actual amounts
   (`parseMoneyInput`), live totals (memoize `summarizeBudget`), lock + "Rebalance" using
   `rebalance(items, total, locked)`, over-budget warnings with icon + text. Actual spend should
   include vendor quotes via `applyVendorSpend(budget, vendors, eventType)`; decide and document
   whether manual actuals or vendor quotes win (the function currently lets vendor quotes override).
   Chart segments need the ink border (tokens `--chart-1..5`).
4. **Timeline**: `groupByPhase()`; mark done, add, edit, delete tasks (validate with
   `TimelineTaskSchema`, then `normalizeTimeline`); a Day-of run sheet view from `runSheet()`;
   ".ics" download via `buildIcs()` + `icsFileName()` (Blob + object URL; CSP allows `blob:`).
   When a task is ticked, Festi "cheers" only if `!prefersReducedMotionNow()`; always announce
   via `useAnnounce()`.
5. **Vendors**: one card per vendor; status select (To research → Contacted → Quoted → Booked →
   Paid, labels in `VENDOR_STATUS_LABELS`), quote input feeding actual spend, notes, and the
   "Questions to ask" list.
6. **Ideas**: cards grouped by category with `costTierSymbol()` + `costTierName()` (screen-reader
   text) and a "Fits your budget" badge from `fitsBudget()`; Save / Dismiss (`saved`,
   `dismissed`); "More like this" → `POST /api/ideas { plan, category }` (returns
   `{ ideas: [] }` when demo mode runs out; show a friendly message).
7. **Refine with AI**: a side panel / dialog (focus moves in, Esc closes, focus returns).
   `POST /api/refine { plan, instruction, timeZone }` → `{ explanation, plan, changes }`. Show
   the explanation and the `changes` list (use `describeChange()`), then **Accept** (save the
   returned `plan` via `savePlan`) or **Reject**. Announce results. Errors are generic.
   Demo mode understands: cut/raise budget by N%, move the date to <month>, eco-friendly,
   cheaper.
8. **Export & share**: a print stylesheet (`@media print`: hide chrome/tabs, show every
   section) + "Print or save as PDF" button (`window.print()`), "Download calendar (.ics)",
   and "Copy summary" (Clipboard API, text built by a pure function in `lib/` with a test).
9. **Store**: use `updatePlan(id, fn)`; keep all mutations as pure functions in `lib/plan/`
   (e.g. `setTaskDone`, `addTask`, `updateVendor`, `setIdeaSaved`) with unit tests.
10. **Tests (brief requires)**: component tests for budget editing + live totals, vendor status
    changes, the refine accept/reject flow; unit tests for the new pure helpers; e2e: generate →
    edit budget → tick a task → export .ics for each event type; axe on the dashboard (every tab,
    both themes); keyboard-only through the tabs.
11. Remove `PlanPreview` and update the e2e assertions in `tests/e2e/wizard.spec.ts` that look
    for its "tasks, N vendors and N ideas" text.

## Phases 6–8 (after the dashboard)

**Phase 6, landing page** (skills are installed: `gsap-*`, `lenis`): Festi SVG mascot (eyes
follow cursor + focus), hero stays server-rendered and readable without JS, pinned
ScrollTrigger scenes (date, budget donut, vendors, event-type morph, ideas deck), confetti
finale (canvas, off under reduced motion). GSAP + Lenis loaded dynamically after first paint;
transform/opacity only; kill ScrollTriggers on unmount; static readable scenes under reduced
motion; simplified on mobile; works at 360px. Register only the GSAP plugins used (the
`gsap-setup` skill registers all of them; don't). Landing initial JS < 150KB gzipped.

**Phase 7, hardening**: Playwright e2e exactly as the brief lists (landing → wizard → generate
→ edit budget → tick task → export .ics, ×3 event types), axe on every page, keyboard-only,
reduced-motion emulation; Lighthouse mobile (Perf ≥ 90, A11y 100, BP 100, SEO ≥ 95); bundle
analyzer numbers; contrast audit in both themes; 200% text zoom.

**Phase 8, docs + deploy**: README (problem statement, feature → judging-criteria table,
Mermaid architecture, setup, env, scripts, tests, screenshot placeholders, Cloud Run + Vercel
steps), ARCHITECTURE.md, SECURITY.md (threat model + every mitigation), ACCESSIBILITY.md,
multi-stage non-root Dockerfile with `output: "standalone"` (not set yet; add it then and switch
the Playwright web server to the standalone server if `next start` complains).

## Known issues and loose ends

- Gemini untested with a real key (see decision 3).
- One axe failure on the 404 page in dark theme happened once and never reproduced in 56 reruns.
- Vitest 5 warns about Node 25 (unsupported engine); CI uses Node 24 LTS. Harmless locally.
- `gsap-skills.zip` / `lenis-skill.zip` sit in the repo root, git-ignored; safe to delete.
- The `magic` (21st.dev) MCP server failed to connect (API key); not needed.
- Brief items still open overall: dashboard, landing, full e2e, Lighthouse/bundle numbers,
  docs, Dockerfile, CI never run on GitHub (repo has no remote).
