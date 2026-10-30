# Accessibility

**Target: WCAG 2.2 Level AA**, on desktop and phone, by keyboard, screen reader, forced colours
and reduced motion. This page says what Festivo does for each, and how every claim is tested.
Nothing here is a promise without a check behind it.

## How it is tested

| Check                       | Where                                                                                          | What it proves                                                                                                                                                                                                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| axe-core, WCAG 2.0–2.2 A/AA | `tests/e2e/*.spec.ts`                                                                          | Zero violations on the landing page, the 404 page, the account and welcome screens, **every wizard step including its error states**, **every dashboard tab**, the run sheet, the Refine dialog, and the landing page under reduced motion. On a desktop browser and a phone (Pixel 7), against a production build. |
| Static lint                 | `eslint.config.mjs`                                                                            | The full `jsx-a11y` strict rule set as errors, on every component, including states no browser test reaches.                                                                                                                                                                                                        |
| Role and name queries       | `tests/component/*.test.tsx`                                                                   | Components are found the way assistive tech finds them (`getByRole(…, { name })`), so a lost label fails a test.                                                                                                                                                                                                    |
| Keyboard-only journeys      | `tests/e2e/wizard.spec.ts`, `foundation.spec.ts`, `dashboard.spec.ts`, `accessibility.spec.ts` | The whole wizard and plan generation without a mouse; the skip link; arrow keys in tabs; focus after navigation and after each step; a visible focus ring on every card and chip.                                                                                                                                   |
| Contrast                    | `tests/unit/design-tokens.test.ts`                                                             | Every text and UI colour pairing in `app/globals.css` meets 4.5:1 (text) or 3:1 (UI, focus ring).                                                                                                                                                                                                                   |
| Reflow                      | `foundation.spec.ts`, `wizard.spec.ts`, `dashboard.spec.ts`                                    | No sideways scrolling at 320 CSS pixels on any page or tab (1.4.10).                                                                                                                                                                                                                                                |
| Text size                   | `accessibility.spec.ts`                                                                        | At 200% text, the landing page, the wizard and every dashboard tab reflow with nothing cut off (1.4.4).                                                                                                                                                                                                             |
| Forced colours              | `accessibility.spec.ts`                                                                        | In Windows High Contrast, the chosen card, the radio dot, the wizard's progress and the active tab stay visible.                                                                                                                                                                                                    |
| Reduced motion              | `foundation.spec.ts`, `accessibility.spec.ts`                                                  | The device setting is honoured before first paint, smooth scrolling never starts, and the still page passes axe.                                                                                                                                                                                                    |
| No JavaScript               | `foundation.spec.ts`                                                                           | The hero and its call to action render and work from the server alone.                                                                                                                                                                                                                                              |

Run them with `npm run lint`, `npm test` and `npm run test:e2e`.

## What Festivo does

### Structure (1.3.1, 2.4.1, 2.4.2, 2.4.6, 3.1.1)

- Landmarks on every page: `header`, `main`, `footer`; one `h1` per page and
  headings in order.
- A skip link is the first Tab stop and jumps to `main` (`components/a11y/SkipLink.tsx`).
- Every page has its own title (`Plan a new event | Festivo`, `Your plan | Festivo`,
  `Page not found | Festivo`).
- `lang="en"`; dates, money and numbers are formatted with `Intl`.
- Headings split into letters for the reveal animation keep their whole text as the
  accessible name.

### Keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7)

- Everything works by keyboard; there are no keyboard traps. Choices are native radios and
  checkboxes, so arrow keys and Space behave as people expect.
- One focus ring everywhere: 3px, offset 3px, at least 3:1 against both backgrounds. It is
  unlayered so no utility class can remove it, and cards and chips that hide their native input
  draw it on the visible box.
- Focus is managed, never lost: to `main` after client-side navigation
  (`components/a11y/RouteFocus.tsx`), to each wizard step's question, to the first invalid field
  when a step does not pass, into dialogs and back to their trigger, and to the next screen's
  question during sign-up. When a screen's code is still loading, focus moves once it arrives.
- Dashboard tabs follow the WAI-ARIA tabs pattern (Radix): arrow keys, Home and End.

### Forms (1.3.5, 3.3.1, 3.3.2, 3.3.3, 4.1.2)

- Every field has a visible label. Required fields say so in text, not only with colour or an
  asterisk.
- Hints and errors are linked with `aria-describedby`; errors are written as advice ("Use a
  whole number, like 120.") and announced.
- Steps are validated with the same Zod rules the server uses, so what the form accepts is what
  the server accepts.

### Dynamic content (4.1.3)

- Two always-mounted live regions, polite and assertive (`components/a11y/LiveRegion.tsx`),
  announce AI progress ("Crunching your budget…"), saves, ticked tasks, copied summaries and
  errors.
- Loading states are skeletons marked `aria-busy`; the plan's Refine preview is a list of
  changes in words before anything is applied.

### Colour and status (1.4.1, 1.4.3, 1.4.11)

- One light theme, every pairing contrast-tested.
- Status is never colour alone: over-budget warnings carry an icon and words; chosen chips show
  a tick; chosen cards show a filled ring; the budget donut has an editable table with the same
  numbers.

### Forced colours (Windows High Contrast)

Forced colours drop background fills and repaint borders and outlines in the system text colour.
Festivo marks state with things that survive that: a heavy outline that only the chosen card or
chip has, radio dots and progress segments painted in system colours, and an underline only on
the active tab (`@media (forced-colors: active)` in `app/globals.css`).

### Motion (2.3.1, 2.3.3)

- The device's reduced-motion setting is read before first paint (`public/prefs-init.js`),
  then followed live (`lib/prefs/store.ts`). Under it there is no smooth scrolling, no
  scroll-linked animation, no parallax, no petal bursts; every section is a readable static
  layout. CSS animation is guarded by the `motion-ok:` variant; GSAP checks
  `prefersReducedMotionNow()`.
- Native scrolling, keyboard scrolling and anchor links always work: nothing is scroll-jacked.
- Nothing flashes. The marquee and the falling petals are decorative; the marquee's titles are
  read once by screen readers (its looping copy is hidden), and it holds still under the pointer.

### Size and reflow (1.4.4, 1.4.10, 2.5.8)

- Layouts reflow at 320 CSS pixels and at 200% text with no sideways scrolling.
- Buttons, chips, tabs and form controls are at least 44 pixels tall; every target meets the
  24-pixel AA minimum, which axe checks on every screen.
- No text is set in images.

### Images (1.1.1)

- Photographs that carry meaning have written alt text (`components/landing/photos.ts`);
  decorative ones have empty alt text, and decorative SVG is `aria-hidden`.

## Known limitations

- Testing is automated plus keyboard runs. A manual pass with NVDA, JAWS and VoiceOver is
  recommended before a public launch; please report anything we missed.
- **Pause, Stop, Hide (2.2.2).** When the device allows motion, the ideas marquee and the
  finale's falling petals keep moving for as long as they are on screen, and there is no
  control to pause them (both stop entirely under reduced motion, and the marquee holds still
  under the pointer). Meeting 2.2.2 fully needs a small pause control on those two sections.
- On a phone, doubling the text size (roughly 400% zoom) can make the dashboard scroll
  sideways; the 320-pixel reflow that WCAG requires is met.
