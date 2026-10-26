import { EventIcon } from "@/components/icons/EventIcons";
import { Fieldset } from "@/components/ui/field";
import { EVENT_TYPES } from "@/lib/schemas/common";
import { EVENT_TYPE_COPY } from "@/lib/wizard/labels";
import { withEventType } from "@/lib/wizard/draft";
import type { StepProps } from "./types";

/** Large selectable cards with native radio semantics (arrow keys move between them). */
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
      <div className="grid gap-4 md:grid-cols-3">
        {EVENT_TYPES.map((type) => {
          const copy = EVENT_TYPE_COPY[type];
          return (
            <label
              key={type}
              data-event={type}
              className="choice-card grid cursor-pointer gap-3 rounded-xl border-2 border-border bg-card p-5 has-checked:bg-event has-checked:text-event-foreground has-checked:shadow-sticker"
            >
              <input
                type="radio"
                name="eventType"
                value={type}
                checked={draft.eventType === type}
                onChange={() => update(withEventType(draft, type))}
                className="sr-only"
              />
              <span className="flex items-center justify-between">
                <EventIcon type={type} className="size-12" />
                <span
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-full border-2 border-current"
                >
                  {draft.eventType === type ? (
                    <span className="size-3 rounded-full bg-current" />
                  ) : null}
                </span>
              </span>
              <span className="text-xl font-extrabold">{copy.title}</span>
              <span className="text-base">{copy.description}</span>
            </label>
          );
        })}
      </div>
    </Fieldset>
  );
}
