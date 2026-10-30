/**
 * Browser-only: the timeline as a downloaded .ics file. Kept apart from client.ts
 * so the calendar builder loads only with the screens that offer the download.
 */
import type { Plan } from "@/lib/schemas/plan";
import { buildIcs, icsFileName } from "@/lib/timeline/ics";

/** Saves the timeline as an .ics file through a temporary object URL. */
export function downloadCalendar(plan: Plan): string {
  const ics = buildIcs({
    calendarName: plan.title,
    eventTitle: plan.title,
    eventDate: plan.date,
    location: plan.location,
    tasks: plan.timeline,
  });
  const url = URL.createObjectURL(
    new Blob([ics], { type: "text/calendar;charset=utf-8" }),
  );
  const fileName = icsFileName(plan.title);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
