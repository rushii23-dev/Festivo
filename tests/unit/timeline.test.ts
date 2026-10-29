import { describe, expect, it } from "vitest";
import { EVENT_TYPES } from "@/lib/schemas/common";
import type { TimelineTask } from "@/lib/schemas/plan";
import {
  addDays,
  countdown,
  diffDays,
  formatLongDate,
  formatShortDate,
  parseIsoDate,
  todayIso,
} from "@/lib/timeline/dates";
import {
  generateTimeline,
  groupByPhase,
  nextTasks,
  normalizeTimeline,
  phaseForDaysBefore,
  runSheet,
  sortTasks,
} from "@/lib/timeline/generate";
import {
  FLEXIBLE_DEFAULT_DAYS,
  eventDateProblem,
  resolveEventDate,
} from "@/lib/timeline/resolveDate";
import { TASK_TEMPLATES } from "@/lib/timeline/templates";

const TODAY = "2026-10-26";

function task(overrides: Partial<TimelineTask>): TimelineTask {
  return {
    id: "t",
    phase: "1 month",
    title: "Task",
    dueDate: TODAY,
    done: false,
    ...overrides,
  };
}

describe("dates", () => {
  it("does calendar math in UTC across month, year and leap boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-10-26", "2027-02-14")).toBe(111);
    expect(diffDays("2027-02-14", "2026-10-26")).toBe(-111);
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseIsoDate("2026-13-01")).toThrow(RangeError);
    expect(() => parseIsoDate("2026-02-30")).toThrow(RangeError);
    expect(() => parseIsoDate("26-10-2026")).toThrow(RangeError);
  });

  it("reads today in a time zone", () => {
    const instant = new Date("2026-10-26T20:00:00Z");
    expect(todayIso(instant)).toBe("2026-10-26");
    expect(todayIso(instant, "Asia/Kolkata")).toBe("2026-10-27");
  });

  it("formats dates with Intl", () => {
    expect(formatLongDate("2027-02-14")).toBe("Sunday, 14 February 2027");
    expect(formatShortDate("2027-02-14")).toBe("14 Feb");
    expect(formatLongDate("2027-02-14", "en-US")).toBe("Sunday, February 14, 2027");
  });

  it("counts down to the event", () => {
    expect(countdown("2026-11-05", TODAY)).toEqual({
      days: 10,
      status: "upcoming",
      label: "10 days to go",
    });
    expect(countdown("2026-10-27", TODAY).label).toBe("1 day to go");
    expect(countdown(TODAY, TODAY)).toEqual({
      days: 0,
      status: "today",
      label: "It's today!",
    });
    expect(countdown("2026-10-25", TODAY)).toEqual({
      days: -1,
      status: "past",
      label: "1 day ago",
    });
    expect(countdown("2026-10-20", TODAY).label).toBe("6 days ago");
  });
});

describe("phaseForDaysBefore", () => {
  it.each([
    [200, "12+ weeks"],
    [84, "12+ weeks"],
    [83, "8 weeks"],
    [31, "8 weeks"],
    [30, "1 month"],
    [8, "1 month"],
    [7, "1 week"],
    [1, "1 week"],
    [0, "Day of"],
    [-1, "After"],
  ] as const)("%i days before is %s", (days, phase) => {
    expect(phaseForDaysBefore(days)).toBe(phase);
  });
});

describe("generateTimeline", () => {
  it.each(EVENT_TYPES)("keeps ideal dates for a %s far in the future", (type) => {
    const event = addDays(TODAY, 365);
    const { tasks, catchUpCount } = generateTimeline({ eventType: type }, event, TODAY);
    expect(catchUpCount).toBe(0);
    expect(tasks).toHaveLength(TASK_TEMPLATES[type].length);
    for (const t of tasks) {
      const template = TASK_TEMPLATES[type].find((tpl) => `task-${tpl.key}` === t.id);
      expect(t.dueDate).toBe(addDays(event, -(template?.daysBefore ?? 0)));
    }
  });

  it.each(EVENT_TYPES)(
    "never schedules %s prep in the past or on/after the day",
    (type) => {
      for (const lead of [0, 1, 3, 10, 13, 30, 60, 200]) {
        const event = addDays(TODAY, lead);
        const { tasks } = generateTimeline({ eventType: type }, event, TODAY);
        for (const t of tasks) {
          expect(t.dueDate >= TODAY).toBe(true);
          if (t.phase === "After") expect(t.dueDate > event).toBe(true);
          else if (t.phase === "Day of") expect(t.dueDate).toBe(event);
          else expect(t.dueDate < event).toBe(true);
        }
      }
    },
  );

  it("compresses overdue tasks for an event less than two weeks away", () => {
    const event = addDays(TODAY, 10);
    const { tasks, catchUpCount, daysUntilEvent } = generateTimeline(
      { eventType: "wedding" },
      event,
      TODAY,
    );
    expect(daysUntilEvent).toBe(10);
    expect(catchUpCount).toBeGreaterThan(5);
    const venue = tasks.find((t) => t.id === "task-venue");
    expect(venue?.dueDate).toBe(TODAY); // most urgent first
    const catchUpEnd = addDays(TODAY, Math.floor((10 - 1) / 3));
    const caughtUp = tasks.filter((t) => t.dueDate <= catchUpEnd && t.phase !== "Day of");
    expect(caughtUp.length).toBeGreaterThanOrEqual(catchUpCount);
  });

  it("puts everything on the day when the event is today", () => {
    const { tasks } = generateTimeline({ eventType: "birthday" }, TODAY, TODAY);
    for (const t of tasks.filter((x) => x.phase !== "After")) {
      expect(t.dueDate).toBe(TODAY);
      expect(t.phase).toBe("Day of");
    }
  });

  it("handles a single overdue task", () => {
    const { tasks, catchUpCount } = generateTimeline(
      { eventType: "birthday" },
      addDays(TODAY, 20),
      TODAY,
      [
        { key: "early", title: "Early", description: "", daysBefore: 60 },
        { key: "late", title: "Late", description: "", daysBefore: 5 },
      ],
    );
    expect(catchUpCount).toBe(1);
    expect(tasks[0]).toMatchObject({ id: "task-early", dueDate: TODAY });
  });

  it("rejects an event in the past", () => {
    expect(() => generateTimeline({ eventType: "wedding" }, "2026-10-01", TODAY)).toThrow(
      RangeError,
    );
  });

  it("keeps day-of start times for the run sheet", () => {
    const { tasks } = generateTimeline(
      { eventType: "wedding" },
      addDays(TODAY, 200),
      TODAY,
    );
    expect(runSheet(tasks).map((t) => t.time)).toEqual(["08:00", "11:00", "19:00"]);
  });
});

describe("normalizeTimeline", () => {
  const event = "2026-12-20";

  it("clamps prep tasks into [today, day before the event]", () => {
    const result = normalizeTimeline(
      [
        task({ id: "past", dueDate: "2026-01-01", phase: "12+ weeks" }),
        task({ id: "late", dueDate: "2027-01-05", phase: "1 week" }),
        task({ id: "fine", dueDate: "2026-11-20", phase: "8 weeks" }),
      ],
      event,
      TODAY,
    );
    const byId = Object.fromEntries(result.map((t) => [t.id, t]));
    expect(byId.past).toMatchObject({ dueDate: TODAY, phase: "8 weeks" });
    expect(byId.late).toMatchObject({ dueDate: "2026-12-19", phase: "1 week" });
    expect(byId.fine).toMatchObject({ dueDate: "2026-11-20", phase: "1 month" });
  });

  it("pins day-of tasks to the event and follow-ups after it", () => {
    const result = normalizeTimeline(
      [
        task({ id: "day", phase: "Day of", dueDate: "2026-11-01" }),
        task({ id: "after", phase: "After", dueDate: "2026-12-01" }),
      ],
      event,
      TODAY,
    );
    expect(result.map((t) => [t.id, t.dueDate])).toEqual([
      ["day", event],
      ["after", "2026-12-21"],
    ]);
  });

  it("moves prep to the day when the event is today", () => {
    const [result] = normalizeTimeline([task({ phase: "1 week" })], TODAY, TODAY);
    expect(result).toMatchObject({ dueDate: TODAY, phase: "Day of" });
  });

  it("makes duplicate IDs unique", () => {
    const result = normalizeTimeline(
      [task({ id: "x" }), task({ id: "x" }), task({ id: "x" })],
      event,
      TODAY,
    );
    expect(result.map((t) => t.id)).toEqual(["x", "x-2", "x-3"]);
  });
});

describe("timeline helpers", () => {
  const tasks = [
    task({ id: "c", dueDate: "2026-12-01", phase: "1 month" }),
    task({ id: "a", dueDate: "2026-11-01", phase: "8 weeks", done: true }),
    task({ id: "b", dueDate: "2026-11-15", phase: "1 month" }),
    task({ id: "d2", dueDate: "2026-12-20", phase: "Day of", time: "18:00" }),
    task({ id: "d1", dueDate: "2026-12-20", phase: "Day of", time: "09:00" }),
  ];

  it("sorts by date then time", () => {
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(["a", "b", "c", "d1", "d2"]);
  });

  it("groups by phase in order, skipping empty phases", () => {
    expect(groupByPhase(tasks).map((g) => [g.phase, g.tasks.length])).toEqual([
      ["8 weeks", 1],
      ["1 month", 2],
      ["Day of", 2],
    ]);
  });

  it("returns the next unfinished tasks", () => {
    expect(nextTasks(tasks).map((t) => t.id)).toEqual(["b", "c", "d1"]);
  });
});

describe("resolveEventDate", () => {
  it("uses fixed dates as-is", () => {
    expect(resolveEventDate({ kind: "fixed", date: "2027-02-14" }, TODAY)).toEqual({
      date: "2027-02-14",
      flexible: false,
    });
  });

  it("plans flexible events about three months out", () => {
    expect(resolveEventDate({ kind: "flexible" }, TODAY)).toEqual({
      date: addDays(TODAY, FLEXIBLE_DEFAULT_DAYS),
      flexible: true,
    });
  });

  it("aims for mid-month, at least 30 days out", () => {
    expect(resolveEventDate({ kind: "flexible", month: "2027-03" }, TODAY).date).toBe(
      "2027-03-15",
    );
    expect(resolveEventDate({ kind: "flexible", month: "2026-11" }, TODAY).date).toBe(
      "2026-11-25",
    );
  });

  it("explains unplannable dates", () => {
    expect(eventDateProblem({ kind: "fixed", date: "2026-10-25" }, TODAY)).toMatch(
      /future/,
    );
    expect(eventDateProblem({ kind: "fixed", date: "2035-01-01" }, TODAY)).toMatch(
      /five years/,
    );
    expect(eventDateProblem({ kind: "fixed", date: TODAY }, TODAY)).toBeNull();
    expect(eventDateProblem({ kind: "flexible", month: "2026-09" }, TODAY)).toMatch(
      /later/,
    );
    expect(eventDateProblem({ kind: "flexible", month: "2034-01" }, TODAY)).toMatch(
      /five years/,
    );
    expect(eventDateProblem({ kind: "flexible", month: "2026-10" }, TODAY)).toBeNull();
    expect(eventDateProblem({ kind: "flexible" }, TODAY)).toBeNull();
  });
});
