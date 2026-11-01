/**
 * iCalendar (RFC 5545) export for the timeline. Tasks become all-day events,
 * or floating-time events when they have a start time (floating = the
 * attendee's local time, which is right for "ceremony at 11:00").
 */
import type { TimelineTask } from "@/lib/schemas/plan";
import { addDays } from "./dates";

export interface IcsOptions {
  calendarName: string;
  eventTitle: string;
  eventDate: string;
  location?: string | undefined;
  tasks: readonly TimelineTask[];
  /** Used for DTSTAMP; injectable for tests. */
  now?: Date;
  /** Include tasks already marked done (default true). */
  includeDone?: boolean;
  /** Domain part of each UID, keeps UIDs globally unique. */
  uidDomain?: string;
}

const CRLF = "\r\n";

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Folds a content line at 75 octets (UTF-8), continuing with CRLF + space.
 * Splits on code points so multi-byte characters are never cut in half.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

const compactDate = (iso: string) => iso.replace(/-/g, "");

function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function vevent(lines: string[]): string[] {
  return ["BEGIN:VEVENT", ...lines, "END:VEVENT"];
}

const CALENDAR_HEADER = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//Festivo//Event Planner//EN",
  "CALSCALE:GREGORIAN",
  "METHOD:PUBLISH",
];

/** What every event in one file shares. */
interface EventContext {
  stamp: string;
  uidDomain: string;
  /** The LOCATION line, or nothing when the plan has no place. */
  locationLine: string[];
}

/** An all-day event on `date`. */
function allDay(date: string): string[] {
  return [
    `DTSTART;VALUE=DATE:${compactDate(date)}`,
    `DTEND;VALUE=DATE:${compactDate(addDays(date, 1))}`,
  ];
}

/** The celebration itself: an all-day, busy event. */
function mainEvent(title: string, date: string, context: EventContext): string[] {
  return vevent([
    `UID:event-${compactDate(date)}@${context.uidDomain}`,
    `DTSTAMP:${context.stamp}`,
    ...allDay(date),
    `SUMMARY:${escapeIcsText(title)}`,
    ...context.locationLine,
    "TRANSP:OPAQUE",
  ]);
}

/** A task: all-day, or a one-hour slot at its start time. Day-of tasks get the place. */
function taskEvent(task: TimelineTask, context: EventContext): string[] {
  const timing = task.time
    ? [
        `DTSTART:${compactDate(task.dueDate)}T${task.time.replace(":", "")}00`,
        "DURATION:PT1H",
      ]
    : allDay(task.dueDate);
  return vevent([
    `UID:${task.id}@${context.uidDomain}`,
    `DTSTAMP:${context.stamp}`,
    ...timing,
    `SUMMARY:${escapeIcsText(task.done ? `Done: ${task.title}` : task.title)}`,
    ...(task.description ? [`DESCRIPTION:${escapeIcsText(task.description)}`] : []),
    ...(task.phase === "Day of" ? context.locationLine : []),
    `CATEGORIES:${escapeIcsText(task.phase)}`,
    "TRANSP:TRANSPARENT",
  ]);
}

export function buildIcs({
  calendarName,
  eventTitle,
  eventDate,
  location,
  tasks,
  now = new Date(),
  includeDone = true,
  uidDomain = "festivo.app",
}: IcsOptions): string {
  const context: EventContext = {
    stamp: utcStamp(now),
    uidDomain,
    locationLine: location ? [`LOCATION:${escapeIcsText(location)}`] : [],
  };
  const lines = [
    ...CALENDAR_HEADER,
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    ...mainEvent(eventTitle, eventDate, context),
    ...tasks
      .filter((task) => includeDone || !task.done)
      .flatMap((task) => taskEvent(task, context)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** A safe file name for the download, e.g. "priya-and-arjun-wedding.ics". */
export function icsFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "festivo-plan"}.ics`;
}
