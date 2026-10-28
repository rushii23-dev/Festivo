"use client";

import { useEffect } from "react";
import { prefersReducedMotionNow } from "@/lib/prefs/store";

/**
 * Scroll choreography for the landing page, loaded after first paint:
 * - Lenis smooth scrolling, kept in step with GSAP's ScrollTrigger;
 * - photos drift inside their frames ([data-parallax]);
 * - after the hero, a palace-arch window grows until its photograph fills the
 *   screen, then the copy rises onto it ([data-window-grow], pinned);
 * - headings fade in letter by letter ([data-split="scroll"]);
 * - blocks rise into place ([data-reveal]);
 * - the timeline's photo follows the chapter in view ([data-chapter]).
 * Nothing runs when motion is reduced, so the page stays still and fully readable.
 * Only transform, opacity and clip-path are animated.
 */
export function LandingMotion() {
  useEffect(() => {
    if (prefersReducedMotionNow()) return;
    let cleanup = () => {};
    let cancelled = false;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
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

        const grow = document.querySelector<HTMLElement>("[data-window-grow]");
        const pane = grow?.querySelector<HTMLElement>("[data-window]");
        if (grow && pane) {
          // The arch: a narrow window centred on screen with a semicircular top.
          const arch = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const archW = w < 768 ? w * 0.62 : Math.min(w * 0.3, 440);
            const archH = Math.min(h * 0.66, archW * 1.5);
            const side = (w - archW) / 2;
            const top = (h - archH) / 2;
            const r = archW / 2;
            return `inset(${top}px ${side}px ${h - top - archH}px ${side}px round ${r}px ${r}px 0px 0px)`;
          };
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
              { clipPath: arch },
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

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((block) => {
          gsap.from(block, {
            opacity: 0,
            y: 28,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: { trigger: block, start: "top 85%", once: true },
          });
        });

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
      });

      cleanup = () => {
        ctx.revert();
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return null;
}
