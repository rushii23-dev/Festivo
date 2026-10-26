# Design research

Reviewed on 2026-10-26 in a browser, before any landing or dashboard UI was built.
These are references for **ideas only**. Festivo does not reuse any layout, asset,
font, logo, character or code from them.

## Sources

| Source                       | What it is                                      | Why we looked                            |
| ---------------------------- | ----------------------------------------------- | ---------------------------------------- |
| twomuch.studio               | Playful digital design studio portfolio         | Named in the brief as the mood reference |
| Refero Styles: Flying Papers | Style breakdown of a cartoon-poster brand site  | Oversized type with a single character   |
| Refero Styles: Eddie         | Style breakdown of a product site with a mascot | Mascot used inside UI and headlines      |
| Refero Styles: Gigantic      | Style breakdown of a candy brand on cream paper | Warm canvas, the type is the graphic     |

## What we observed

**twomuch.studio**

- The whole homepage is one small, centered control strip (name, a counter pill, a menu
  pill) sitting over a giant, faint, outlined bubble-letter logotype. No long scroll.
- A tiny face lives _inside_ the UI chrome: two eyes in the counter pill react to the
  cursor. The character is part of the navigation, not a separate illustration.
- The menu opens as a compact "device" panel: one line about the studio, contact links,
  then a project viewer with numbered pagination.
- One loud accent (acid lime) on a quiet grey canvas; all the colour comes from the work.

**Flying Papers (via Refero)**

- Every screen reads as a single poster: one huge headline, one character, one action.
- Hierarchy comes from fills and borders rather than shadows; sharp blocks are contrasted
  with soft pill buttons.
- Accent colours are used one block at a time, never several side by side.

**Eddie (via Refero)**

- A mascot badge is set _inline in headlines_, standing in for a word.
- Each section is a distinct coloured "room", so the scroll feels like moving through
  spaces rather than one long page.
- A strict radius hierarchy: small for links, larger for buttons, largest for cards.

**Gigantic (via Refero)**

- A warm cream canvas instead of clinical white; one loud accent; the display type is the
  main graphic element.

## What Festivo takes from this

| Idea                                  | How Festivo uses it (in our own form)                                                                                                                  | Phase |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| Character living inside the UI chrome | Festi's eyes sit inside the header's wordmark pill and follow the cursor and keyboard focus. Static under reduced motion.                              | 6     |
| Giant faint logotype behind the hero  | An outlined confetti-and-ribbon doodle (our own SVG) fills the hero background at low contrast. Decorative, `aria-hidden`.                             | 6     |
| One poster per screen                 | Each scroll scene has exactly one headline, one visual and at most one action.                                                                         | 6     |
| Sections as coloured rooms            | Scenes get full-bleed rooms from existing tokens: marigold (date), violet (budget), coral (vendors), event accent (types), teal (ideas), ink (finale). | 6     |
| Mascot inline in a headline           | A small Festi badge replaces one word in one landing headline only, with the word kept as accessible text.                                             | 6     |
| Borders over shadows, used sparingly  | Sticker shadows are reserved for primary actions and the single hero card per view. Other panels use the ink border only.                              | 4–6   |
| Radius hierarchy                      | Inputs `radius-md`, cards `radius-xl`, buttons and tags `radius-pill`. Already in the tokens.                                                          | 1 ✓   |
| Calm app, loud landing                | The planner stays on the cream canvas with one accent per view; colour rooms are for the landing page only.                                            | 4–5   |

## What we deliberately do not take

- No acid-lime accent, bitmap/pixel display type or grey canvas (twomuch.studio's signature).
- No muted-violet full-page canvas or riso texture (Flying Papers' signature).
- No robot-face mascot, lavender shadow system or 40px card radii (Eddie's signature).
- No wide-tracked uppercase display type (Gigantic's signature). Festivo keeps Shrikhand in
  sentence case.
- No layouts, illustrations or copy reproduced from any source.

## Accessibility checks on borrowed ideas

- Cursor-following eyes must also follow keyboard focus, and must stop under reduced motion.
- Colour rooms must keep text at 4.5:1 or more; the existing token test already covers
  every room colour as a background for its paired foreground.
- An inline mascot replacing a word keeps the word for screen readers (visually hidden text).
