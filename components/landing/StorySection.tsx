import { LightsButton } from "./LightsButton";
import { Photo } from "./Photo";
import { lightsUnderTrees } from "./photos";
import { DARK_TONE } from "./tone";

/**
 * Landing section 2: a palace window grows until the photograph fills the screen.
 * Without motion it is simply a full-bleed photograph with the copy on it.
 */
export function StorySection() {
  return (
    // The wrapper keeps ScrollTrigger's pin spacer inside a node React owns, so
    // leaving the page can remove the section cleanly.
    <div>
      <section
        id="story"
        aria-labelledby="story-title"
        data-window-grow
        className="relative h-[100svh] min-h-[34rem] overflow-hidden"
      >
        <div
          data-window
          className={`absolute inset-0 isolate flex flex-col justify-end overflow-hidden ${DARK_TONE}`}
        >
          <div data-window-photo className="absolute inset-0">
            <Photo
              src={lightsUnderTrees.src}
              alt={lightsUnderTrees.alt}
              sizes="100vw"
              position="50% 60%"
              className="absolute inset-0"
            />
          </div>
          <div data-window-scrim className="photo-scrim" data-focus="corner" />
          <div
            data-window-copy
            className="on-photo relative z-10 grid max-w-[46rem] gap-6 p-6 pb-12 sm:p-12 lg:p-16"
          >
            <h2 id="story-title" className="font-display text-headline">
              Every detail,
              <br />
              held in one place
            </h2>
            <p className="max-w-[46ch] leading-relaxed">
              One plan holds the money, the dates, the people you hire and the ideas you
              love. Change one part and the rest keeps up.
            </p>
            <div>
              <LightsButton href="/plan/new">Start your plan</LightsButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
