# Festivo: handoff for the next session

Last updated: 2026-10-28, after the editorial redesign (dashboard, landing page and wizard;
awaiting the user's review, not yet committed).

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
| 5     | Dashboard at `/plan/[id]`: 5 tabs, refine sheet, export (editorial restyle)                 | 🔍 In review        |
| 6     | Landing page: photo-led scroll story, refined Festi, petal finale                           | 🔍 In review        |
| 7     | Hardening: full e2e per brief, Lighthouse, bundle analysis, audits                          | ❌ Not started      |
| 8     | Docs + deployment: README, ARCHITECTURE/SECURITY/ACCESSIBILITY.md, Dockerfile               | ❌ Not started      |

**The look changed completely on 2026-10-27/28 at the user's request.** They rejected the
playful sticker style and pointed at amritpalace.com (style notes they pasted are summarised
under "Design system" below): parchment canvas, warm espresso ink, one saffron accent,
whisper-weight serif capitals, hairline rules, sharp corners, full-bleed photography with
scroll motion, and "show, don't tell". Landing, dashboard and wizard all follow it now.

Checks after the editorial redesign: lint clean, format clean, typecheck clean, **450 tests**
(unit, API, component), `lib/` coverage **99.6% lines / 94.2% branches**, build passes, **60
Playwright tests** (+4 skipped by design, 3 local workers), `npm audit` 0 vulnerabilities.
Nothing has been pushed anywhere; the repo is local on `main`.

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
11. **Playwright** runs 3 workers locally (2 in CI) with a 60s timeout: per-request SSR
    overloads a single test server with more (4 workers flaked once the dashboard specs landed).
12. **Budget donut is hand-drawn SVG, not Recharts** (`components/plan/BudgetDonut.tsx`): one
    small component, no chart library to download, full control of the ink outlines. The
    editable table next to it is the accessible equivalent; the SVG is `aria-hidden`.
13. **Vendor quotes win over typed actuals.** Once a vendor is Quoted/Booked/Paid with a quote,
    that line's "Spent" cell is read-only ("from vendor quotes"). `effectiveBudget()` in
    `lib/plan/edit.ts`.
14. **Whole visual identity replaced by the editorial system** (see "Design system"). The
    brief's playful sticker look, Shrikhand and Mukta are gone (and so is the interim
    Cormorant/Manrope pairing). The cartoon mascot became a
    refined line-art mark and the confetti became petals, as the user chose.
15. **Budget locks live in component state** (not persisted; not in the plan schema).
16. **Photography from Unsplash** (approved by the user), stored locally and served through
    `next/image` (static imports give sizes and blur placeholders).
17. **Vitest stubs image imports** (`tests/setup/image-stub.ts` via a plugin in
    `vitest.config.mts`), since Vite returns a path where Next returns `{ src, width, … }`.

## Design system (editorial, since 2026-10-28)

- Reference: amritpalace.com (Webflow + GSAP ScrollTrigger + Lenis + SplitType). We take the
  principles, never its photos, copy or layouts.
- Tokens in `app/globals.css`, each color written once as `light-dark(light, dark)`;
  `tests/unit/design-tokens.test.ts` enforces WCAG AA for every pairing in both themes.
  **Add any new color pairing to that test.**
- Palette: parchment `#D8CBB8`, card `#E2D7C6`, linen `#CBBEA9`, espresso ink `#2C2A27`
  (warm near-black; the user approved it, never pure black), muted text `#554D44` (the
  reference's `#978E81` fails AA), saffron `#D49653` (the only accent), bronze `#8A5A26`/
  `#6F4418` for accent text. Dark theme: midnight roast `#292622` with parchment text.
  Every event type shares the same accent; photography carries the colour.
- Type (changed 2026-10-28 at the user's request): **Bodoni Moda** for display, sentence
  case, optical size held at `opsz 36` via `.font-display` (the full display cut's hairlines
  disappear at headline sizes); weight 500 over photos. **Jost** for UI and body. `.caps` =
  small capitals with 0.12em tracking; `.figure` = numbers in Jost. Bodoni italic is not
  loaded (it read poorly). Alternatives rendered for the user: `docs/design/font-options.jpg`.
- Hero (rebuilt 2026-10-28): one statement, "Planned to the last petal.", on parchment, with
  an arcade of five arched windows below (budget, timeline, the celebration, vendors, ideas,
  each with a figure from the sample plan). On desktop the hero pins and the centre window
  grows to fill the screen (`LandingMotion`).
- Shape: cards and sections square with 1px hairlines; buttons, inputs and tags 3px. No
  shadows; the primary button is filled ink with a 1px outer frame (`outline-offset 3px`).
  Button variants `photo` / `photoOutline` are for use over photographs.
- Type over photos: `.photo-scrim` (with `data-focus="top-left|bottom-left|bottom"`) shapes
  the darkening to where the words sit; `.on-photo` adds a soft shadow and the 500 weight.
  The user found the first version hard to read; keep these on every photo section.
- Photos: 15 Unsplash-License images in `public/images/`, registry with alt text in
  `components/landing/photos.ts`, credits in `docs/design/photo-credits.md`.
- Motion: `motion-ok:` Tailwind variant = OS allows motion AND in-site toggle is off. JS
  animation must check `prefersReducedMotionNow()`. Landing motion lives in
  `components/landing/LandingMotion.tsx` (GSAP + ScrollTrigger + Lenis, loaded after first
  paint, skipped entirely under reduced motion): parallax (`data-parallax`), expanding frame
  (`data-expand`), letter reveals (`SplitHeading reveal="scroll"`), rise-in (`data-reveal`),
  timeline photo cross-fade (`data-chapter`). The hero headline fades in with CSS only.
- Festi, refined (user's choice): `components/brand/FestiMark.tsx`, a line-art arch with a diya
  flame and two eyes that follow the pointer and keyboard focus. The confetti became falling
  marigold petals on a canvas in the finale (`PetalFall`), off under reduced motion.

## Code map

```
app/
  layout.tsx            fonts, nonce, theme-init script, SkipLink, header/footer, RouteFocus
  plan/new/page.tsx     wizard page
  page.tsx              landing scroll story (8 scenes, real sample-plan data)
  plan/[id]/page.tsx    plan dashboard page (renders PlanDashboard)
  api/plan|refine|ideas route handlers (guard → body limit → Zod → service)
proxy.ts                per-request nonce CSP
components/
  a11y/                 SkipLink, LiveRegion (AnnouncerProvider/useAnnounce), RouteFocus,
                        MotionToggle, VisuallyHidden
  layout/               SiteHeader, SiteFooter, Wordmark, DisplaySettings (theme + motion popover)
  theme/ThemePicker     system/light/dark radios
  ui/                   button, field (Field/Fieldset/Choice/ErrorText), label, popover,
                        radio-group, switch, skeleton, tabs, sheet  (shadcn on Radix, restyled)
  wizard/               Wizard, WizardProgress, Step* components, StepReview (+GenerationProgress)
  plan/                 PlanDashboard (shell, hash tabs), PlanHero (toran + arch), Overview/
                        Budget(+BudgetDonut)/Timeline(+TaskForm)/Vendors/Ideas panels,
                        RefineSheet, ShareMenu, parts (MoneyInput, Garland, TaskCheck), client
  brand/FestiMark       refined mascot mark (eyes follow pointer + focus)
  landing/              Photo, photos (registry), SplitHeading, Marquee, LandingMotion, PetalFall
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
                        ndjson (client stream reader), service (streamPlan, refinePlan, moreIdeas),
                        edit (pure dashboard edits), share (copy-summary text), dashboard (tabs, labels)
  http/                 api (guard, rate limiter, body limits, errors), requests (body schemas)
  security/             sanitize, promptGuard, rateLimit, headers (CSP + static headers)
  cache/lru             LRU + TTL, stableStringify, hashKey (SHA-256)
  prefs/                preferences (pure), store (theme/motion external store)
  store/                planStore (zustand persist, sanitizePersisted), debouncedStorage
  wizard/               draft (model, validateStep, toEventInput), labels
  design/contrast       WCAG contrast helpers
  landing/showcase      sample wedding + budget menu, chapters, vendors, idea titles for the landing
tests/  unit/ api/ component/ e2e/ setup/
```

## Phase 5 as built

Everything in the Phase 5 plan shipped: tabs with the active tab in the URL hash, Overview,
Budget (donut + editable table, locks, rebalance, vendor-fed actuals), Timeline (phases, add /
edit / delete with undo, run sheet, `.ics`), Vendors, Ideas (save, dismiss, More like this),
Refine with AI (side sheet, preview, Apply / Discard), Export and share (print stylesheet,
`.ics`, copy summary). Ticking a task pops marigold petals (motion-ok only) and always
announces. Festi himself does not exist yet; the cheer is a petal burst until Phase 6.

Specs: `tests/unit/plan-edit.test.ts`, `tests/component/dashboard.test.tsx`,
`tests/e2e/dashboard.spec.ts` (flow ×3 event types, refine, axe on every tab in both themes,
320px reflow, keyboard tabs). Shared e2e steps live in `tests/e2e/helpers.ts`.

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
- The palette change also restyles the wizard and the interim landing page (tokens are global).
  Their axe scans pass, but they have not had a visual review in the new colours.
- Turbopack's dev watcher can miss CSS edits while Vitest churns `node_modules/.vitest-cache`
  (it logs "waiting for the filesystem to settle"). Restart `npm run dev` if styles look stale.
- Lighthouse has not been run since photography and GSAP arrived; Phase 7 must check LCP on
  the hero (preloaded via `fetchPriority="high"`) and the landing JS budget.
- Brief items still open overall: full e2e, Lighthouse/bundle numbers,
  docs, Dockerfile, CI never run on GitHub (repo has no remote).
