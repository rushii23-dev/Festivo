import type { ReactNode } from "react";
import { Photo } from "@/components/landing/Photo";
import type { SitePhoto } from "@/components/landing/photos";

interface StageProps {
  photo: SitePhoto;
  /** Small capitals over the photograph, e.g. "02 · The basics". */
  eyebrow: string;
  /** One quiet line in the display italic over the photograph. */
  caption: string;
  children: ReactNode;
}

/**
 * The onboarding layout: a photograph fills one half and a single question
 * sits on the other, with plenty of parchment around it. On phones the photo
 * becomes a short band above the question. The photo is decorative; the
 * caption repeats what the heading beside it already says.
 */
export function Stage({ photo, eyebrow, caption, children }: StageProps) {
  return (
    <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div
        aria-hidden="true"
        className="relative h-52 overflow-hidden bg-[#292622] sm:h-72 lg:sticky lg:top-0 lg:h-svh"
      >
        {/* Keyed by image so each new photo fades in over the dark ground. */}
        <Photo
          key={photo.src.src}
          src={photo.src}
          alt=""
          sizes="(min-width: 1024px) 45vw, 100vw"
          preload
          className="stage-photo absolute inset-0"
        />
        <div className="photo-scrim" data-focus="corner" />
        <div
          key={caption}
          className="stage-caption on-photo absolute inset-x-0 bottom-0 grid gap-3 p-6 text-[#e2d6c3] sm:p-10 lg:p-14 lg:pb-32"
        >
          <p className="caps text-[#e8c48f]">{eyebrow}</p>
          <p className="max-w-[22ch] font-display text-[1.6rem] leading-tight italic sm:text-[2.1rem]">
            {caption}
          </p>
        </div>
      </div>

      <div className="@container px-5 py-12 sm:px-12 sm:py-16 lg:px-[clamp(3rem,6vw,7rem)] lg:py-[clamp(4rem,9vh,7rem)]">
        <div className="mx-auto grid w-full max-w-[40rem] content-start gap-10">
          {children}
        </div>
      </div>
    </div>
  );
}
