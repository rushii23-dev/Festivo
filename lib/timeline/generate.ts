/**
 * Timeline generation and validation. Dates are computed in code, never trusted
 * from the AI: every task before the event lands on or after today and before
 * the event day; follow-ups land after it.
 */
import { taskTemplatesFor, type PlanKind } from "@/lib/events/kind";
import {
  TIMELINE_PHASES,
  type TimelinePhase,
  type TimelineTask,
} from "@/lib/schemas/plan";
import { addDays, diffDays, maxIso, minIso } from "./dates";
import type { TaskTemplate } from "./templates";

/** Maps a lead time (days before the event; negative = after) to its phase. */
export function phaseForDaysBefore(daysBefore: number): TimelinePhase {
  if (daysBefore < 0) return "After";
  if (daysBefore === 0) return "Day of";
  if (daysBefore <= 7) return "1 week";
  if (daysBefore <= 30) return "1 month";
  if (daysBefore <= 83) return "8 weeks";
  return "12+ weeks";
}

export interface TimelineResult {
  tasks: TimelineTask[];
  /** Tasks whose ideal date had already passed and were rescheduled from today. */
  catchUpCount: number;
  /** Days between today and the event. */
  daysUntilEvent: number;
}

/**
 * Builds the timeline for an event. When the event is close, tasks whose ideal
 * date has passed are spread across the first third of the time left, in their
 * original order, so the most urgent come first.
 *
 * @throws RangeError when the event date is before today.
 */
export function generateTimeline(
  kind: PlanKind,
  eventDate: string,
  today: string,
  templates: readonly TaskTemplate[] = taskTemplatesFor(kind),
): TimelineResult {
  const window = diffDays(today, eventDate);
  if (window < 0) throw new RangeError("The event date is in the past.");

  const ordered = [...templates].sort((a, b) => b.daysBefore - a.daysBefore);
  const overdue = ordered.filter((t) => t.daysBefore > 0 && t.daysBefore > window);
  const catchUpSpan = Math.max(0, Math.floor((window - 1) / 3));

  const dueFor = (template: TaskTemplate): string => {
    const index = overdue.indexOf(template);
    if (index === -1) return addDays(eventDate, -template.daysBefore);
    const offset =
      overdue.length > 1 ? Math.round((index * catchUpSpan) / (overdue.length - 1)) : 0;
    return addDays(today, offset);
  };

  const tasks = ordered.map<TimelineTask>((template) => {
    const dueDate = dueFor(template);
    return {
      id: `task-${template.key}`,
      phase: phaseForDaysBefore(diffDays(dueDate, eventDate)),
      title: template.title,
      description: template.description,
      dueDate,
      ...(template.time ? { time: template.time } : {}),
      done: false,
    };
  });

  return {
    tasks: sortTasks(tasks),
    catchUpCount: overdue.length,
    daysUntilEvent: window,
  };
}

/**
 * Repairs a timeline from an untrusted source (the AI, an old saved plan):
 * clamps dates into the valid range, recomputes phases from the dates and
 * makes IDs unique.
 */
export function normalizeTimeline(
  tasks: readonly TimelineTask[],
  eventDate: string,
  today: string,
): TimelineTask[] {
  const dayBefore = addDays(eventDate, -1);
  const seen = new Map<string, number>();

  const fixed = tasks.map((task) => {
    let dueDate: string;
    if (task.phase === "After") {
      dueDate = maxIso(task.dueDate, addDays(eventDate, 1));
    } else if (task.phase === "Day of") {
      dueDate = eventDate;
    } else if (dayBefore < today) {
      // No days left before the event: prep work happens on the day.
      dueDate = eventDate;
    } else {
      dueDate = minIso(maxIso(task.dueDate, today), dayBefore);
    }

    const count = (seen.get(task.id) ?? 0) + 1;
    seen.set(task.id, count);
    const id = count === 1 ? task.id : `${task.id}-${count}`;

    const phase =
      task.phase === "After" ? "After" : phaseForDaysBefore(diffDays(dueDate, eventDate));
    return { ...task, id, dueDate, phase };
  });

  return sortTasks(fixed);
}

/** Sorts by due date, then start time, keeping the input order for ties. */
export function sortTasks(tasks: readonly TimelineTask[]): TimelineTask[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort(
      (a, b) =>
        a.task.dueDate.localeCompare(b.task.dueDate) ||
        (a.task.time ?? "").localeCompare(b.task.time ?? "") ||
        a.index - b.index,
    )
    .map(({ task }) => task);
}

export interface PhaseGroup {
  phase: TimelinePhase;
  tasks: TimelineTask[];
}

/** Groups tasks into phases in chronological phase order, skipping empty phases. */
export function groupByPhase(tasks: readonly TimelineTask[]): PhaseGroup[] {
  return TIMELINE_PHASES.map((phase) => ({
    phase,
    tasks: tasks.filter((task) => task.phase === phase),
  })).filter((group) => group.tasks.length > 0);
}

/** Next unfinished tasks, soonest first. */
export function nextTasks(tasks: readonly TimelineTask[], count = 3): TimelineTask[] {
  return sortTasks(tasks.filter((task) => !task.done)).slice(0, count);
}

/** Day-of tasks in running order, for the run sheet. */
export function runSheet(tasks: readonly TimelineTask[]): TimelineTask[] {
  return sortTasks(tasks.filter((task) => task.phase === "Day of"));
}
