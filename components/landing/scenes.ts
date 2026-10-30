/**
 * The landing page's scroll scenes, one function each. LandingMotion loads GSAP
 * after first paint and runs them inside one gsap.context, so leaving the page
 * reverts every tween and trigger at once. Only transform, opacity and clip-path
 * are animated.
 */
import type { gsap as Gsap } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

type GsapApi = typeof Gsap;
type ScrollTriggerApi = typeof ScrollTriggerType;

/** Photos drift inside their frames ([data-parallax] holds the travel in percent). */
export function parallaxLayers(gsap: GsapApi) {
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((layer) => {
    const amount = Number(layer.dataset.parallax) || 8;
    gsap.fromTo(
      layer,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: "none",
        scrollTrigger: {
          trigger: layer.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  });
}

/** The arch: a narrow window centred on screen with a semicircular top. */
function archClipPath() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const archW = w < 768 ? w * 0.62 : Math.min(w * 0.3, 440);
  const archH = Math.min(h * 0.66, archW * 1.5);
  const side = (w - archW) / 2;
  const top = (h - archH) / 2;
  const r = archW / 2;
  return `inset(${top}px ${side}px ${h - top - archH}px ${side}px round ${r}px ${r}px 0px 0px)`;
}

/**
 * After the hero, a palace-arch window grows until its photograph fills the
 * screen, then the copy rises onto it ([data-window-grow], pinned).
 */
export function windowGrow(gsap: GsapApi) {
  const grow = document.querySelector<HTMLElement>("[data-window-grow]");
  const pane = grow?.querySelector<HTMLElement>("[data-window]");
  if (!grow || !pane) return;
  gsap
    .timeline({
      scrollTrigger: {
        trigger: grow,
        start: "top top",
        end: "+=140%",
        scrub: 0.7,
        pin: true,
        invalidateOnRefresh: true,
      },
    })
    .fromTo(
      pane,
      { clipPath: archClipPath },
      {
        clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)",
        ease: "power2.inOut",
        duration: 1,
      },
      0,
    )
    .fromTo(
      grow.querySelector("[data-window-photo]"),
      { scale: 1.35 },
      { scale: 1, ease: "power2.inOut", duration: 1 },
      0,
    )
    // The photo shows at full brightness while the window grows; the shade
    // that keeps the copy readable arrives with the copy.
    .fromTo(
      grow.querySelector("[data-window-scrim]"),
      { opacity: 0 },
      { opacity: 1, ease: "power1.out", duration: 0.35 },
      0.65,
    )
    .fromTo(
      grow.querySelector("[data-window-copy]"),
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, ease: "power2.out", duration: 0.3 },
      0.78,
    );
}

/** Headings fade in letter by letter ([data-split="scroll"]). */
export function splitHeadings(gsap: GsapApi, ScrollTrigger: ScrollTriggerApi) {
  gsap.utils.toArray<HTMLElement>('[data-split="scroll"]').forEach((heading) => {
    const chars = heading.querySelectorAll(".split-char");
    gsap.set(chars, { opacity: 0 });
    ScrollTrigger.create({
      trigger: heading,
      start: "top 80%",
      once: true,
      onEnter: () =>
        gsap.to(chars, {
          opacity: 1,
          duration: 0.3,
          ease: "power1.out",
          stagger: { amount: 0.8 },
        }),
    });
  });
}

/** Blocks rise into place ([data-reveal]). */
export function revealBlocks(gsap: GsapApi) {
  gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((block) => {
    gsap.from(block, {
      opacity: 0,
      y: 28,
      duration: 1,
      ease: "power2.out",
      scrollTrigger: { trigger: block, start: "top 85%", once: true },
    });
  });
}

/** The timeline's photo follows the chapter in view ([data-chapter]). */
export function chapterPhotos(gsap: GsapApi, ScrollTrigger: ScrollTriggerApi) {
  const photos = gsap.utils.toArray<HTMLElement>("[data-chapter-photo]");
  gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((chapter) => {
    ScrollTrigger.create({
      trigger: chapter,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: ({ isActive }) => {
        if (!isActive) return;
        for (const photo of photos) {
          photo.dataset.active = String(
            photo.dataset.chapterPhoto === chapter.dataset.chapter,
          );
        }
      },
    });
  });
}
