"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotionNow } from "@/lib/prefs/store";

const COLORS = ["#e8962e", "#f2b13b", "#c2410c", "#9f1d35", "#d49653"];
const COUNT = 46;

interface Petal {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
  spin: number;
  angle: number;
  color: string;
}

/**
 * Marigold and rose petals drifting down over the finale, drawn on a canvas.
 * Runs only while the finale is on screen and never under reduced motion.
 */
export function PetalFall() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || prefersReducedMotionNow()) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    const random = (min: number, max: number) => min + Math.random() * (max - min);
    const petals: Petal[] = [];

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = width * ratio;
      el.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const spawn = (anywhere: boolean): Petal => ({
      x: random(0, width),
      y: anywhere ? random(-height, height) : random(-80, -20),
      size: random(5, 11),
      speed: random(0.35, 0.9),
      sway: random(0.4, 1.2),
      phase: random(0, Math.PI * 2),
      spin: random(-0.02, 0.02),
      angle: random(0, Math.PI),
      color: COLORS[Math.floor(random(0, COLORS.length))] ?? "#d49653",
    });

    resize();
    for (let i = 0; i < COUNT; i++) petals.push(spawn(true));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < petals.length; i++) {
        const p = petals[i]!;
        p.y += p.speed;
        p.phase += 0.012;
        p.angle += p.spin;
        const x = p.x + Math.sin(p.phase) * p.sway * 18;
        if (p.y > height + 20) petals[i] = spawn(false);
        ctx.save();
        ctx.translate(x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };

    // Runs while the finale is on screen and not paused (PauseMotion); a pause
    // also clears the canvas, so nothing is left hanging mid-air.
    const region = el.closest<HTMLElement>("[data-motion-region]");
    const paused = () => region?.hasAttribute("data-paused") ?? false;
    let visible = false;
    const sync = () => {
      const run = visible && !paused();
      if (run && !running) {
        running = true;
        frame = requestAnimationFrame(draw);
      } else if (!run && running) {
        running = false;
        cancelAnimationFrame(frame);
      }
      if (paused()) ctx.clearRect(0, 0, width, height);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    observer.observe(el);
    const pauseWatch = new MutationObserver(sync);
    if (region) pauseWatch.observe(region, { attributeFilter: ["data-paused"] });
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      pauseWatch.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
