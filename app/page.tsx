import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FestivoSeal } from "@/components/brand/FestivoSeal";
import { ArchButton } from "@/components/landing/ArchButton";
import { FinaleSection } from "@/components/landing/FinaleSection";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { LightsButton } from "@/components/landing/LightsButton";
import { Marquee } from "@/components/landing/Marquee";
import { Photo } from "@/components/landing/Photo";
import { PHOTOS, type SitePhoto } from "@/components/landing/photos";
import { SplitHeading } from "@/components/landing/SplitHeading";
import { TimelineSection } from "@/components/landing/TimelineSection";
import { Button } from "@/components/ui/button";
import {
  budgetMenu,
  ideaTitles,
  planGlimpse,
  samplePlan,
  timelineChapters,
  vendorShowcase,
} from "@/lib/landing/showcase";
import type { VendorCategory } from "@/lib/schemas/plan";
import { formatMoney } from "@/lib/budget/format";
import { todayIso } from "@/lib/timeline/dates";

const VENDOR_PHOTOS: Partial<Record<VendorCategory, SitePhoto>> = {
  decorator: PHOTOS.marigoldsPetals,
  caterer: PHOTOS.thali,
  "dj-or-band": PHOTOS.festivalDrummers,
};

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

const dark = "bg-[#292622] text-[#e2d6c3]";

export default function HomePage() {
  const today = todayIso();
  const plan = samplePlan(today);
  const glimpse = planGlimpse(plan, today);
  const menu = budgetMenu(plan);
  const chapters = timelineChapters(plan);
  const vendors = vendorShowcase();
  const ideas = ideaTitles();
  const buffer = plan.budget.find((item) => item.category === "misc");

  return (
    <>
      {/* 1. Hero: the ballroom and one quiet statement in the bottom-left corner */}
      <section
        aria-labelledby="hero-title"
        data-hero-photo
        className={`relative isolate flex min-h-[100svh] flex-col overflow-hidden ${dark}`}
      >
        <div className="hero-photo absolute inset-0 -z-10">
          <Photo
            src={PHOTOS.ballroomMandap.src}
            alt={PHOTOS.ballroomMandap.alt}
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

      {/* 2. A palace window grows until the photograph fills the screen. Without
             motion it is simply a full-bleed photograph with the copy on it. */}
      {/* The wrapper keeps ScrollTrigger's pin spacer inside a node React owns, so
          leaving the page can remove the section cleanly. */}
      <div>
        <section
          id="story"
          aria-labelledby="story-title"
          data-window-grow
          className="relative h-[100svh] min-h-[34rem] overflow-hidden"
        >
          <div
            data-window
            className={`absolute inset-0 isolate flex flex-col justify-end overflow-hidden ${dark}`}
          >
            <div data-window-photo className="absolute inset-0">
              <Photo
                src={PHOTOS.lightsUnderTrees.src}
                alt={PHOTOS.lightsUnderTrees.alt}
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

      {/* 3. The budget, set like a menu -------------------------------------- */}
      <section id="budget" aria-labelledby="budget-title" className="grid lg:grid-cols-2">
        <div className="bg-[#2c2a27] p-3 sm:p-6 lg:p-8">
          <article
            aria-labelledby="menu-title"
            className="bg-secondary text-[#2c2a27] lg:sticky lg:top-8"
          >
            <div className="flex items-start justify-between gap-6 p-6 sm:p-8">
              <div>
                <h3 id="menu-title" className="font-display text-headline">
                  The budget
                </h3>
                <p className="caps mt-3">
                  {plan.title}, {plan.location}, {plan.guestCount} guests
                </p>
              </div>
              <FestivoSeal className="h-14" flame="currentColor" />
            </div>
            <ul>
              {menu.map((line) => (
                <li
                  key={line.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1 border-t border-[#2c2a27]/40 px-6 py-4 sm:px-8"
                >
                  <p className="font-semibold">{line.label}</p>
                  <p className="font-semibold tabular-nums">{line.amount}</p>
                  <p className="max-w-[52ch] text-[0.8125rem] leading-snug">
                    {line.note}
                  </p>
                </li>
              ))}
            </ul>
            <div className="grid gap-6 border-t border-[#2c2a27]/40 p-6 sm:p-8">
              <div className="flex items-baseline justify-between gap-6">
                <p className="caps">Total, to the rupee</p>
                <p className="figure text-4xl">{glimpse.budget}</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/plan/new">Plan your budget</Link>
              </Button>
            </div>
          </article>
        </div>

        <div className="grid content-start gap-10 px-4 py-16 sm:px-8 lg:px-14 lg:py-24">
          <SplitHeading
            id="budget-title"
            reveal="scroll"
            lines={["Every rupee,", "accounted for."]}
            className="text-headline"
          />
          <p className="max-w-[48ch] leading-relaxed">
            Festivo splits your total across the lines your event needs, keeps a buffer
            for surprises, and rebalances the rest when a vendor sends a quote. Lock what
            you are sure of; the numbers always add up.
          </p>
          <dl data-reveal className="grid grid-cols-3 border-t border-hairline pt-5">
            <div>
              <dt className="caps text-muted-foreground">Budget lines</dt>
              <dd className="figure mt-2 text-4xl">{plan.budget.length}</dd>
            </div>
            <div>
              <dt className="caps text-muted-foreground">Buffer</dt>
              <dd className="figure mt-2 text-4xl">
                {buffer ? formatMoney(buffer.allocated, plan.currency) : "None"}
              </dd>
            </div>
            <div>
              <dt className="caps text-muted-foreground">Left over</dt>
              <dd className="figure mt-2 text-4xl">
                {formatMoney(
                  plan.totalBudget -
                    plan.budget.reduce((sum, item) => sum + item.allocated, 0),
                  plan.currency,
                )}
              </dd>
            </div>
          </dl>
          <Photo
            src={PHOTOS.mandapNight.src}
            alt={PHOTOS.mandapNight.alt}
            sizes="(min-width: 1024px) 45vw, 100vw"
            parallax={10}
            className="aspect-[4/5] w-full"
          />
        </div>
      </section>

      {/* 4. The timeline, chapter by chapter --------------------------------- */}
      <TimelineSection chapters={chapters} />

      {/* 5. Vendors: who to call, what to ask -------------------------------- */}
      <section id="vendors" aria-labelledby="vendors-title">
        <div className="mx-auto w-full max-w-[90rem] px-4 py-20 sm:px-8 lg:py-32">
          <div className="grid items-end gap-6 lg:grid-cols-2">
            <SplitHeading
              id="vendors-title"
              reveal="scroll"
              lines={["Who to call,", "what to ask"]}
              className="text-headline"
            />
            <p className="max-w-[46ch] leading-relaxed lg:justify-self-end">
              Each vendor moves from To research to Paid, and every quote flows into the
              budget. Festivo hands you the questions worth asking before you sign.
            </p>
          </div>
          <ul className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6 lg:mt-20">
            {vendors.map((vendor) => {
              const photo = VENDOR_PHOTOS[vendor.category] ?? PHOTOS.banquetTable;
              return (
                <li
                  key={vendor.category}
                  data-reveal
                  className="grid content-start gap-5"
                >
                  <Photo
                    src={photo.src}
                    alt={photo.alt}
                    sizes="(min-width: 768px) 30vw, 100vw"
                    parallax={6}
                    className="aspect-[3/4]"
                  />
                  <div className="flex items-center justify-between border-b border-hairline pb-3">
                    <h3 className="font-display text-title">{vendor.label}</h3>
                    <p className="caps inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2 rotate-45 bg-secondary"
                      />
                      {vendor.status}
                    </p>
                  </div>
                  <p className="caps text-muted-foreground">Ask them</p>
                  <p className="-mt-3 font-display text-[1.45rem] leading-snug">
                    “{vendor.question}”
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 6. Ideas marquee ----------------------------------------------------- */}
      <section
        id="ideas"
        aria-labelledby="ideas-title"
        className={`py-20 lg:py-28 ${dark}`}
      >
        <h2 id="ideas-title" className="caps px-4 text-center">
          Ideas, picked for your style and your budget
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 overflow-hidden font-display text-[clamp(2.5rem,1rem+5vw,5.5rem)] leading-none">
          <Marquee items={ideas.slice(0, 9)} />
          <div aria-hidden="true">
            <Marquee items={ideas.slice(9)} reverse />
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-[52ch] px-4 text-center leading-relaxed">
          Every idea shows its cost and whether it fits your budget. Save the ones you
          love, dismiss the rest, and ask for more like them.
        </p>
      </section>

      {/* 7. Three kinds of celebration --------------------------------------- */}
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
                  className={`group on-photo relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden p-6 sm:p-8 ${dark}`}
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

      {/* 8. Finale: the invitation to start, above a row of palace windows */}
      <FinaleSection />

      <LandingMotion />
    </>
  );
}
