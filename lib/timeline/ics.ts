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
  location?: string;
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

export function buildIcs(options: IcsOptions): string {
  const {
    calendarName,
    eventTitle,
    eventDate,
    location,
    tasks,
    now = new Date(),
    includeDone = true,
    uidDomain = "festivo.app",
  } = options;
  const stamp = utcStamp(now);
  const locationLine = location ? [`LOCATION:${escapeIcsText(location)}`] : [];

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Festivo//Event Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    ...vevent([
      `UID:event-${compactDate(eventDate)}@${uidDomain}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compactDate(eventDate)}`,
      `DTEND;VALUE=DATE:${compactDate(addDays(eventDate, 1))}`,
      `SUMMARY:${escapeIcsText(eventTitle)}`,
      ...locationLine,
      "TRANSP:OPAQUE",
    ]),
  ];

  for (const task of tasks) {
    if (!includeDone && task.done) continue;
    const timing = task.time
      ? [
          `DTSTART:${compactDate(task.dueDate)}T${task.time.replace(":", "")}00`,
          "DURATION:PT1H",
        ]
      : [
          `DTSTART;VALUE=DATE:${compactDate(task.dueDate)}`,
          `DTEND;VALUE=DATE:${compactDate(addDays(task.dueDate, 1))}`,
        ];
    lines.push(
      ...vevent([
        `UID:${task.id}@${uidDomain}`,
        `DTSTAMP:${stamp}`,
        ...timing,
        `SUMMARY:${escapeIcsText(task.done ? `Done: ${task.title}` : task.title)}`,
        ...(task.description ? [`DESCRIPTION:${escapeIcsText(task.description)}`] : []),
        ...(task.phase === "Day of" ? locationLine : []),
        `CATEGORIES:${escapeIcsText(task.phase)}`,
        "TRANSP:TRANSPARENT",
      ]),
    );
  }

  lines.push("END:VCALENDAR");
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
