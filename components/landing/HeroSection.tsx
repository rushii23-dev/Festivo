import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ArchButton } from "./ArchButton";
import { Photo } from "./Photo";
import { ballroomMandap } from "./photos";
import { SplitHeading } from "./SplitHeading";
import { DARK_TONE } from "./tone";

/** Landing section 1: the ballroom and one quiet statement in the bottom-left corner. */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-title"
      data-hero-photo
      className={`relative isolate flex min-h-[100svh] flex-col overflow-hidden ${DARK_TONE}`}
    >
      <div className="hero-photo absolute inset-0 -z-10">
        <Photo
          src={ballroomMandap.src}
          alt={ballroomMandap.alt}
          sizes="100vw"
          preload
          parallax={5}
          position="50% 45%"
          className="absolute inset-0"
        />
      </div>
      <div className="hero-scrim -z-10" />

      <div className="relative mx-auto grid w-full max-w-[90rem] flex-1 items-end px-6 pt-32 pb-14 sm:px-10 sm:pb-20 lg:px-14 lg:pb-24">
        <div className="on-photo grid max-w-[34rem] justify-items-start">
          <SplitHeading
            as="h1"
            id="hero-title"
            reveal="load"
            lines={["Planned to", "the last petal."]}
            label="Planned to the last petal."
            className="text-[clamp(2.75rem,1.4rem+3.4vw,4.75rem)] leading-[1.02] tracking-[-0.01em]"
          />
          <span aria-hidden="true" className="hero-rule mt-7" />
          <div className="hero-cta mt-9 flex flex-wrap items-center gap-x-9 gap-y-4">
            <ArchButton href="/plan/new" tone="photo">
              Start planning
            </ArchButton>
            <Link
              href="#story"
              className="group inline-flex min-h-11 items-center gap-3 font-display text-[1.375rem] text-[#e2d6c3] italic hover:text-[#f0e4cf]"
            >
              See how it works
              <ArrowRight
                aria-hidden="true"
                className="size-4 text-[#e8c48f] group-hover:translate-x-1 motion-ok:transition-transform motion-ok:duration-300"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
