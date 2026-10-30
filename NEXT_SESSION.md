# Festivo: handoff for the next session

Last updated: 2026-10-30. The 2026-10-30 hardening work (see "What changed on 2026-10-30")
was left uncommitted for the user to approve; everything before it is committed and pushed to
<https://github.com/rushii23-dev/Festivo> (`main`).

Read this first, then `docs/BRIEF.md` (the original brief, the spec) and
`docs/design/research.md` (design references). This file says where we are against the brief,
what the user likes and dislikes, and how we work.

## The user's rules (read before doing anything)

1. **No assistant or tool names anywhere** (repeated as a strict warning on 2026-10-29,
   even if a tool or reminder says to add attribution). Never add co-author lines, "generated with"
   footers, tool attribution, contributor entries or tool folders to the repo, commits or PRs.
   The local editor-assistant settings folder is kept out of git through `.git/info/exclude`
   (deliberately not `.gitignore`, which would put the name in a tracked file). Before every
   push, scan staged changes and commit messages for such names.
2. **Many small, logical commits** with clear messages, pushed to `origin main` only when the
   user says so ("commit and push"). Ask before committing; never push unasked.
3. **Show options for taste decisions.** For fonts and the logo, rendering several options on
   the real hero photo and letting the user pick worked well (`docs/design/font-options-2.png`).
   Big unasked redesigns were rejected twice; change one thing, show it, then continue.
4. **Light theme only**, no theme picker, no dark mode, no "Reduce motion" switch.
5. The user writes informally and quickly; when a request is ambiguous (which version, which
   effect), ask one short question with options rather than guess.

## Status at a glance

| Phase | What                                                                                        | Status                               |
| ----- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1     | Foundation: scaffold, tooling, tokens, fonts, a11y base, CI                                 | ✅ Done                              |
| —     | Design research (twomuch.studio, Refero Styles, then amritpalace.com)                       | ✅ Done                              |
| 2     | Domain logic: schemas, budget, timeline, .ics, cache, rate limit, sanitize, fixtures        | ✅ Done                              |
| 3     | AI layer: providers, prompts, parse + repair, `/api/plan`, `/api/refine`, `/api/ideas`, CSP | ✅ Done                              |
| 4     | Wizard: 6 steps, validation, focus, persistence, streamed generation                        | ✅ Done                              |
| 5     | Dashboard at `/plan/[id]`: 5 tabs, refine sheet, export                                     | ✅ Done                              |
| 6     | Landing page, brand (seal + wordmark), editorial redesign of every page                     | ✅ Done                              |
| 6b    | Device-only account, 36 occasions after Luma, adaptive wizard, animated planning buttons    | ✅ Done                              |
| 7     | Hardening: e2e per brief, bundle analysis and budgets, audits, a11y and security passes     | ✅ Done (Lighthouse not run)         |
| 8     | Docs + deployment: README, ARCHITECTURE/SECURITY/ACCESSIBILITY.md, Dockerfile, CodeQL       | ✅ Done (Docker build untested here) |

Last full check (2026-10-30): lint clean (type-aware rules and ceilings), Prettier clean,
typecheck clean, `npm audit` 0, **556 Vitest tests** passing with coverage 96.4% statements /
88.1% branches / 95.2% functions / 97.1% lines over the whole app (98.6 / 92.3 / 98.2 / 99.3 on
`lib/`), **77 Playwright tests** passing on desktop and mobile through Edge (7 skipped by design),
bundle budgets met (`/` 147 KB, `/plan/new` 197 KB, `/plan/[id]` 222 KB gzipped).

## What changed on 2026-10-30 (quality pass against Project FanFare)

The user asked for every judging criterion to be "the best", better than their other project
<https://github.com/rushii23-dev/Project-FanFare>, with a score comparison.

1. **Efficiency.** Landing first-load JS 214 → 147 KB gzipped (the brief's 150 KB target), new
   plan 218 → 197 KB, dashboard 254 → 222 KB. How: the header's account menu loads after
   hydration (`components/layout/AccountMenuSlot.tsx`); the error boundary uses
   `components/ui/button-variants.ts` instead of the Button (drops the class merger); photos are
   named exports so client pages ship only their placeholders; the wizard and plan store load
   while the account form shows (`components/onboarding/Onboarding.tsx`); the dashboard's hidden
   tabs, Refine sheet and share menu are lazy chunks with identical stand-ins that remember a
   click (`components/plan/deferred.tsx`, `triggers.tsx`). The dashboard's main view stays in the
   first load on purpose (deferring it would delay the hero photo). `npm run bundle:check`
   (`scripts/bundle-budget.mjs`) enforces per-route budgets in CI. Identical in-flight AI
   requests now share one call (`lib/cache/singleFlight.ts`).
2. **Security.** Rate-limit key read from the right of X-Forwarded-For (`TRUSTED_PROXY_HOPS`),
   IPv6 grouped by /64, eviction never frees a blocked client; bodies capped while streaming
   (chunked uploads) with strict UTF-8; `Sec-Fetch-Site` cross-site refusal; API responses get
   `default-src 'none'`; Origin-Agent-Cluster and X-Permitted-Cross-Domain-Policies headers;
   Gemini retries transient failures (`GEMINI_RETRIES`); every `lib/ai` module is
   `server-only`; the shadcn CLI devDependency was removed (its CSS import was unused), so
   `npm audit` reports 0. CodeQL and Dependabot (npm, actions, docker) added.
3. **Code quality.** ESLint gained type-aware rules (floating promises, exhaustive switches,
   deprecations…) and ceilings (complexity 20, depth 4, 5 params, 400 lines; data catalogues and
   tests exempt). `validateStep`, `mockRefine`, `PlanSoFar`, `selectIdeas` were refactored to
   fit; the landing page's timeline and finale moved to `components/landing/TimelineSection.tsx`
   and `FinaleSection.tsx`. `tsconfig` adds `exactOptionalPropertyTypes` and
   `noImplicitReturns`. Deprecated `FormEvent` and zod `.finite()` replaced.
4. **Accessibility.** Fixed an invisible keyboard focus on the wizard's event cards (the CSS
   targeted a class no element had; now `[data-choice-card]`). Forced-colours support (selection,
   radio dots, progress bar, active tab). The 404 page has its own title. Budget figures stack at
   200% text. New `tests/e2e/accessibility.spec.ts`: forced colours, 200% text (desktop), visible
   focus, page titles, reduced-motion axe scan.
5. **Docs and deploy.** README rewritten for judges; `ARCHITECTURE.md`, `SECURITY.md` (threat
   model), `ACCESSIBILITY.md`, MIT `LICENSE` (same holder as FanFare), multi-stage non-root
   `Dockerfile` + `.dockerignore` (standalone output only when `NEXT_OUTPUT=standalone`), CI
   jobs for the bundle budget, a client-bundle secret scan and a Docker build.

6. **Testing.** Coverage now spans the whole app (components, hooks, pages, routes,
   `proxy.ts`), ratcheted at 95/86/94/96 with `lib/` held at 97/90/97/98; only the root layout,
   GSAP scenes and canvas petals are excluded (browser-only, covered by Playwright). New suites:
   `tests/component/surfaces.test.tsx`, `wizard-branches.test.tsx`, `deferred.test.tsx`,
   `tests/unit/proxy.test.ts`, `headers.test.ts`, plus API tests for chunked bodies, UTF-8,
   Sec-Fetch-Site, forged X-Forwarded-For, single flight and retries. The unused `label`,
   `radio-group` and `switch` primitives were deleted.

**Open decision for the user:** WCAG 2.2.2 (Pause, Stop, Hide) wants a pause control on the two
endless animations (ideas marquee, finale petals). The user earlier rejected a site-wide
"reduce motion" switch, so this was not added without asking.

## What changed on 2026-10-29

1. **Account before planning** (`components/onboarding/`, `lib/profile/`,
   `lib/store/profileStore.ts`). "Start planning" opens a sign-up screen (name, optional
   email, no password), then a short welcome, then the wizard. The profile is validated, kept
   in this browser only (`festivo:profile`) and never sent anywhere. The header shows the
   planner's initials with Sign out (`components/layout/AccountMenu.tsx`). Returning planners
   go straight to the wizard. Account and welcome screens keep a photo on the left.
2. **Occasions after Luma** (`lib/events/`). 36 occasions in 4 groups: life moments,
   festivals, meetups and communities (Luma's 12 discover categories), work and causes. Each
   occasion names its planning family (`eventType` stays wedding/birthday/community), a
   planning profile (budget split, vendors, task changes, demo fixture) and which questions
   apply: format (in person, online, hybrid), tickets (free/paid, price, capacity, approval),
   age, children, days, wedding functions. Online events drop venue, food and décor and gain
   an online platform line and a streaming vendor. `PlanKind` (event input or a plan) is what
   every budget, vendor and timeline function now takes. Plans saved before keep working.
3. **The wizard has no photos** (user's request). The left side is a parchment "Your plan so
   far" card that fills in as people answer (`components/wizard/PlanSoFar.tsx`). Step one picks
   a group, then an occasion. Later steps show only the questions that apply.
4. **Every "Start planning" has its own animation**, all sharing `usePressToGo` (a click plays
   the animation for about half a second, then navigates; reduced motion and new-tab clicks
   skip it). The user asked for variety, not one style everywhere:
   - **Palace arch** (`ArchButton`): hero (`tone="photo"`) and the plan-not-found page (dark
     window on parchment). Hover lights it from below like a lamp; a click sends out rings of
     light and petals.
   - **Diya** (`DiyaButton`): the header. The lamp's flame lights and flickers on hover and
     flares on click.
   - **String of lights** (`LightsButton`): "Start your plan" over the dinner-under-lights
     photo. Bulbs light one by one on hover and twinkle on click.
   - **Marigold toran** (`ToranButton`): the finale. The garland sways on hover; on click
     the flowers fall.

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

**Running Playwright on this machine.** Playwright's own Chromium is not installed (installing
it is a download; ask first). We ran the suite through the installed Edge with a throwaway
config, deleted afterwards (never commit it):

```ts
// .pw-edge.config.ts
import base from "./playwright.config";
const config = {
  ...base,
  projects: base.projects?.map((p) => ({ ...p, use: { ...p.use, channel: "msedge" } })),
};
export default config;
```

Then `npx playwright test --config .pw-edge.config.ts`. ESLint flags this file while it exists;
lint after deleting it.

**Stale styles in dev.** Turbopack's dev cache sometimes keeps serving an old `globals.css`
(even across restarts). If a CSS change does not show, stop the dev server, delete
`.next/dev`, start again. Only one `next dev` may run per folder; another session's server on
port 3000 blocks a second one.

## Working rules from the brief

- After each piece of work: `npm run lint`, `npm run typecheck`, `npm test`, Playwright, fix
  everything, summarise, then commit when the user says so.
- Business logic in `lib/` as small pure functions with tests; components stay thin.
- No `any`, no `dangerouslySetInnerHTML` (lint enforces `react/no-danger`).
- Design must be original (see "What we deliberately do not take" in the research doc).
- Before touching Next.js APIs, check the bundled docs in `node_modules/next/dist/docs/`:
  this is Next 16.4, which differs from older versions (see `AGENTS.md`).
- Windows dev machine: use absolute paths; the repo is LF via `.gitattributes`. Long inline
  `node -e` scripts with nested quotes break in the shell; write a script file and run it.

## What the site looks like now

**Direction:** editorial and rich, after <https://amritpalace.com/> (the user's reference):
parchment, warm espresso ink, one saffron accent, Cormorant Garamond, full-bleed photography,
hairline rules, staged reveals and scroll motion. Clean, never crowded.

**Palette** (`app/globals.css`, plain hex tokens, one light theme): parchment `#D8CBB8`
background, card `#E2D7C6`, linen `#CBBEA9`, espresso ink `#2C2A27` (never pure black),
muted text `#554D44`, saffron `#D49653` (the only accent), bronze/gold `#8A5A26` for ornaments.
Photo sections use `#292622` with parchment text `#E2D6C3`; gold on photos `#E8C48F`.
`tests/unit/design-tokens.test.ts` checks WCAG AA for every pairing: **add new pairings there**.

**Type:** Cormorant Garamond (display, weight 500; `.font-display`) with its italic at 600 for
the wordmark (`.wordmark`); Jost for UI and body. `.caps` = small capitals, 0.12em tracking;
`.figure` = numbers in Jost. Scale tokens `--text-display/headline/title` were retuned for
Cormorant (it sets small). Buttons are Jost small capitals, 3px corners, the primary one
filled ink with a 1px outer frame; `photo` / `photoOutline` variants for use over photographs.

**Brand:** `components/brand/FestivoSeal.tsx`, a marigold rosette around a lit diya in 1px
hairlines with a saffron flame (pass `flame="currentColor"` on saffron backgrounds), next to
"Festivo" in Cormorant italic (`components/layout/Wordmark.tsx`). `app/icon.svg` is the seal
for browser tabs.

**Landing page** (`app/page.tsx`, real sample-plan data from `lib/landing/showcase.ts`):

1. **Hero:** full-bleed ballroom mandap (golden chandelier, flower mandap, candles). Only
   "Planned to the last petal." (sentence case, small) in the bottom-left corner, a gold
   diamond rule and two calls to action (the palace-arch "Start planning", and "See how it
   works" in italic with a gold arrow). The header floats over the
   photo (`body:has([data-hero-photo])` rules in `globals.css`). Staged CSS entrance: photo
   fades and settles, letters appear, the rule draws out, buttons rise, the header arrives last.
2. **The growing window** (`[data-window-grow]`, the effect the user loves): a palace-arch
   window in the middle of parchment grows while the section is pinned until the photo (a
   dinner under trees strung with lights) fills the screen; the corner shade
   (`.photo-scrim[data-focus="corner"]`) and "Every detail, held in one place" fade in at the
   end. The section is wrapped in a plain `<div>` so ScrollTrigger's pin spacer stays inside
   a node React owns: pinning a direct child of `<main>` broke client-side navigation away
   from `/`. Without motion it is simply a full-bleed photo with the copy.
3. **Budget** as a saffron menu card with the sample wedding's lines, plus three figures.
4. **Timeline** in chapters with a sticky photo that cross-fades per chapter.
5. **Vendors**: who to call, status, the question to ask.
6. **Ideas marquee** (a dark band).
7. **Three celebrations** (wedding, birthday, community) as photo cards.
8. **Finale** on parchment with a warm glow: seal, "Your celebration, beautifully planned",
   gold ornament, the button, and five palace-arch windows on a gold ledge, petals falling.

**Motion** (`components/landing/LandingMotion.tsx`, GSAP + ScrollTrigger + Lenis, loaded after
first paint): parallax (`data-parallax`), the growing window, letter reveals
(`SplitHeading reveal="scroll"`), rise-in (`data-reveal`), timeline photo cross-fade
(`data-chapter`). The site always animates unless the **device** asks for reduced motion;
`public/prefs-init.js` sets `<html data-motion>` before paint, `lib/prefs/store.ts` tracks the
OS setting, `prefersReducedMotionNow()` guards JS animation, and the `motion-ok:` variant
guards CSS. A choice saved by the old in-site switch (`festivo:prefs` in localStorage) is
ignored on purpose. Split headings use inline letters so kerning survives.

**Wizard and dashboard** use the same system (Cormorant titles, parchment, photo hero on the
dashboard). The wizard title has a gold ornament rule (`.ornament-rule`).

**Photos:** 15 Unsplash-License images in `public/images/`, registry with alt text in
`components/landing/photos.ts`, credits in `docs/design/photo-credits.md`. New photos need the
user's OK before downloading.

## Design history (what the user accepted and rejected)

Knowing this avoids repeating rejected directions.

1. Playful sticker style with Shrikhand/Mukta and a cartoon mascot: **rejected** ("not rich").
2. Editorial direction after amritpalace.com: **accepted** and still the basis.
3. Hero with an arcade of five arched windows on parchment: liked at first ("very cool"),
   then they wanted more. Its centre window grew to fill the screen on scroll, and **that
   grow-to-fill effect is what they love**; it lives on as section 2.
4. A full redesign: blush/oxblood palette, Gloock, an "invitation card" hero with a marigold
   toran: **rejected** ("it looks bad"). Kept locally only in `git stash@{0}` ("Invitation
   hero redesign (set aside)"); delete it if the user agrees.
5. Full-bleed photo hero in the reference's manner: **accepted**, then simplified at the
   user's request (no side labels, no sample-plan card, no description line, no second photo):
   "not everything at once", "clean and very sweet".
6. Dark theme and theme picker removed; the Reduce motion switch removed ("I don't want users
   to remove motion").
7. Bodoni Moda: **rejected**. Cormorant Garamond chosen from six rendered options.
8. Logo: the old line-art "Festi" with moving eyes replaced by the seal and italic wordmark
   (option B of six; option A, a script wordmark, was the runner-up).
9. A Christmas banquet table photo was tried in the growing window and dropped (off-brand
   reindeer); the dinner under the lights replaced it.
10. Wizard with a changing photo beside each step: **rejected** ("no photos should be
    there"); replaced by the plan card.
11. Hero buttons: four styles were rendered on the ballroom photo (gilded frame, saffron seal,
    palace arch, invitation card). The gilded frame was picked first, then the **palace arch**
    with a "very beautiful" hover and click animation. The same arch on every button was
    **rejected** ("use some creativity"); each button now has its own idea.

## Decisions that differ from (or refine) the brief, and why

1. **CSP uses per-request nonces, so Cache Components is off.** Next's inline bootstrap
   scripts cannot be hashed in advance; `proxy.ts` (Next 16's middleware) sets
   `script-src 'self' 'nonce-…' 'strict-dynamic'` and the layout passes the nonce to
   `public/prefs-init.js`. PPR cannot carry nonces, so every page renders per request.
2. **The AI returns a lean draft, not a full Plan.** Code computes every date, ID and exact
   budget sum (`lib/plan/fromDraft.ts`).
3. **Default Gemini model `gemini-flash-latest`**, overridable with `GEMINI_MODEL`. **Never
   called with a real key**; all Gemini tests use MSW.
4. **Added `/api/ideas`** for "More like this" (one category at a time).
5. **Plan schema additions:** `dateFlexible`, `vibes`, `createdAt`, idea `dismissed`, task
   `time` (for the run sheet).
6. **Budget math in whole currency units** with largest-remainder rounding.
7. **PDF export is a print stylesheet** (not `@react-pdf/renderer`).
8. **3D (R3F) skipped**; photography and motion carry the landing page.
9. **Rate limit is configurable**; Playwright raises it because all tests share one IP.
10. **Lint:** `jsx-a11y/control-has-associated-label` ignores native inputs (labels come from
    `<label htmlFor>`); verified by axe and role queries in tests.
11. **Playwright** runs 3 workers locally (2 in CI), 60s timeout.
12. **Budget donut is hand-drawn SVG**, not Recharts; the editable table is the accessible
    equivalent.
13. **Vendor quotes win over typed actuals** (`effectiveBudget()` in `lib/plan/edit.ts`).
14. **Budget locks live in component state** (not persisted).
15. **Photography from Unsplash**, stored locally, served through `next/image`.
16. **Vitest stubs image imports** (`tests/setup/image-stub.ts`).
17. **Light only, device-only motion preference** (user's request; see "Motion").
18. **The home page's axe scan waits for finite animations to finish** (mid-fade text is half
    transparent); endless loops such as the marquee are skipped
    (`tests/e2e/foundation.spec.ts`).

## Code map

```
app/
  layout.tsx            fonts (Cormorant Garamond, Jost), nonce, prefs-init script,
                        SkipLink, header/footer, RouteFocus
  page.tsx              landing page (8 sections, real sample-plan data)
  plan/new/page.tsx     account → welcome → wizard (Onboarding)
  plan/[id]/page.tsx    plan dashboard page (renders PlanDashboard)
  api/plan|refine|ideas route handlers (guard → body limit → Zod → service)
  icon.svg              the seal as the tab icon
proxy.ts                per-request nonce CSP
public/prefs-init.js    sets data-motion before first paint (device setting only)
components/
  a11y/                 SkipLink, LiveRegion (AnnouncerProvider/useAnnounce), RouteFocus,
                        VisuallyHidden
  brand/FestivoSeal     the seal
  layout/               SiteHeader, SiteFooter, Wordmark, AccountMenu
  ui/                   button, field, label, popover, radio-group, switch, skeleton,
                        tabs, sheet (shadcn on Radix, restyled)
  onboarding/           Onboarding (gate), CreateAccount, Welcome, Stage (photo + question),
                        StageHeading, stagePhotos
  wizard/               Wizard, WizardProgress, PlanSoFar, Step* components, StepReview
  plan/                 PlanDashboard, PlanHero, Overview/Budget(+BudgetDonut)/
                        Timeline(+TaskForm)/Vendors/Ideas panels, RefineSheet, ShareMenu, parts
  landing/              Photo, photos (registry), SplitHeading, Marquee, LandingMotion,
                        PetalFall, ArchButton, DiyaButton, LightsButton, ToranButton,
                        usePressToGo
hooks/                  use-hydrated-store, use-hydrated-profile, use-plan-generation
lib/
  events/               occasions (catalog, groups, styles per group), profiles (budget,
                        vendors, task changes), kind (PlanKind → categories, vendors, tasks)
  profile/              profile schema, validation, initials
  schemas/ budget/ timeline/ vendors/ ideas/ fixtures/ ai/ plan/ http/ security/ cache/
  prefs/                preferences (REDUCED_MOTION_QUERY, motionAttribute), store (OS setting)
  store/                planStore (zustand persist), debouncedStorage
  wizard/               draft model, labels
  design/contrast       WCAG contrast helpers + hex token parser
  landing/showcase      sample wedding, budget menu, chapters, vendors, idea titles
tests/  unit/ api/ component/ e2e/ setup/
docs/   BRIEF.md, design/ (research, photo credits, font options, hero studies)
```

## Next steps

1. **Commit** the 2026-10-30 work as small logical commits once the user approves (efficiency,
   security, lint gates and refactors, accessibility, tests, docs and deploy), then push only
   when they say so. `.pw-edge.config.ts` must not be committed.
2. Ask about the **pause control** for the marquee and petals (WCAG 2.2.2).
3. After the first push, check the GitHub Actions tab: the new `docker` and CodeQL jobs have
   never run.
4. Optional: a Lighthouse mobile run (needs the `lighthouse` npm package; ask first), and a
   manual NVDA / VoiceOver pass.

Possible design follow-ups the user may ask for: richer photo for the growing window (would
need a new Unsplash download, with permission), the remaining dark bands (ideas marquee, the
three celebration cards) if they want everything lighter, and a closer look at the dashboard
and wizard for the same "clean and rich" standard.

## Known issues and loose ends

- **CI on GitHub not checked.** `.github/workflows/ci.yml` runs on pushes now that the repo has
  a remote; the GitHub CLI is not installed here, so look at the repo's Actions tab.
- Gemini untested with a real key (decision 3).
- Vitest 5 warns about Node 25 (unsupported engine); CI uses Node 24 LTS. Harmless locally.
- `gsap-skills.zip` / `lenis-skill.zip` sit in the repo root, git-ignored; safe to delete.
- The `magic` MCP server fails to connect (API key); not needed.
- The bride photo is still used on the "Weddings" card (section 7); the user only removed it
  from the hero.
- Lighthouse has not been run since photography and GSAP arrived (bundle budgets are enforced
  instead; a Lighthouse pass would need its npm package).
- The Dockerfile and the CI "Container image" job were not run here (no Docker on this machine).
- WCAG 2.2.2: no pause control on the marquee and petals yet (see the open decision above).
- Git author name is the email address (`rushipvt23@gmail.com`); offer to set a display name.
- **The dashboard hero photo still follows the three families**, so a book club or hackathon
  plan shows the festival drummers. Make it follow the occasion (or drop it) if the user
  wants; ask first, and new photos need their OK.
- "Plan your budget" (budget menu card) and the three celebration photo cards also open the
  planner but have no special animation; the user only asked about "Start planning".
- Account and plans live in one browser; there is no server account (the user chose this).
- Leftover processes: stopping a background `next start` or preview server can leave its
  `node` child running and holding the port (3000, 3200–3204 here). Use a new port or ask the
  user to end the process; stopping it from here was not allowed.
