import type { Chapter } from "@/lib/landing/showcase";
import type { TimelinePhase } from "@/lib/schemas/plan";
import { Photo } from "./Photo";
import { PHOTOS, type SitePhoto } from "./photos";
import { SplitHeading } from "./SplitHeading";

const CHAPTER_PHOTOS: Record<TimelinePhase, SitePhoto> = {
  "12+ weeks": PHOTOS.heroNewlyweds,
  "8 weeks": PHOTOS.banquetTable,
  "1 month": PHOTOS.henna,
  "1 week": PHOTOS.marigoldGarlands,
  "Day of": PHOTOS.diyas,
  After: PHOTOS.diyas,
};

/**
 * Landing section 4: the sample plan's timeline in chapters. On wide screens a
 * sticky photograph beside the list cross-fades as each chapter scrolls past
 * (LandingMotion drives `data-chapter`); on phones each chapter has its own photo.
 */
export function TimelineSection({ chapters }: { chapters: Chapter[] }) {
  return (
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
            Every task lands on a real date between today and the celebration, grouped by
            when it matters. Tick them off; download them to your calendar.
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
  );
}
