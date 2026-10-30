"use client";

import { useEffect } from "react";
import { prefersReducedMotionNow } from "@/lib/prefs/store";
import {
  chapterPhotos,
  parallaxLayers,
  revealBlocks,
  splitHeadings,
  windowGrow,
} from "./scenes";

/**
 * Scroll choreography for the landing page, loaded after first paint: Lenis
 * smooth scrolling kept in step with GSAP's ScrollTrigger, plus the scenes in
 * ./scenes. Nothing runs when motion is reduced, so the page stays still and
 * fully readable.
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
        parallaxLayers(gsap);
        windowGrow(gsap);
        splitHeadings(gsap, ScrollTrigger);
        revealBlocks(gsap);
        chapterPhotos(gsap, ScrollTrigger);
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
