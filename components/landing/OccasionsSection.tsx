import Link from "next/link";
import { Photo } from "./Photo";
import { PHOTOS } from "./photos";
import { SplitHeading } from "./SplitHeading";
import { DARK_TONE } from "./tone";

const OCCASIONS = [
  {
    photo: PHOTOS.bride,
    label: "Weddings",
    title: "Every function, one plan",
    line: "Haldi to reception, with the families, the mandap and the caterer in step.",
  },
  {
    photo: PHOTOS.birthdayCandles,
    label: "Birthdays",
    title: "The cake and the rest",
    line: "Guest list, games, the cake order and a run sheet for the afternoon.",
  },
  {
    photo: PHOTOS.holi,
    label: "Community events",
    title: "Permits to the last stall",
    line: "Permits, stalls, sound and volunteers, booked in the right order.",
  },
];

/** Landing section 7: the three kinds of celebration, each a way into the planner. */
export function OccasionsSection() {
  return (
    <section aria-labelledby="occasions-title">
      <div className="mx-auto w-full max-w-[90rem] px-4 py-20 sm:px-8 lg:py-32">
        <SplitHeading
          id="occasions-title"
          reveal="scroll"
          lines={["One planner,", "every celebration"]}
          className="text-headline"
        />
        <ul className="mt-14 grid gap-3 md:grid-cols-3 lg:mt-20">
          {OCCASIONS.map((occasion) => (
            <li key={occasion.label} data-reveal>
              <Link
                href="/plan/new"
                className={`group on-photo relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden p-6 sm:p-8 ${DARK_TONE}`}
              >
                <div className="absolute inset-0 motion-ok:transition-transform motion-ok:duration-[1200ms] motion-ok:ease-out motion-ok:group-hover:scale-105">
                  <Photo
                    src={occasion.photo.src}
                    alt=""
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="absolute inset-0"
                  />
                </div>
                <div className="photo-scrim" data-focus="bottom" />
                <p className="caps relative">{occasion.label}</p>
                <h3 className="relative mt-3 font-display text-title">
                  {occasion.title}
                </h3>
                <p className="relative mt-3 max-w-[36ch] text-[0.9375rem]">
                  {occasion.line}
                </p>
                <span className="caps relative mt-6 inline-flex w-fit border-b border-[#e2d6c3] pb-1">
                  Plan one
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
