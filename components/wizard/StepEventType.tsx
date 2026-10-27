import { Photo } from "@/components/landing/Photo";
import { PHOTOS, type SitePhoto } from "@/components/landing/photos";
import { Fieldset } from "@/components/ui/field";
import { EVENT_TYPES, type EventType } from "@/lib/schemas/common";
import { EVENT_TYPE_COPY } from "@/lib/wizard/labels";
import { withEventType } from "@/lib/wizard/draft";
import type { StepProps } from "./types";

const CARD_PHOTOS: Record<EventType, SitePhoto> = {
  wedding: PHOTOS.heroNewlyweds,
  birthday: PHOTOS.birthdayCandles,
  community: PHOTOS.festivalDrummers,
};

/**
 * Photo cards with native radio semantics (arrow keys move between them).
 * The chosen card gains a printed double frame and a filled marker, not just a colour.
 */
export function StepEventType({ draft, errors, update }: StepProps) {
  return (
    <Fieldset
      id="event-type"
      name="eventType"
      legend="Event type"
      legendHidden
      required
      error={errors.eventType}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {EVENT_TYPES.map((type) => {
          const copy = EVENT_TYPE_COPY[type];
          const photo = CARD_PHOTOS[type];
          return (
            <label
              key={type}
              className="choice-card group grid min-w-0 cursor-pointer grid-cols-1 content-start border border-hairline bg-card outline-1 outline-offset-[3px] outline-transparent outline-solid hover:border-foreground has-checked:border-foreground has-checked:outline-foreground"
            >
              <input
                type="radio"
                name="eventType"
                value={type}
                checked={draft.eventType === type}
                onChange={() => update(withEventType(draft, type))}
                className="sr-only"
              />
              <Photo
                src={photo.src}
                alt=""
                sizes="(min-width: 768px) 22vw, 100vw"
                className="aspect-[4/3]"
              />
              <span className="grid gap-3 p-5">
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 font-display text-[2rem] leading-none">
                    {copy.title}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current"
                  >
                    {draft.eventType === type ? (
                      <span className="size-2.5 rounded-full bg-current" />
                    ) : null}
                  </span>
                </span>
                <span className="text-[0.9375rem] text-muted-foreground">
                  {copy.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </Fieldset>
  );
}
