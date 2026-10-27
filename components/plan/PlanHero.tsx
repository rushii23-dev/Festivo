import type { ReactNode } from "react";
import { Photo } from "@/components/landing/Photo";
import { PHOTOS, type SitePhoto } from "@/components/landing/photos";
import { formatMoney } from "@/lib/budget/format";
import { EVENT_TYPE_LABELS, type EventType } from "@/lib/schemas/common";
import type { Plan } from "@/lib/schemas/plan";
import { countdown, formatLongDate, parseIsoDate } from "@/lib/timeline/dates";
import { VIBE_LABELS } from "@/lib/wizard/labels";

/** Each kind of celebration opens on its own photograph. */
const HERO_PHOTOS: Record<EventType, SitePhoto> = {
  wedding: PHOTOS.ballroomMandap,
  birthday: PHOTOS.birthdayCandles,
  community: PHOTOS.festivalDrummers,
};

const shortDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** The countdown on a parchment card, like a place card on the table. */
function CountdownCard({ plan, today }: { plan: Plan; today: string }) {
  const when = countdown(plan.date, today);
  const big = when.status === "today" ? "Today" : String(Math.abs(when.days));
  const small =
    when.status === "today"
      ? "is the day"
      : when.status === "past"
        ? Math.abs(when.days) === 1
          ? "day ago"
          : "days ago"
        : when.days === 1
          ? "day to go"
          : "days to go";

  return (
    <div className="w-full max-w-xs border border-[#2c2a27]/20 bg-[#d8cbb8] p-5 text-[#2c2a27] sm:w-72">
      <div className="flex items-center justify-between border-b border-[#2c2a27]/25 pb-3">
        <p className="caps">Countdown</p>
        <p className="caps">{plan.location}</p>
      </div>
      <p className="mt-4 flex items-baseline gap-3">
        <span className="figure text-7xl leading-[0.8] font-light">{big}</span>
        <span className="caps">{small}</span>
      </p>
      <p className="caps mt-4 border-t border-[#2c2a27]/25 pt-3">
        {shortDate.format(parseIsoDate(plan.date))}
        {plan.dateFlexible ? " (flexible)" : ""}
      </p>
    </div>
  );
}

/**
 * The plan's opening spread: the event's photograph, the title in whisper-weight
 * capitals, the essentials as small capitals, and the countdown card.
 */
export function PlanHero({
  plan,
  today,
  actions,
}: {
  plan: Plan;
  today: string;
  actions: ReactNode;
}) {
  const photo = HERO_PHOTOS[plan.eventType];
  return (
    <section
      aria-labelledby="plan-title"
      className="relative isolate overflow-hidden bg-[#292622] text-[#e2d6c3] print:bg-transparent print:text-foreground"
    >
      <Photo
        src={photo.src}
        alt={photo.alt}
        sizes="100vw"
        preload
        className="absolute inset-0 print:hidden"
      />
      <div className="photo-scrim print:hidden" data-focus="bottom-left" />
      <div className="relative mx-auto grid min-h-[30rem] w-full max-w-[90rem] content-end gap-10 px-4 pt-20 pb-10 sm:px-8 md:min-h-[34rem] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="on-photo grid min-w-0 gap-6">
          <p className="caps">
            {EVENT_TYPE_LABELS[plan.eventType]} in {plan.location}
          </p>
          <h1 id="plan-title" className="font-display text-display break-words">
            {plan.title}
          </h1>
          <ul className="flex flex-wrap gap-y-2 divide-x divide-[#e2d6c3]/35">
            <li className="caps pr-4">{formatLongDate(plan.date)}</li>
            <li className="caps px-4">{plan.guestCount} guests</li>
            <li className="caps px-4">{formatMoney(plan.totalBudget, plan.currency)}</li>
            {plan.vibes.length > 0 ? (
              <li className="caps pl-4">
                <span className="sr-only">Style: </span>
                {plan.vibes.map((vibe) => VIBE_LABELS[vibe]).join(", ")}
              </li>
            ) : null}
          </ul>
          <div className="flex flex-wrap items-center gap-4 pt-2 print:hidden">
            {actions}
          </div>
        </div>
        <CountdownCard plan={plan} today={today} />
      </div>
    </section>
  );
}
