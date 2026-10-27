import Link from "next/link";
import { FestiMark } from "@/components/brand/FestiMark";
import { LandingMotion } from "@/components/landing/LandingMotion";
import { Marquee } from "@/components/landing/Marquee";
import { PetalFall } from "@/components/landing/PetalFall";
import { Photo } from "@/components/landing/Photo";
import { PHOTOS, type SitePhoto } from "@/components/landing/photos";
import { SplitHeading } from "@/components/landing/SplitHeading";
import { Button } from "@/components/ui/button";
import {
  budgetMenu,
  ideaTitles,
  planGlimpse,
  samplePlan,
  timelineChapters,
  vendorShowcase,
} from "@/lib/landing/showcase";
import type { TimelinePhase, VendorCategory } from "@/lib/schemas/plan";
import { formatMoney } from "@/lib/budget/format";
import { todayIso } from "@/lib/timeline/dates";

const CHAPTER_PHOTOS: Record<TimelinePhase, SitePhoto> = {
  "12+ weeks": PHOTOS.heroNewlyweds,
  "8 weeks": PHOTOS.banquetTable,
  "1 month": PHOTOS.henna,
  "1 week": PHOTOS.marigoldGarlands,
  "Day of": PHOTOS.diyas,
  After: PHOTOS.diyas,
};

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

interface ArchWindow {
  photo: SitePhoto;
  label: string;
  value: string;
  place: "outer" | "inner" | "center";
}

/** Window heights step up towards the centre, like a palace facade. */
const WINDOW_SIZE: Record<ArchWindow["place"], string> = {
  outer: "hidden h-[min(19svh,11rem)] md:block",
  inner: "h-[min(25svh,14.5rem)]",
  center: "h-[min(33svh,20rem)]",
};

/**
 * Five arched windows, each a different side of Festivo with a real figure from
 * the sample plan. The centre one is the celebration itself.
 */
function Arcade({ windows }: { windows: ArchWindow[] }) {
  return (
    <ul
      aria-label="What a Festivo plan holds"
      className="relative flex items-end justify-center gap-3 px-4 sm:gap-6 lg:gap-8"
    >
      {windows.map((w, index) => (
        <li
          key={w.label}
          data-window={w.place === "center" ? "center" : index < 2 ? "left" : "right"}
          className="grid justify-items-center gap-3"
        >
          <div
            data-window-frame
            className={`relative aspect-[3/4] overflow-hidden rounded-t-full border border-hairline p-1.5 sm:p-2 ${WINDOW_SIZE[w.place]}`}
          >
            <Photo
              src={w.photo.src}
              alt={w.photo.alt}
              sizes={w.place === "center" ? "100vw" : "(min-width: 768px) 16vw, 30vw"}
              preload={w.place === "center"}
              className="size-full rounded-t-full"
            />
          </div>
          <p
            data-window-caption
            className={`grid text-center ${w.place === "outer" ? "hidden md:grid" : ""}`}
          >
            <span className="caps text-muted-foreground">{w.label}</span>
            <span
              className={w.place === "center" ? "font-display text-xl" : "figure text-lg"}
            >
              {w.value}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

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
      {/* 1. Hero: one statement over an arcade of everything Festivo plans --- */}
      <section
        aria-labelledby="hero-title"
        data-hero
        className="relative overflow-hidden"
      >
        <div
          data-hero-pin
          className="relative flex min-h-[calc(100svh-4.5rem)] flex-col justify-between gap-10 pt-10 pb-6 sm:pt-14"
        >
          <div
            data-hero-copy
            className="mx-auto grid w-full max-w-[90rem] justify-items-center gap-6 px-4 text-center sm:px-8"
          >
            <SplitHeading
              as="h1"
              id="hero-title"
              reveal="load"
              lines={["Planned to the", "last petal."]}
              label="Planned to the last petal."
              className="text-[clamp(3.1rem,0.9rem+6.4vw,6.6rem)] leading-[0.95] tracking-[-0.035em]"
            />
            <p className="max-w-[46ch] text-[1.0625rem] text-muted-foreground">
              Budget, timeline, vendors and ideas for your wedding, birthday or gathering,
              composed into a single plan.
            </p>
            <Button asChild size="lg">
              <Link href="/plan/new">Start planning</Link>
            </Button>
          </div>
          <Arcade
            windows={[
              {
                photo: PHOTOS.thali,
                label: "Budget",
                value: glimpse.budget,
                place: "outer",
              },
              {
                photo: PHOTOS.diyas,
                label: "Timeline",
                value: `${glimpse.tasks} dated tasks`,
                place: "inner",
              },
              {
                photo: PHOTOS.heroNewlyweds,
                label: `${glimpse.days} days to go`,
                value: glimpse.title,
                place: "center",
              },
              {
                photo: PHOTOS.festivalDrummers,
                label: "Vendors",
                value: `${glimpse.vendors} to book`,
                place: "inner",
              },
              {
                photo: PHOTOS.birthdayCandles,
                label: "Ideas",
                value: `${plan.ideas.length} picked`,
                place: "outer",
              },
            ]}
          />
        </div>
      </section>

      {/* 2. A framed photo opens out to full bleed --------------------------- */}
      <section id="story" aria-labelledby="story-title" className="p-2 sm:p-3">
        <div
          data-expand
          className={`relative isolate flex min-h-[100svh] flex-col justify-start overflow-hidden ${dark}`}
        >
          <Photo
            src={PHOTOS.mandapNight.src}
            alt={PHOTOS.mandapNight.alt}
            sizes="100vw"
            parallax={8}
            className="absolute inset-0"
          />
          <div className="photo-scrim" data-focus="top-left" />
          <div className="on-photo relative z-10 grid max-w-[46rem] gap-6 p-6 pt-12 sm:p-12 lg:p-16">
            <SplitHeading
              id="story-title"
              reveal="scroll"
              lines={["Every detail,", "held in one place"]}
              className="text-headline"
            />
            <p className="max-w-[46ch] leading-relaxed">
              One plan holds the money, the dates, the people you hire and the ideas you
              love. Change one part and the rest keeps up.
            </p>
            <div>
              <Button asChild variant="photo">
                <Link href="/plan/new">Start your plan</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

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
              <FestiMark className="h-12" />
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
            src={PHOTOS.lightsUnderTrees.src}
            alt={PHOTOS.lightsUnderTrees.alt}
            sizes="(min-width: 1024px) 45vw, 100vw"
            parallax={10}
            className="aspect-[4/5] w-full"
          />
        </div>
      </section>

      {/* 4. The timeline, chapter by chapter --------------------------------- */}
      <section id="timeline" aria-labelledby="timeline-title" className="bg-muted">
        <div className="mx-auto w-full max-w-[90rem] px-4 py-20 sm:px-8 lg:py-32">
          <div className="grid items-end gap-6 lg:grid-cols-2">
            <SplitHeading
              id="timeline-title"
              reveal="scroll"
              lines={["Counted back", "from the big day"]}
              className="text-headline"
            />
            <p className="max-w-[46ch] leading-relaxed lg:justify-self-end">
              Every task lands on a real date between today and the celebration, grouped
              by when it matters. Tick them off; download them to your calendar.
            </p>
          </div>

          <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
            <div className="relative hidden lg:block">
              <div className="sticky top-[12vh] aspect-[4/5] overflow-hidden bg-[#292622]">
                {chapters.map((chapter, index) => (
                  <div
                    key={chapter.phase}
                    data-chapter-photo={index}
                    data-active={index === 0}
                    className="absolute inset-0"
                  >
                    <Photo
                      src={CHAPTER_PHOTOS[chapter.phase].src}
                      alt={CHAPTER_PHOTOS[chapter.phase].alt}
                      sizes="40vw"
                      className="absolute inset-0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <ol className="grid">
              {chapters.map((chapter, index) => (
                <li
                  key={chapter.phase}
                  data-chapter={index}
                  className="border-t border-hairline py-10 lg:min-h-[56vh]"
                >
                  <div className="flex items-baseline gap-5">
                    <span className="caps text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-display text-title">{chapter.heading}</h3>
                  </div>
                  <Photo
                    src={CHAPTER_PHOTOS[chapter.phase].src}
                    alt={CHAPTER_PHOTOS[chapter.phase].alt}
                    sizes="100vw"
                    className="mt-6 aspect-[3/2] lg:hidden"
                  />
                  <ul className="mt-6">
                    {chapter.tasks.map((task) => (
                      <li
                        key={task.title}
                        className="flex items-baseline justify-between gap-6 border-t border-hairline py-3.5"
                      >
                        <span className="font-semibold">{task.title}</span>
                        <span className="caps shrink-0 text-muted-foreground">
                          By {task.due}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

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

      {/* 8. Finale ------------------------------------------------------------ */}
      <section
        aria-labelledby="finale-title"
        className={`relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden ${dark}`}
      >
        <Photo
          src={PHOTOS.birthdayCake.src}
          alt={PHOTOS.birthdayCake.alt}
          sizes="100vw"
          parallax={8}
          className="absolute inset-0"
          position="50% 60%"
        />
        <div className="photo-scrim" />
        <PetalFall />
        <div className="on-photo relative z-10 grid justify-items-center gap-8 px-4 py-24 text-center">
          <FestiMark className="h-20" />
          <SplitHeading
            id="finale-title"
            reveal="scroll"
            lines={["Your celebration,", "beautifully planned"]}
            className="text-display"
          />
          <p className="max-w-[44ch] leading-relaxed">
            Six short questions, about a minute, and your plan is ready to edit, share and
            print.
          </p>
          <Button asChild variant="photo" size="lg">
            <Link href="/plan/new">Start planning</Link>
          </Button>
        </div>
      </section>

      <LandingMotion />
    </>
  );
}
