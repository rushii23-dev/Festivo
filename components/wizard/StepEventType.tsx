import { Fieldset } from "@/components/ui/field";
import { OCCASION_GROUP_COPY, occasionsIn } from "@/lib/events/occasions";
import { OCCASION_GROUPS } from "@/lib/schemas/common";
import { withGroup, withOccasion } from "@/lib/wizard/draft";
import type { StepProps } from "./types";

/** A filled ring for the chosen option, so selection never relies on colour alone. */
function Marker({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current"
    >
      {checked ? <span data-fill className="size-2.5 rounded-full bg-current" /> : null}
    </span>
  );
}

const cardClass =
  "group grid min-w-0 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border border-hairline bg-card outline-1 outline-offset-[3px] outline-transparent outline-solid motion-ok:transition-[border-color,outline-color] motion-ok:duration-300 hover:border-foreground has-checked:border-foreground has-checked:outline-foreground";

/**
 * Two native radio groups: first the kind of event, then the occasion inside
 * it (arrow keys move within each group). The occasions appear once a group
 * is chosen, so the page never shows forty options at once.
 */
export function StepEventType({ draft, errors, update }: StepProps) {
  const occasions = draft.group ? occasionsIn(draft.group) : [];
  return (
    <div className="grid gap-12">
      <Fieldset
        id="occasion-group"
        name="group"
        legend="Kind of event"
        required
        error={errors.group}
      >
        <div className="grid gap-4 @lg:grid-cols-2">
          {OCCASION_GROUPS.map((group) => {
            const copy = OCCASION_GROUP_COPY[group];
            const checked = draft.group === group;
            return (
              <label key={group} data-choice-card className={`${cardClass} p-5 sm:p-6`}>
                <input
                  type="radio"
                  name="group"
                  value={group}
                  checked={checked}
                  onChange={() => update(withGroup(draft, group))}
                  className="sr-only"
                />
                <span className="grid gap-2">
                  <span className="font-display text-[1.75rem] leading-none sm:text-[2rem]">
                    {copy.title}
                  </span>
                  <span className="text-[0.9375rem] text-muted-foreground">
                    {copy.description}
                  </span>
                </span>
                <Marker checked={checked} />
              </label>
            );
          })}
        </div>
      </Fieldset>

      {draft.group ? (
        <Fieldset
          key={draft.group}
          id="occasion"
          name="occasion"
          legend={`Which ${OCCASION_GROUP_COPY[draft.group].title.toLowerCase()} occasion?`}
          required
          error={errors.occasion}
          className="stage-rise"
        >
          <div className="grid gap-3 @lg:grid-cols-2">
            {occasions.map((occasion) => {
              const checked = draft.occasion === occasion.id;
              return (
                <label
                  key={occasion.id}
                  data-choice-card
                  className={`${cardClass} px-5 py-4`}
                >
                  <input
                    type="radio"
                    name="occasion"
                    value={occasion.id}
                    checked={checked}
                    onChange={() => update(withOccasion(draft, occasion.id))}
                    className="sr-only"
                  />
                  <span className="grid gap-1">
                    <span className="font-display text-[1.45rem] leading-tight">
                      {occasion.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {occasion.description}
                    </span>
                  </span>
                  <Marker checked={checked} />
                </label>
              );
            })}
          </div>
        </Fieldset>
      ) : null}
    </div>
  );
}
