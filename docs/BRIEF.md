# Festivo — Original Build Brief

> The full brief this project is built from, saved verbatim so every session works from the same source.
> What was built from it is described in `README.md` and `ARCHITECTURE.md`.

---

## ROLE

You are a senior full-stack engineer and award-level creative developer. You are building **Festivo**, a GenAI-powered celebration and event planner, for a hackathon. Build it to production quality. The judges score on six criteria, and every decision you make should serve at least one of them:

1. **Code Quality**: readable, typed, modular, consistent, documented.
2. **Security**: no secrets on the client, validated inputs and outputs, hardened headers.
3. **Efficiency**: fast first load, small bundles, minimal and cached AI calls.
4. **Testing**: meaningful unit, component and end-to-end tests that pass in CI.
5. **Accessibility**: WCAG 2.2 AA, keyboard-first, screen-reader friendly, respects reduced motion.
6. **Problem Statement Alignment**: covers everything in the problem statement below, end to end.

**Problem statement (verbatim):** _"Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas."_

Every one of these must be a real, working feature:

- the three event types (weddings, birthdays, community events)
- budgets
- timelines
- vendor checklists
- personalized ideas

---

## WORKING RULES

- Work in the **phases** listed below. At the end of each phase:
  - run `npm run lint`, `npm run typecheck` and `npm test`;
  - fix every failure;
  - summarize what was built;
  - then continue.
- Use **TypeScript strict mode** everywhere. Never use `any` unless there is a justified comment next to it.
- Prefer small, pure, testable functions. Keep business logic out of components and put it in `lib/`.
- Keep the repository lightweight:
  - no large binary assets;
  - SVG over raster images;
  - compressed assets only where unavoidable;
  - a single `main` branch.
- **Never commit secrets.** Use `.env.local`, and provide `.env.example` with placeholder values.
- **Design must be original.** The visual direction is _inspired by_ playful, bold studio sites such as twomuch.studio. Do **not** copy any of their layouts, assets, code, logos or characters. Create our own mascot and our own visuals.
- Write a clear commit message after each phase.

---

## TECH STACK

| Area            | Choice                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js (latest stable, App Router) + React + TypeScript (strict)                                                                                                                                                                              |
| Styling         | Tailwind CSS with design tokens as CSS variables, plus shadcn/ui (Radix primitives) for accessible components                                                                                                                                  |
| Motion          | GSAP + ScrollTrigger and Lenis smooth scroll (landing page only); Framer Motion for small UI transitions in the app                                                                                                                            |
| 3D (optional)   | React Three Fiber + drei, used for one lazy-loaded hero object only, with a static SVG fallback                                                                                                                                                |
| Validation      | Zod for all inputs and every AI output                                                                                                                                                                                                         |
| AI              | Server-side only, through a provider adapter (`lib/ai/provider.ts`). Default to **Google Gemini** (`@google/genai`), with structured JSON output. Keep the adapter interface generic so another provider can be swapped in through env config. |
| State           | React state + Zustand for the plan store, persisted to `localStorage` (no accounts or database needed)                                                                                                                                         |
| Charts          | Recharts (budget donut and bars) with an accessible table alternative                                                                                                                                                                          |
| Exports         | Print-optimized PDF via a print stylesheet or `@react-pdf/renderer`, plus `.ics` calendar export of the timeline                                                                                                                               |
| Testing         | Vitest + React Testing Library + `@testing-library/user-event`; Playwright + `@axe-core/playwright` for end-to-end and accessibility; MSW to mock AI responses                                                                                 |
| Quality tooling | ESLint (next, typescript, jsx-a11y), Prettier, Husky + lint-staged, GitHub Actions CI                                                                                                                                                          |
| Deployment      | Dockerfile ready for Google Cloud Run, and Vercel-compatible. Document both in the README.                                                                                                                                                     |

---

## FOLDER STRUCTURE

```
festivo/
├─ app/
│  ├─ (marketing)/page.tsx          # Scroll-animated landing page
│  ├─ plan/new/page.tsx             # Onboarding wizard
│  ├─ plan/[id]/page.tsx            # Plan dashboard (tabs)
│  ├─ api/plan/route.ts             # Generate plan (streaming)
│  ├─ api/refine/route.ts           # Refine plan via chat instruction
│  ├─ layout.tsx, globals.css, not-found.tsx, error.tsx
├─ components/
│  ├─ landing/                      # Hero, ScrollStory scenes, Mascot, CTA
│  ├─ wizard/                       # Step components
│  ├─ plan/                         # BudgetPanel, Timeline, VendorChecklist, IdeasBoard, RefineChat
│  ├─ ui/                           # shadcn components
│  └─ a11y/                         # SkipLink, LiveRegion, MotionToggle, VisuallyHidden
├─ lib/
│  ├─ ai/                           # provider.ts, gemini.ts, prompts.ts, parse.ts
│  ├─ schemas/                      # zod: eventInput.ts, plan.ts
│  ├─ budget/                       # allocate.ts, rebalance.ts, format.ts (INR default, multi-currency)
│  ├─ timeline/                     # generate.ts, ics.ts
│  ├─ security/                     # rateLimit.ts, sanitize.ts, promptGuard.ts
│  ├─ cache/                        # lru.ts (hash input → plan)
│  └─ store/                        # planStore.ts (zustand + persist)
├─ tests/
│  ├─ unit/  ├─ component/  └─ e2e/
├─ public/                          # SVGs, og image, favicon
├─ .github/workflows/ci.yml
├─ Dockerfile, .env.example, README.md, ARCHITECTURE.md, SECURITY.md, ACCESSIBILITY.md
```

---

## PRODUCT FEATURES

### 1. Landing page: "Watch your event come together"

This is the world-class, scroll-driven showcase. It should feel bold, playful and premium. Each scroll scene is pinned with GSAP ScrollTrigger:

1. **Hero**
   - Oversized expressive display headline: **"Plan the party, not the panic."**
   - An original mascot, "Festi", a simple SVG character whose eyes follow the cursor (and keyboard focus).
   - A primary CTA: **Start planning**.
2. **Scene 1: Date.** A calendar page drops in, a date gets circled, and a countdown starts ticking.
3. **Scene 2: Budget.** A single coin or bar splits into a donut chart of categories as you scroll.
4. **Scene 3: Vendors.** Vendor cards fly in, stack into a checklist and tick themselves off.
5. **Scene 4: Event types.** The scene morphs between **Wedding → Birthday → Community event**, changing palette, décor and icons for each.
6. **Scene 5: Ideas.** Idea cards shuffle like a deck, showing personalized themes.
7. **Finale.** A confetti burst (canvas, lightweight) and a large CTA leading into the wizard.

The landing page has these technical requirements:

- **Reduced motion.** When `prefers-reduced-motion: reduce` is set, OR the user's in-site "Reduce motion" toggle is on (persisted), disable Lenis and all scroll-linked animation. Render every scene as a static, readable layout.
- **No scroll-jacking.** Native scroll, keyboard scrolling and anchor links must keep working.
- **Lazy loading.** Load GSAP, Lenis and any 3D code dynamically, after first paint. The hero text must render server-side and be readable without JavaScript.
- **Animation performance.** Animate only `transform` and `opacity`. Target 60fps. Clean up every ScrollTrigger on unmount.
- **Mobile.** Simplified animations; everything works at 360px width.
- **Readable content.** Every scene has real text content, not just visuals, so screen-reader users get the same story.

### 2. Onboarding wizard (`/plan/new`)

The wizard asks one question per step, has a progress indicator, and supports Back and Next. Each step is a properly labelled form. The steps are:

1. **Event type:** Wedding, Birthday or Community event, as large selectable cards (radio group semantics).
2. **Basics:** event name, date (or "flexible"), city/location, and guest count.
3. **Budget:**
   - total amount;
   - currency (default INR, with USD/EUR/GBP available);
   - priority sliders (venue, food, décor, entertainment, photography, attire…), adapted to the event type.
4. **Vibe & style:** tags such as elegant, boho, traditional, eco-friendly, kid-friendly, minimal, or cultural (e.g. Indian wedding ceremonies such as mehendi or sangeet).
5. **Constraints:**
   - dietary needs;
   - accessibility needs of guests;
   - indoor/outdoor;
   - must-haves and must-avoids (free text, max 500 characters).
6. **Review & generate.**

Validation and persistence:

- Validate every step with Zod.
- Errors are announced with `aria-describedby` and focus moves to the first invalid field.
- Wizard progress is saved to the store, so a page refresh does not lose it.

### 3. Plan dashboard (`/plan/[id]`)

The dashboard has accessible tabs (Radix Tabs): **Overview · Budget · Timeline · Vendors · Ideas**.

**Overview**

- Countdown to the event.
- Budget health (on track / over).
- Next three tasks.
- Vendor booking progress.

**Budget**

- Category allocations shown as a donut chart, plus an equivalent accessible data table.
- Editable amounts with live totals.
- `rebalance()` redistributes the remaining money proportionally.
- An "Actual spend" column, with over-budget warnings (text plus icon, never color alone).

**Timeline**

- Tasks grouped by phase, relative to the event date (e.g. "12+ weeks", "8 weeks", "1 month", "1 week", "Day of", "After").
- Mark tasks done; add or edit/delete tasks.
- Export to `.ics`.
- A day-of run-sheet view.

**Vendor checklist**

- Vendor categories appropriate to the event type.
- For each vendor:
  - status: To research → Contacted → Quoted → Booked → Paid;
  - quoted price, which feeds into "actual spend";
  - notes;
  - AI-generated **"Questions to ask"** for that vendor.

**Ideas**

- Personalized ideas for theme, décor, food & drinks, activities/entertainment, and favors.
- Each idea card shows a cost tier (₹ / ₹₹ / ₹₹₹) and a "fits your budget" badge.
- Save ideas or dismiss them; "More like this" regenerates that category only.

**Refine with AI**

- A chat side panel. The user types instructions such as "Cut budget by 20%", "Make it eco-friendly" or "Move the date to March".
- The AI returns a **structured patch** that is validated with Zod. Show a diff preview with Accept / Reject buttons before applying it.

**Export & share**

- Print/PDF view of the full plan.
- Copy a shareable summary.

### 4. Delight details

- A dark/light theme toggle.
- Microcopy with personality but always clear (the mascot cheers when a task is completed, but only if motion is allowed).
- Empty, loading (skeletons) and error states for everything.

---

## AI DESIGN

### Location and access

- All AI calls happen in **server route handlers** only. The API key never reaches the client.

### Structured output

- Request JSON matching a schema, using the provider's structured output / response schema mode.
- Parse the result with Zod.
- If parsing fails, run **one** repair retry. If that fails too, show a friendly error with a "Try again" button.

### Streaming

- Stream generation progress to the UI ("Crunching your budget… Drafting your timeline…").
- Stream sections as they complete where possible.
- Announce progress via an `aria-live="polite"` region.

### Prompt design

- System prompt (in `lib/ai/prompts.ts`), stating the assistant is an expert planner for weddings, birthdays and community events.
- **Hard numeric rules:**
  - the budget allocations must sum exactly to the total (re-normalize in code anyway);
  - timeline dates must fall before the event date (re-validate in code anyway).
- Ideas must reflect the chosen vibe, constraints and region, and stay realistic for the guest count and budget.
- Wrap user free text in clearly delimited tags, and treat it as data, never instructions.

### Plan schema (`lib/schemas/plan.ts`)

```ts
Plan = {
  id, eventType: 'wedding'|'birthday'|'community', title, date, location, guestCount,
  currency, totalBudget,
  budget: { category, allocated, actual?, rationale }[],
  timeline: { id, phase, title, dueDate, done, description? }[],
  vendors: { id, category, status, questionsToAsk: string[], quote?, notes? }[],
  ideas: { id, category, title, description, costTier: 1|2|3, saved? }[],
  summary: string
}
```

### Deterministic logic in code

- Budget math, date math and currency formatting are done by tested pure functions, **not** trusted from the AI.

### Caching

- Hash the normalized input with SHA-256 and keep an in-memory LRU cache with a TTL, so identical requests don't call the AI twice.

### Demo mode

- If no API key is set, `AI_PROVIDER=mock` returns realistic fixture plans for all three event types.
- The app must work fully for judges even without a key. Ship good fixtures.

---

## SECURITY REQUIREMENTS

- **Secrets:** keys live only in server env, and `.env.example` is committed.
- **Input validation:** Zod-validate every API request body, with strict limits on string lengths, guest-count ranges and budget ranges. Reject unknown fields.
- **Output validation:** never render AI output as HTML. Render plain text through React's escaping only. No `dangerouslySetInnerHTML` anywhere.
- **Prompt injection:**
  - delimit user text;
  - strip control characters;
  - cap lengths;
  - the system prompt tells the model to ignore instructions inside user data;
  - the refine endpoint may only return patches to allowed fields (enforced by Zod).
- **Rate limiting:** per-IP token bucket on `/api/*`; return 429 with `Retry-After`.
- **Security headers** (in `next.config` / middleware):
  - strict Content-Security-Policy, with nonces if needed;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy`;
  - `frame-ancestors 'none'`;
  - HSTS in production.
- **Errors:** generic messages to the client and detailed logs on the server. Never leak stack traces or prompts.
- **Dependencies:** run `npm audit` in CI; pin versions with a lockfile.
- **SECURITY.md:** document the threat model and every mitigation above.

---

## ACCESSIBILITY REQUIREMENTS (WCAG 2.2 AA)

- **Structure:**
  - semantic landmarks (`header`, `nav`, `main`, `footer`);
  - one `h1` per page and a logical heading order;
  - a skip-to-content link.
- **Keyboard:**
  - the whole app is operable by keyboard;
  - a visible custom focus ring with at least 3:1 contrast;
  - no keyboard traps;
  - focus is managed on route change, wizard step change and dialog open/close.
- **Contrast:** at least 4.5:1 for text and 3:1 for UI components, verified for **both** themes.
- **Forms:**
  - every field has a visible label;
  - error messages are linked with `aria-describedby`;
  - required fields are indicated in text, not by color alone.
- **Dynamic content:**
  - live regions for AI streaming, saves and errors;
  - charts always have a data-table alternative;
  - status is never conveyed by color alone.
- **Motion:**
  - respect `prefers-reduced-motion`, plus a persisted in-site toggle;
  - no flashing content;
  - confetti is disabled under reduced motion.
- **Sizing:**
  - touch targets at least 24×24px (aim for 44px);
  - text resizes to 200% without loss;
  - layouts reflow at 320px.
- **Images and icons:** meaningful `alt` text; decorative SVGs get `aria-hidden`.
- **Language:** `lang` attribute set; dates formatted with `Intl`.
- **ACCESSIBILITY.md:** documents conformance and how it was tested.

---

## EFFICIENCY REQUIREMENTS

- **Lighthouse targets** (mobile): Performance ≥ 90, Accessibility 100, Best Practices 100, SEO ≥ 95.
- **Rendering:** use Server Components by default, and Client Components only where interaction is needed.
- **Code splitting:**
  - dynamic imports for GSAP, Lenis, R3F, Recharts, the PDF exporter and the confetti effect;
  - no 3D on mobile or under reduced motion.
- **Assets:**
  - `next/font` with `display: swap`, subsetted;
  - at most two font families (one expressive display face, one readable body face, from Google Fonts or a self-hosted open-license font).
- **Bundle size:** initial JS for the landing page under 150KB gzipped, excluding the lazy-loaded parts. Run a bundle analyzer and report the numbers.
- **AI efficiency:**
  - one combined generation call for the full plan;
  - "More like this" and refine only regenerate the affected section;
  - responses are cached;
  - token-efficient prompts.
- **Rendering performance:**
  - memoize expensive derived values (budget totals);
  - debounce persisted store writes.

---

## TESTING REQUIREMENTS

Target **≥ 80% coverage on `lib/`**.

**Unit tests (Vitest)**

- `allocate`/`rebalance`: sums are exact, there are no negative values, and rounding is handled.
- Currency formatting.
- Timeline date generation: past-date handling, and events less than 2 weeks away.
- `.ics` generator output.
- Zod schemas: valid and invalid cases.
- The prompt-guard sanitizer.
- The rate limiter.
- The LRU cache.
- AI response parsing and the repair path.

**Component tests (React Testing Library)**

- Wizard validation and keyboard navigation.
- Budget panel editing and live totals.
- Vendor status changes.
- The refine diff accept/reject flow.
- The motion toggle.

**API tests**

- `/api/plan` and `/api/refine`:
  - valid requests;
  - invalid bodies (400);
  - rate limiting (429);
  - malformed AI output.
- The AI provider is mocked with MSW.

**End-to-end tests (Playwright)**

- Landing page → wizard → generate (mock provider) → edit budget → tick a task → export `.ics`, for **each of the three event types**.
- An **axe accessibility scan** on every page with zero violations.
- A keyboard-only run of the main flow.
- A reduced-motion emulation test.

**CI (GitHub Actions)**

- Runs install, lint, typecheck, unit and component tests with coverage, build, Playwright with the mock provider, and `npm audit`.

---

## DESIGN SYSTEM

### Personality

Bold, joyful, premium and playful. Think of an award-winning studio site, applied to celebrations.

### Typography

- A big expressive display face for headlines, used with fluid `clamp()` sizes.
- A clean sans for the UI.
- Tight tracking on display text, generous line-height on body text.

### Color

- A warm, festive palette defined as CSS variable tokens: deep ink, cream, marigold, coral/rose, and a pop of electric violet.
- Each event type has its own accent theme:
  - Wedding: rose + gold;
  - Birthday: violet + marigold;
  - Community: teal + coral.
- All combinations must pass contrast checks.

### Shapes

- Large radii and chunky pills.
- Sticker-like cards with subtle offset shadows.
- Playful SVG doodles (confetti, stars, ribbons).

### The app vs. the landing page

The app is **calm and focused**: the same tokens, with far less motion. The landing page has the spectacle; the planner has clarity.

### The mascot

"Festi" is an original, simple geometric SVG character. It is used sparingly, in the hero, empty states and success moments.

---

## BUILD PHASES

**Phase 1: Foundation**

- Scaffold Next.js with TypeScript strict, Tailwind, shadcn/ui, ESLint (including jsx-a11y), Prettier, Husky, Vitest, Playwright and CI.
- Design tokens, fonts, theme toggle, motion toggle, skip link and base layout.

**Phase 2: Domain logic**

- Zod schemas.
- The budget, timeline, `.ics`, cache, rate-limit and sanitize modules, with full unit tests.
- Mock fixtures for all three event types.

**Phase 3: AI layer**

- Provider adapter, Gemini implementation and mock provider.
- Prompts, structured-output parsing and the repair path.
- `/api/plan` (streaming) and `/api/refine`, with security headers and middleware, plus API tests.

**Phase 4: Wizard**

- All steps, validation, focus management, persistence and component tests.

**Phase 5: Dashboard**

- Overview, Budget (chart + table), Timeline, Vendors, Ideas, the Refine chat with diff preview, and Export (PDF + `.ics`).
- Component tests.

**Phase 6: Landing page**

- Hero with mascot, the pinned GSAP scroll scenes, the event-type morph, and the confetti finale.
- Reduced-motion static fallback, mobile simplification and lazy loading.

**Phase 7: Hardening**

- Playwright end-to-end tests plus axe on every page.
- Lighthouse pass and bundle analysis; fix everything below target.
- Keyboard-only audit and contrast audit in both themes.

**Phase 8: Documentation & deployment**

- `README.md` with:
  - the problem statement;
  - a feature list mapped to each scoring criterion (a table);
  - an architecture diagram (Mermaid);
  - setup instructions;
  - env vars;
  - scripts;
  - test instructions;
  - screenshots placeholders;
  - deployment steps for Cloud Run and Vercel.
- `ARCHITECTURE.md`, `SECURITY.md` and `ACCESSIBILITY.md`.
- The Dockerfile, as a multi-stage, non-root, standalone Next.js build.

---

## DEFINITION OF DONE

- [ ] All three event types generate complete plans with budget, timeline, vendors and ideas, in mock mode **and** with a real API key.
- [ ] Budgets always sum correctly, and timeline dates are always valid (enforced in code and tested).
- [ ] Refine produces validated patches with a preview step.
- [ ] Lint, typecheck and all tests pass in CI; `lib/` coverage is at least 80%.
- [ ] Axe reports 0 violations; the full flow works keyboard-only; reduced motion is fully respected.
- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility 100, Best Practices 100.
- [ ] No secrets in the repo, security headers verified, rate limiting works.
- [ ] The landing page feels world-class: smooth, bold and original, with no copied assets.
- [ ] The README clearly maps features to each judging criterion.
