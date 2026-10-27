"use client";

import { useEffect } from "react";
import { prefersReducedMotionNow } from "@/lib/prefs/store";

/**
 * Scroll choreography for the landing page, loaded after first paint:
 * - Lenis smooth scrolling, kept in step with GSAP's ScrollTrigger;
 * - the hero pins while its centre window grows to fill the screen (desktop);
 * - photos drift inside their frames ([data-parallax]);
 * - a framed photo opens out to full bleed ([data-expand]);
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
        // Hero: the statement lifts away, the side windows part, and the centre
        // window grows until the visitor is looking through it. Desktop only.
        const hero = document.querySelector<HTMLElement>("[data-hero-pin]");
        const centre = hero?.querySelector<HTMLElement>(
          '[data-window="center"] [data-window-frame]',
        );
        if (hero && centre) {
          gsap.matchMedia().add("(min-width: 1024px)", () => {
            const cover = () =>
              Math.max(
                window.innerWidth / centre.offsetWidth,
                window.innerHeight / centre.offsetHeight,
              ) * 1.3;
            const lift = () => {
              const frame = centre.getBoundingClientRect();
              const top = frame.top - hero.getBoundingClientRect().top;
              return window.innerHeight / 2 - (top + frame.height / 2);
            };
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: hero,
                  start: "top top",
                  end: "+=110%",
                  scrub: 0.6,
                  pin: true,
                  invalidateOnRefresh: true,
                },
              })
              .to(hero.querySelector("[data-hero-copy]"), {
                y: -90,
                opacity: 0,
                ease: "power1.in",
                duration: 0.35,
              })
              .to(
                hero.querySelectorAll("[data-window-caption]"),
                { opacity: 0, duration: 0.15 },
                0,
              )
              .to(
                hero.querySelectorAll('[data-window="left"]'),
                { xPercent: -80, opacity: 0, duration: 0.55, ease: "power2.in" },
                0.05,
              )
              .to(
                hero.querySelectorAll('[data-window="right"]'),
                { xPercent: 80, opacity: 0, duration: 0.55, ease: "power2.in" },
                0.05,
              )
              .to(
                centre,
                {
                  scale: cover,
                  y: lift,
                  padding: 0,
                  borderColor: "transparent",
                  ease: "power2.inOut",
                  duration: 1,
                },
                0,
              );
          });
        }

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

        gsap.utils.toArray<HTMLElement>("[data-expand]").forEach((frame) => {
          gsap.fromTo(
            frame,
            { clipPath: "inset(7% 5% 7% 5%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "none",
              scrollTrigger: {
                trigger: frame,
                start: "top 95%",
                end: "top 10%",
                scrub: true,
              },
            },
          );
        });

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
