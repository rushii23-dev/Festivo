"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { firstName } from "@/lib/profile/profile";
import { WELCOME_PHOTO } from "./stagePhotos";
import { Stage } from "./Stage";
import { StageHeading } from "./StageHeading";

const HOW_IT_WORKS = [
  {
    title: "Tell us about the day",
    body: "Six short questions: the occasion, the date, the guests, the budget and the feel.",
  },
  {
    title: "We draft your plan",
    body: "A budget split, a timeline, vendors to call and ideas, in under a minute.",
  },
  {
    title: "Make it yours",
    body: "Change anything, tick tasks off, and add the dates to your calendar.",
  },
] as const;

/** A short pause after sign-up that says what happens next. */
export function Welcome({ name, onBegin }: { name: string; onBegin: () => void }) {
  return (
    <Stage
      photo={WELCOME_PHOTO}
      eyebrow="Welcome to Festivo"
      caption="Planned to the last petal."
    >
      <StageHeading
        eyebrow="Your account is ready"
        title={`Lovely to meet you, ${firstName(name)}.`}
        intro="Here is how it works. It takes about three minutes, and your answers save as you go."
      />

      <ol className="stage-rise grid gap-0 [--delay:0.15s]">
        {HOW_IT_WORKS.map((item, index) => (
          <li
            key={item.title}
            className="grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-hairline py-6 last:border-b"
          >
            <span
              aria-hidden="true"
              className="font-display text-[2.4rem] leading-none text-gold"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="grid gap-1.5">
              <span className="font-display text-[1.7rem] leading-tight">
                {item.title}
              </span>
              <span className="text-muted-foreground">{item.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="stage-rise [--delay:0.3s]">
        <Button type="button" size="lg" onClick={onBegin}>
          Begin planning
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </Stage>
  );
}
