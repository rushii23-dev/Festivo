import { describe, expect, it } from "vitest";
import type { TimelineTask } from "@/lib/schemas/plan";
import { buildIcs, escapeIcsText, foldLine, icsFileName } from "@/lib/timeline/ics";

const now = new Date("2026-10-26T09:30:15.123Z");
const tasks: TimelineTask[] = [
  {
    id: "task-venue",
    phase: "12+ weeks",
    title: "Book the venue",
    dueDate: "2026-11-01",
    done: false,
    description: "Visit three venues, compare quotes; confirm dates.",
  },
  {
    id: "task-thanks",
    phase: "After",
    title: "Send thanks",
    dueDate: "2027-02-21",
    done: true,
  },
  {
    id: "task-ceremony",
    phase: "Day of",
    title: "Ceremony",
    dueDate: "2027-02-14",
    time: "11:00",
    done: false,
  },
];

function build(extra: Partial<Parameters<typeof buildIcs>[0]> = {}) {
  return buildIcs({
    calendarName: "Priya & Arjun",
    eventTitle: "Priya & Arjun's wedding",
    eventDate: "2027-02-14",
    location: "Jaipur, Rajasthan",
    tasks,
    now,
    ...extra,
  });
}

describe("buildIcs", () => {
  const ics = build();
  const lines = ics.split("\r\n");

  it("is a CRLF-delimited VCALENDAR", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("PRODID:-//Festivo//Event Planner//EN");
  });

  it("adds the event itself as an all-day entry", () => {
    expect(ics).toContain("UID:event-20270214@festivo.app");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270214\r\nDTEND;VALUE=DATE:20270215");
    expect(ics).toContain("SUMMARY:Priya & Arjun's wedding");
    expect(ics).toContain("LOCATION:Jaipur\\, Rajasthan");
  });

  it("writes one VEVENT per task with a UTC DTSTAMP", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics.match(/DTSTAMP:20261026T093015Z/g)).toHaveLength(4);
    expect(ics).toContain("UID:task-venue@festivo.app");
  });

  it("escapes commas and semicolons in text", () => {
    expect(ics).toContain(
      "DESCRIPTION:Visit three venues\\, compare quotes\\; confirm dates.",
    );
  });

  it("uses floating local time for timed day-of tasks", () => {
    expect(ics).toContain("DTSTART:20270214T110000\r\nDURATION:PT1H");
  });

  it("marks done tasks and can leave them out", () => {
    expect(ics).toContain("SUMMARY:Done: Send thanks");
    const open = build({ includeDone: false });
    expect(open).not.toContain("Send thanks");
    expect(open.match(/BEGIN:VEVENT/g)).toHaveLength(3);
  });

  it("omits LOCATION when none is given", () => {
    expect(build({ location: undefined })).not.toContain("LOCATION:");
  });

  it("keeps every line within 75 octets", () => {
    const long = build({ eventTitle: "शादी ".repeat(40) });
    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe("ics helpers", () => {
  it("escapes backslashes and newlines", () => {
    expect(escapeIcsText("a\\b\nc\r\nd")).toBe("a\\\\b\\nc\\nd");
  });

  it("folds long lines with a leading space and leaves short ones", () => {
    expect(foldLine("short")).toBe("short");
    const folded = foldLine("X".repeat(160));
    const parts = folded.split("\r\n");
    expect(parts[0]).toHaveLength(75);
    expect(parts[1]?.startsWith(" ")).toBe(true);
    expect(parts.map((p) => p.replace(/^ /, "")).join("")).toBe("X".repeat(160));
  });

  it("makes safe file names", () => {
    expect(icsFileName("Priya & Arjun's Wedding!")).toBe("priya-arjun-s-wedding.ics");
    expect(icsFileName("Café Señor")).toBe("cafe-senor.ics");
    expect(icsFileName("!!!")).toBe("festivo-plan.ics");
  });
});
