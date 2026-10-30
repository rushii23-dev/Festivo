import { FestivoSeal } from "@/components/brand/FestivoSeal";
import { PetalFall } from "./PetalFall";
import { Photo } from "./Photo";
import { PHOTOS, type SitePhoto } from "./photos";
import { SplitHeading } from "./SplitHeading";
import { ToranButton } from "./ToranButton";

/** The finale's row of palace windows, stepping up to the centre. */
const FINALE_WINDOWS: {
  photo: SitePhoto;
  place: "outer" | "inner" | "center";
  position?: string;
}[] = [
  { photo: PHOTOS.henna, place: "outer", position: "60% 50%" },
  { photo: PHOTOS.diyas, place: "inner" },
  { photo: PHOTOS.heroNewlyweds, place: "center", position: "50% 60%" },
  { photo: PHOTOS.marigoldGarlands, place: "inner" },
  { photo: PHOTOS.birthdayCandles, place: "outer" },
];

const FINALE_SIZES = {
  outer: "hidden w-[13vw] max-w-[11rem] sm:block",
  inner: "w-[26vw] max-w-[14rem] sm:w-[17vw]",
  center: "w-[38vw] max-w-[19rem] sm:w-[23vw]",
};

/** Landing section 8: the invitation to start, above a row of palace windows. */
export function FinaleSection() {
  return (
    <section
      aria-labelledby="finale-title"
      className="finale relative isolate overflow-hidden"
    >
      <PetalFall />
      <div className="relative mx-auto grid w-full max-w-[90rem] justify-items-center px-4 pt-28 text-center sm:px-8 lg:pt-36">
        <FestivoSeal className="h-16 text-gold" />
        <SplitHeading
          id="finale-title"
          reveal="scroll"
          lines={["Your celebration,", "beautifully planned"]}
          className="mt-8 text-display"
        />
        <span aria-hidden="true" className="ornament-center mt-9">
          <span />
        </span>
        <p className="mt-7 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
          Six short questions, about a minute, and your plan is ready to edit, share and
          print.
        </p>
        <div className="mt-10">
          <ToranButton href="/plan/new">Start planning</ToranButton>
        </div>

        {/* Five windows stepping up to the centre, standing on a gold ledge */}
        <ul
          aria-hidden="true"
          className="mt-20 flex w-full items-end justify-center gap-3 border-b border-gold/60 sm:gap-5 lg:mt-28 lg:gap-8"
        >
          {FINALE_WINDOWS.map((w) => (
            <li key={w.photo.alt} data-reveal className={FINALE_SIZES[w.place]}>
              <div className="rounded-t-full border border-gold/50 p-1.5 sm:p-2">
                <Photo
                  src={w.photo.src}
                  alt=""
                  sizes="(min-width: 1024px) 20vw, 30vw"
                  parallax={6}
                  position={w.position}
                  className="aspect-[3/4] w-full rounded-t-full"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
