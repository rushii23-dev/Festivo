"use client";

import { CalendarPlus, ClipboardCopy, Printer, Share2 } from "lucide-react";
import { useState } from "react";
import { useAnnounce } from "@/components/a11y/LiveRegion";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { planSummaryText } from "@/lib/plan/share";
import type { Plan } from "@/lib/schemas/plan";
import { downloadCalendar } from "./client";

const itemClass =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left font-bold hover:bg-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-event";

/** Print or save as PDF, download the calendar, or copy a plain-text summary. */
export function ShareMenu({ plan, today }: { plan: Plan; today: string }) {
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planSummaryText(plan, today));
      announce("Summary copied. Paste it anywhere to share your plan.");
    } catch {
      announce(
        "Your browser blocked copying. Try Print or save as PDF instead.",
        "assertive",
      );
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="photoOutline">
          <Share2 aria-hidden="true" />
          Export and share
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-2">
        <ul className="grid gap-1">
          <li>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                setOpen(false);
                // Let the popover close before the print dialog snapshots the page.
                requestAnimationFrame(() => window.print());
              }}
            >
              <Printer aria-hidden="true" />
              Print or save as PDF
            </button>
          </li>
          <li>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                const file = downloadCalendar(plan);
                announce(`Calendar downloaded as ${file}.`);
                setOpen(false);
              }}
            >
              <CalendarPlus aria-hidden="true" />
              Download calendar (.ics)
            </button>
          </li>
          <li>
            <button type="button" className={itemClass} onClick={() => void copy()}>
              <ClipboardCopy aria-hidden="true" />
              Copy summary
            </button>
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
